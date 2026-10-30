"""Local Qwen2.5-VL 3B Vision AI integration service via Ollama.

Provides structured forensic visual consistency analysis comparing customer evidence images
against pre-computed trusted merchant product reference observations using local qwen2.5vl:3b-q4_K_M model.
"""
import base64
import io
import json
import logging
import time
from typing import Any, Dict, List, Optional
import httpx
from PIL import Image

from app.core.config import settings
from app.schemas.visual_analysis import (
    VisualAnalysisResult,
    ImageQualityAnalysis,
    ProductConsistencyAnalysis,
    VisibleConditionAnalysis,
    EvidenceCaptureAssessment,
    ProductIdentityAnalysis,
)
from app.schemas.product_reference_analysis import (
    ProductReferenceAnalysisResult,
    ReferenceImageVisualMetadata,
)

logger = logging.getLogger(__name__)

QWEN_VISION_SYSTEM_INSTRUCTION = """You are an expert Forensic Visual Consistency Engine for a refund evidence verification platform.
Your duty is to perform objective, structured, forensic visual inspection of customer-submitted evidence images compared against merchant baseline specifications and product visual profiles.

STRICT CONSTRAINTS:
1. Return ONLY a valid JSON object. No explanation, no markdown text outside the JSON.
2. DO NOT make refund approval or rejection decisions. The merchant remains the final authority.
3. DO NOT accuse the customer of fraud, scam, or fake claims. State objective physical and visual facts.
4. Epistemic Uncertainty: Differentiate between:
   - 'observed': Clearly visible in the image.
   - 'not_observed': The area is visible but feature/damage is absent.
   - 'not_visible': Out of frame, obscured, hidden, or occluded.
   - 'unclear': In frame but lighting, glare, low resolution, or angle makes it ambiguous.
   'not_visible' MUST NOT be assumed to mean 'undamaged' or 'not present'.

CAPTURE METHOD INSPECTION (VERY IMPORTANT):
Determine if the evidence image is:
- 'PHYSICAL_PHOTO' / 'DIRECT_PHYSICAL_APPEARANCE': Direct physical object photo with ambient lighting and natural depth.
- 'SCREEN_PHOTO' / 'SCREEN_DISPLAY_APPEARANCE': Photo taken of a laptop, phone, monitor, or tablet display. Look for: screen bezel/frame, screen reflection, moiré patterns, display pixels, UI borders, desktop taskbar, browser chrome, cursor, monitor edges.
- 'SCREENSHOT_APPEARANCE': Crisp pixel-flat electronic screenshot.
- 'COMPOSITE_IMAGE': Digitally edited or composited image.
- 'UNCLEAR': Capture method cannot be determined.

FORENSIC COMPARISON & CLAIM CONSISTENCY:
- Compare customer image against the canonical Product Visual Profile.
- If customer claim is 'Wrong product received' and image shows a different physical product, note the product mismatch factually. DO NOT call it fraud; the customer may genuinely have received the wrong item.
- Check for visible damage, packaging, product brand/model markings, color, shape, and image quality.
- State whether the image provides sufficient evidence to verify the customer's stated claim or if targeted additional evidence is needed.
"""


def optimize_image_for_inference(image_bytes: bytes, max_dim: int = 1024, quality: int = 85) -> bytes:
    """Downscale and compress image in-memory for low VRAM usage during local vision inference.

    Original evidence files on disk remain untouched.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Resize if dimensions exceed max_dim
        width, height = img.size
        if width > max_dim or height > max_dim:
            if width > height:
                new_w = max_dim
                new_h = int(height * (max_dim / width))
            else:
                new_h = max_dim
                new_w = int(width * (max_dim / height))
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        output = io.BytesIO()
        img.save(output, format="JPEG", quality=quality)
        return output.getvalue()
    except Exception as exc:
        logger.warning("Image optimization failed, sending raw bytes: %s", exc)
        return image_bytes


class QwenVisionService:
    """Encapsulated local visual analysis service using Qwen2.5-VL 3B via Ollama."""

    def __init__(
        self,
        ollama_url: Optional[str] = None,
        model_name: Optional[str] = None,
        prompt_version: str = "v3.0-qwen-local",
    ) -> None:
        self.ollama_url = ollama_url or getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")
        self.model_name = model_name or "qwen2.5vl:3b-q4_K_M"
        self.prompt_version = prompt_version

    def log_startup_diagnostics(self) -> None:
        """Log startup diagnostics for local vision model."""
        logger.info(
            "QWEN VISION DIAGNOSTICS: OLLAMA_URL=%s | MODEL=%s | PROMPT_VERSION=%s",
            self.ollama_url,
            self.model_name,
            self.prompt_version,
        )

    def warmup_model(self) -> bool:
        """Warm up local Qwen2.5-VL model with a tiny 1x1 test image to preload weights into VRAM."""
        try:
            start_t = time.time()
            tiny_b64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
            payload = {
                "model": self.model_name,
                "messages": [
                    {
                        "role": "user",
                        "content": 'Respond with JSON: {"status": "ok"}',
                        "images": [tiny_b64],
                    }
                ],
                "format": "json",
                "stream": False,
                "options": {
                    "temperature": 0.1,
                },
            }
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(f"{self.ollama_url}/api/chat", json=payload)
                if resp.status_code == 200:
                    dur = time.time() - start_t
                    logger.info("Qwen2.5-VL 3B warmed up successfully in %.2fs", dur)
                    return True
        except Exception as exc:
            logger.warning("Qwen2.5-VL 3B warm-up check failed: %s", exc)
        return False

    def analyze_reference_image(
        self,
        image_bytes: bytes,
        angle: str,
        product_info: Dict[str, Any],
    ) -> ProductReferenceAnalysisResult:
        """Perform individual Qwen visual analysis on ONE merchant reference image.

        Processes references one-at-a-time to prevent VRAM overflow.
        """
        opt_bytes = optimize_image_for_inference(image_bytes, max_dim=1024)
        img_b64 = base64.b64encode(opt_bytes).decode("utf-8")

        prompt = (
            f"You are a forensic product visual evidence analyzer.\n"
            f"Extract detailed visual metadata from this SINGLE merchant product reference photo.\n\n"
            f"--- MERCHANDISE SPECIFICATIONS ---\n"
            f"Product Name: {product_info.get('name', 'Unknown')}\n"
            f"SKU: {product_info.get('sku', 'Unknown')}\n"
            f"Category: {product_info.get('category', 'Unknown')}\n"
            f"Description: {product_info.get('description', 'None')}\n"
            f"Reference Angle: {angle.upper()}\n\n"
            f"--- INSTRUCTIONS ---\n"
            f"Extract objective visual metadata. DO NOT invent details not visible.\n"
            f"Return strictly a JSON object with this EXACT structure:\n"
            f"{{\n"
            f'  "angle": "{angle.upper()}",\n'
            f'  "summary": "Factual visual synthesis of this reference image",\n'
            f'  "confidence": 0.95,\n'
            f'  "metadata": {{\n'
            f'    "product_category": "{product_info.get("category", "General")}",\n'
            f'    "brand": "{product_info.get("name", "").split()[0] if product_info.get("name") else "Unspecified"}",\n'
            f'    "model": "{product_info.get("sku", "Unspecified")}",\n'
            f'    "visible_product_identity": "concise description of visible item",\n'
            f'    "shape": "geometric silhouette and shape details",\n'
            f'    "dimensions_proportions": "estimated visual proportions or unclear",\n'
            f'    "color": "primary and secondary colors visible",\n'
            f'    "material": "visible materials (plastic, metal, etc.) or unclear",\n'
            f'    "texture_finish": "matte, glossy, brushed, etc. or unclear",\n'
            f'    "distinctive_features": ["feature 1", "feature 2"],\n'
            f'    "buttons_ports_components": ["component 1", "component 2"],\n'
            f'    "logos_markings": ["logo or marking 1"],\n'
            f'    "visible_text": ["printed label text 1"],\n'
            f'    "packaging_characteristics": "packaging details if visible or null",\n'
            f'    "physical_condition": "NEW",\n'
            f'    "orientation_angle": "{angle.upper()}",\n'
            f'    "important_landmarks": ["landmark 1", "landmark 2"],\n'
            f'    "image_quality": "GOOD",\n'
            f'    "occlusions": ["occluded detail if any"],\n'
            f'    "uncertainties": ["detail not inferable from this single angle"]\n'
            f"  }}\n"
            f"}}\n\n"
            f"Produce VALID JSON ONLY."
        )

        payload = {
            "model": self.model_name,
            "messages": [
                {
                    "role": "user",
                    "content": prompt,
                    "images": [img_b64],
                }
            ],
            "format": "json",
            "stream": False,
            "keep_alive": "5m",
            "options": {
                "temperature": 0.1,
                "num_ctx": 4096,
            },
        }

    def _post_ollama_chat(
        self,
        payload: Dict[str, Any],
        timeout: float = 120.0,
        context_name: str = "qwen",
    ) -> Dict[str, Any]:
        """Send HTTP POST to Ollama /api/chat with complete diagnostic logging.

        Strictly handles non-streaming (stream=False) and streaming (stream=True) responses.
        """
        is_stream = bool(payload.get("stream", False))
        start_t = time.time()

        with httpx.Client(timeout=timeout) as client:
            if not is_stream:
                resp = client.post(f"{self.ollama_url}/api/chat", json=payload)
                dur_ms = int((time.time() - start_t) * 1000)

                ctype = resp.headers.get("content-type", "unknown")
                clen = resp.headers.get("content-length", "unknown")
                raw_text = resp.text
                body_len = len(raw_text)
                preview = raw_text[:250].replace("\n", " ") if raw_text else "<EMPTY>"

                if resp.status_code != 200:
                    logger.error(
                        "QWEN_HTTP_ERROR: context=%s, status=%d, dur_ms=%d, body=%s",
                        context_name, resp.status_code, dur_ms, preview
                    )
                    raise RuntimeError(f"Ollama API returned HTTP status {resp.status_code}: {preview}")

                try:
                    res_json = resp.json()
                except Exception as parse_err:
                    logger.error(
                        "QWEN_JSON_PARSE_ERROR: context=%s, status=%d, body_len=%d, preview=%s, err=%s",
                        context_name, resp.status_code, body_len, preview, parse_err
                    )
                    raise RuntimeError(f"Failed to parse Ollama JSON response: {parse_err}") from parse_err

                raw_keys = list(res_json.keys()) if isinstance(res_json, dict) else []
                msg = res_json.get("message") if isinstance(res_json, dict) and isinstance(res_json.get("message"), dict) else {}
                msg_keys = list(msg.keys())
                msg_role = msg.get("role", "unknown")
                content = (msg.get("content") or "").strip()
                done = bool(res_json.get("done", False))
                done_reason = res_json.get("done_reason", "unknown")
                content_len = len(content)

                model_res = res_json.get("model", "")
                total_duration = res_json.get("total_duration")
                load_duration = res_json.get("load_duration")
                prompt_eval_duration = res_json.get("prompt_eval_duration")
                eval_duration = res_json.get("eval_duration")
                eval_count = res_json.get("eval_count")
                prompt_eval_count = res_json.get("prompt_eval_count")

                logger.info(
                    "QWEN_DIAGNOSTICS: context=%s, status=%d, model=%s, done=%s, done_reason=%s, "
                    "role=%s, content_len=%d, ctype=%s, clen=%s, stream=false, body_len=%d, preview=%s, "
                    "res_keys=%s, msg_keys=%s, total_dur=%s, load_dur=%s, prompt_eval_dur=%s, "
                    "eval_dur=%s, eval_cnt=%s, prompt_eval_cnt=%s, dur_ms=%d",
                    context_name, resp.status_code, model_res, done, done_reason,
                    msg_role, content_len, ctype, clen, body_len, preview,
                    raw_keys, msg_keys, total_duration, load_duration, prompt_eval_duration,
                    eval_duration, eval_count, prompt_eval_count, dur_ms
                )

                if not content or not done:
                    logger.warning(
                        "QWEN_EMPTY_OR_INCOMPLETE_RESPONSE: context=%s, done=%s, done_reason=%s, content_len=%d",
                        context_name, done, done_reason, content_len
                    )

                return {
                    "content": content,
                    "done": done,
                    "done_reason": done_reason,
                    "model": model_res,
                    "raw_keys": raw_keys,
                    "msg_keys": msg_keys,
                    "total_duration": total_duration,
                    "load_duration": load_duration,
                    "prompt_eval_duration": prompt_eval_duration,
                    "eval_duration": eval_duration,
                    "eval_count": eval_count,
                    "prompt_eval_count": prompt_eval_count,
                    "dur_ms": dur_ms,
                }
            else:
                content_chunks = []
                last_json = {}
                lines_count = 0
                with client.stream("POST", f"{self.ollama_url}/api/chat", json=payload) as resp:
                    if resp.status_code != 200:
                        raise RuntimeError(f"Ollama streaming returned HTTP status {resp.status_code}")
                    for line in resp.iter_lines():
                        if not line or not line.strip():
                            continue
                        lines_count += 1
                        try:
                            chunk = json.loads(line)
                            if isinstance(chunk, dict):
                                last_json = chunk
                                msg = chunk.get("message") or {}
                                chunk_content = msg.get("content") or ""
                                if chunk_content:
                                    content_chunks.append(chunk_content)
                        except Exception:
                            continue

                dur_ms = int((time.time() - start_t) * 1000)
                full_content = "".join(content_chunks).strip()
                done = bool(last_json.get("done", False))

                logger.info(
                    "QWEN_STREAM_DIAGNOSTICS: context=%s, lines=%d, content_len=%d, done=%s, dur_ms=%d",
                    context_name, lines_count, len(full_content), done, dur_ms
                )
                return {
                    "content": full_content,
                    "done": done,
                    "raw_keys": list(last_json.keys()),
                    "msg_keys": list((last_json.get("message") or {}).keys()) if isinstance(last_json.get("message"), dict) else [],
                    "dur_ms": dur_ms,
                }

    def analyze_reference_image(
        self,
        image_bytes: bytes,
        angle: str,
        product_info: Dict[str, Any],
    ) -> ProductReferenceAnalysisResult:
        """Perform individual Qwen visual analysis on ONE merchant reference image.

        Processes references one-at-a-time to prevent VRAM overflow.
        """
        opt_bytes = optimize_image_for_inference(image_bytes, max_dim=1024)
        img_b64 = base64.b64encode(opt_bytes).decode("utf-8")

        prompt = (
            f"You are a forensic product visual evidence analyzer.\n"
            f"Extract detailed visual metadata from this SINGLE merchant product reference photo.\n\n"
            f"--- MERCHANDISE SPECIFICATIONS ---\n"
            f"Product Name: {product_info.get('name', 'Unknown')}\n"
            f"SKU: {product_info.get('sku', 'Unknown')}\n"
            f"Category: {product_info.get('category', 'Unknown')}\n"
            f"Description: {product_info.get('description', 'None')}\n"
            f"Reference Angle: {angle.upper()}\n\n"
            f"--- INSTRUCTIONS ---\n"
            f"Extract objective visual metadata. DO NOT invent details not visible.\n"
            f"Return strictly a JSON object with this EXACT structure:\n"
            f"{{\n"
            f'  "angle": "{angle.upper()}",\n'
            f'  "summary": "Factual visual synthesis of this reference image",\n'
            f'  "confidence": 0.95,\n'
            f'  "metadata": {{\n'
            f'    "product_category": "{product_info.get("category", "General")}",\n'
            f'    "brand": "{product_info.get("name", "").split()[0] if product_info.get("name") else "Unspecified"}",\n'
            f'    "model": "{product_info.get("sku", "Unspecified")}",\n'
            f'    "visible_product_identity": "concise description of visible item",\n'
            f'    "shape": "geometric silhouette and shape details",\n'
            f'    "dimensions_proportions": "estimated visual proportions or unclear",\n'
            f'    "color": "primary and secondary colors visible",\n'
            f'    "material": "visible materials (plastic, metal, etc.) or unclear",\n'
            f'    "texture_finish": "matte, glossy, brushed, etc. or unclear",\n'
            f'    "distinctive_features": ["feature 1", "feature 2"],\n'
            f'    "buttons_ports_components": ["component 1", "component 2"],\n'
            f'    "logos_markings": ["logo or marking 1"],\n'
            f'    "visible_text": ["printed label text 1"],\n'
            f'    "packaging_characteristics": "packaging details if visible or null",\n'
            f'    "physical_condition": "NEW",\n'
            f'    "orientation_angle": "{angle.upper()}",\n'
            f'    "important_landmarks": ["landmark 1", "landmark 2"],\n'
            f'    "image_quality": "GOOD",\n'
            f'    "occlusions": ["occluded detail if any"],\n'
            f'    "uncertainties": ["detail not inferable from this single angle"]\n'
            f"  }}\n"
            f"}}\n\n"
            f"Produce VALID JSON ONLY."
        )

        payload = {
            "model": self.model_name,
            "messages": [
                {
                    "role": "user",
                    "content": prompt,
                    "images": [img_b64],
                }
            ],
            "format": "json",
            "stream": False,
            "keep_alive": "5m",
            "options": {
                "temperature": 0.1,
                "num_ctx": 4096,
            },
        }

        logger.info(
            "Invoking Qwen2.5-VL 3B for SINGLE reference analysis (Angle: %s, Product: %s)",
            angle,
            product_info.get("sku", "Unknown"),
        )

        try:
            res_dict = self._post_ollama_chat(payload, timeout=90.0, context_name=f"reference_{angle.lower()}")
            response_text = res_dict.get("content", "")
        except Exception as exc:
            logger.error("Failed to analyze reference angle %s via Qwen: %s", angle, exc)
            raise RuntimeError(f"Reference visual analysis failed for angle {angle}: {exc}") from exc

        if not response_text:
            raise RuntimeError(f"Qwen2.5-VL returned empty response text for reference angle {angle}")

        # Parse JSON and validate against ProductReferenceAnalysisResult
        clean_json_str = self._clean_json_markdown(response_text)
        data = json.loads(clean_json_str)
        return ProductReferenceAnalysisResult.model_validate(data)

    def analyze_evidence_image(
        self,
        evidence_bytes: bytes,
        evidence_mime_type: str,
        reference_images: Optional[List[Dict[str, Any]]] = None,
        product_info: Optional[Dict[str, Any]] = None,
        claim_context: Optional[Dict[str, Any]] = None,
        visual_profile: Optional[Dict[str, Any]] = None,
    ) -> VisualAnalysisResult:
        """Perform visual analysis comparing customer evidence to product visual profile.

        Submits ONE customer image payload to prevent VRAM overflow.
        """
        product_info = product_info or {}
        opt_evidence_bytes = optimize_image_for_inference(evidence_bytes, max_dim=1024)
        evidence_b64 = base64.b64encode(opt_evidence_bytes).decode("utf-8")

        images_b64: List[str] = [evidence_b64]

        # Optionally include max 1 matching reference image if provided
        ref_context_text = ""
        if reference_images and len(reference_images) > 0:
            top_ref = reference_images[0]
            ref_bytes = optimize_image_for_inference(top_ref["bytes"], max_dim=800)
            images_b64.append(base64.b64encode(ref_bytes).decode("utf-8"))
            ref_context_text = f"\nImage #2: Trusted Reference Baseline ({top_ref.get('angle', 'FRONT')} angle)"

        refund_reason = ""
        claim_notes = ""
        if claim_context:
            refund_reason = str(claim_context.get("refund_reason") or claim_context.get("workflow_step_key") or "").upper()
            claim_notes = str(claim_context.get("customer_notes") or claim_context.get("claim_text") or "")

        # Format visual profile text context and canonical product names
        profile_text = "No pre-computed profile available."
        canon_name = product_info.get('name', 'Unknown')
        canon_cat = product_info.get('category', 'Unknown')
        if visual_profile and isinstance(visual_profile, dict):
            profile_text = json.dumps(visual_profile, indent=2)
            if visual_profile.get("canonical_product_name"):
                canon_name = f"{visual_profile.get('canonical_product_name')} ({product_info.get('name', '')})"
            if visual_profile.get("category"):
                canon_cat = visual_profile.get("category")

        prompt_lines = [
            QWEN_VISION_SYSTEM_INSTRUCTION,
            "",
            "--- MERCHANDISE SPECIFICATIONS & CANONICAL PROFILE ---",
            f"Canonical Product Name: {canon_name}",
            f"SKU: {product_info.get('sku', 'Unknown')}",
            f"Category: {canon_cat}",
            f"Description: {product_info.get('description', 'None')}",
            "",
            "--- CONSOLIDATED PRODUCT VISUAL PROFILE ---",
            profile_text,
            "",
            "--- CLAIM CONTEXT ---",
            f"Customer Refund Reason: {refund_reason or 'Not specified'}",
            f"Customer Notes: {claim_notes or 'None'}",
            "",
            "--- IMAGES PROVIDED ---",
            "Image #1: Customer Evidence Subject Photo",
        ]
        if ref_context_text:
            prompt_lines.append(ref_context_text)

        prompt_lines.extend([
            "",
            "--- REQUIRED FORENSIC ANALYSIS & OUTPUT SCHEMA ---",
            "Evaluate Image #1 (Customer Evidence) against the CONSOLIDATED PRODUCT VISUAL PROFILE.",
            "Compare Image #1 to the canonical product identity, category, shape, colors, materials, and design features established in the visual profile.",
            "If Image #1 depicts the same product type/category as the consolidated visual profile, set matches_trusted_product = 'MATCH'.",
            "Return strictly a JSON object with this EXACT structure:",
            "{",
            '  "capture_assessment": {',
            '    "type": "PHYSICAL_PHOTO|SCREEN_PHOTO|SCREENSHOT|COMPOSITE|UNCLEAR",',
            '    "capture_context": "PHYSICAL_PHOTO|SCREEN_DISPLAY|SCREENSHOT|DIGITAL_IMAGE|UNCLEAR",',
            '    "screen_artifact_detected": false,',
            '    "physical_scene_detected": true,',
            '    "confidence": 0.9,',
            '    "observations": ["screen bezel visible", "moire patterns", "reflections"]',
            '  },',
            '  "product_identity": {',
            '    "apparent_product_type": "string category/name",',
            '    "matches_trusted_product": "MATCH|MISMATCH|UNCERTAIN|NOT_APPLICABLE",',
            '    "confidence": 0.85,',
            '    "identifying_features_visible": ["branding", "color", "shape"],',
            '    "notes": "forensic description"',
            '  },',
            '  "image_quality": {',
            '    "is_clear": true,',
            '    "lighting": "good|dim|harsh|unclear",',
            '    "blur_detected": false,',
            '    "resolution_adequate": true,',
            '    "overall": "GOOD|ACCEPTABLE|POOR|INSUFFICIENT",',
            '    "product_visibility": "CLEAR|PARTIAL|UNCLEAR|NOT_VISIBLE",',
            '    "issues": ["blur", "darkness", "crop"]',
            '  },',
            '  "product_consistency": {',
            '    "is_same_product_type": "observed|not_observed|unclear",',
            '    "matched_reference_angle": "FRONT|BACK|LEFT|RIGHT|MULTIPLE|NONE",',
            '    "brand_marking_visible": "observed|not_observed|not_visible|unclear",',
            '    "color_consistency": "consistent|inconsistent|unclear",',
            '    "shape_consistency": "consistent|inconsistent|unclear",',
            '    "notes": "comparison with visual profile"',
            '  },',
            '  "visible_condition": {',
            '    "claimed_damage_visible": "observed|not_observed|not_visible|unclear",',
            '    "damage_type_detected": "crack|scratch|tear|dent|none",',
            '    "damage_location": "front left corner|none",',
            '    "damage_severity_observation": "minor|moderate|severe|none",',
            '    "notes": "condition observations"',
            '  },',
            '  "key_visual_observations": [',
            '    "Objective observation 1",',
            '    "Objective observation 2"',
            '  ],',
            '  "uncertainties": [',
            '    "Limitation or occluded area 1"',
            '  ],',
            '  "overall_visual_confidence": 0.88',
            "}",
            "",
            "CRITICAL: Produce VALID JSON ONLY.",
        ])

        full_prompt = "\n".join(prompt_lines)

        payload = {
            "model": self.model_name,
            "messages": [
                {
                    "role": "user",
                    "content": full_prompt,
                    "images": images_b64,
                }
            ],
            "format": "json",
            "stream": False,
            "keep_alive": "5m",
            "options": {
                "temperature": 0.1,
                "num_ctx": 8192,
            },
        }

        start_t = time.time()
        logger.info(
            "Invoking Qwen2.5-VL 3B model %s for customer evidence analysis (%d image payload)",
            self.model_name,
            len(images_b64),
        )

        response_text = ""
        last_exc = None
        for attempt in range(2):
            try:
                res_dict = self._post_ollama_chat(
                    payload,
                    timeout=120.0,
                    context_name=f"customer_evidence_attempt_{attempt + 1}",
                )
                response_text = res_dict.get("content", "")
                if response_text:
                    break
                else:
                    logger.warning("Attempt %d: Qwen returned empty content. Retrying...", attempt + 1)
                    time.sleep(1.0)
            except Exception as exc:
                last_exc = exc
                logger.warning("Attempt %d failed: %s", attempt + 1, exc)
                if attempt == 0:
                    time.sleep(1.0)

        if not response_text:
            if last_exc:
                raise RuntimeError(f"Local Qwen2.5-VL vision analysis failed: {last_exc}") from last_exc
            raise RuntimeError("Qwen2.5-VL returned empty response text after retry")

        return self._parse_and_validate_response(response_text)

    def _clean_json_markdown(self, response_text: str) -> str:
        """Strip markdown fences if present."""
        clean_json_str = response_text.strip()
        if clean_json_str.startswith("```"):
            lines = clean_json_str.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            clean_json_str = "\n".join(lines).strip()
        return clean_json_str

    def _parse_and_validate_response(self, response_text: str) -> VisualAnalysisResult:
        """Parse raw response text, strip markdown formatting if present, and validate schema."""
        clean_json_str = self._clean_json_markdown(response_text)

        try:
            data = json.loads(clean_json_str)
        except Exception as exc:
            logger.warning("Failed to parse Qwen vision JSON output directly: %s. Output: %s", exc, clean_json_str[:300])
            try:
                start_idx = clean_json_str.find("{")
                end_idx = clean_json_str.rfind("}")
                if start_idx != -1 and end_idx != -1:
                    data = json.loads(clean_json_str[start_idx : end_idx + 1])
                else:
                    raise
            except Exception as inner_exc:
                raise ValueError(f"Malformed JSON from Qwen2.5-VL vision model: {exc}") from inner_exc

        capture_data = data.get("capture_assessment") or data.get("evidence_capture_assessment") or {}
        capture_type = str(capture_data.get("type") or capture_data.get("capture_context") or "PHYSICAL_PHOTO").upper()
        if "SCREEN" in capture_type and "PHOTO" in capture_type:
            capture_type = "SCREEN_PHOTO"
        elif "SCREEN" in capture_type:
            capture_type = "SCREENSHOT"
        elif "PHYSICAL" in capture_type:
            capture_type = "PHYSICAL_PHOTO"
        else:
            capture_type = "UNCLEAR"

        capture_assessment = EvidenceCaptureAssessment(
            type=capture_type,
            capture_context=capture_type,
            screen_artifact_detected=bool(capture_data.get("screen_artifact_detected", False)),
            physical_scene_detected=bool(capture_data.get("physical_scene_detected", True)),
            confidence=float(capture_data.get("confidence", 0.85)),
            observations=list(capture_data.get("observations") or []),
        )

        identity_data = data.get("product_identity") or {}
        product_identity = ProductIdentityAnalysis(
            apparent_product_type=str(identity_data.get("apparent_product_type") or "Observed item"),
            matches_trusted_product=str(identity_data.get("matches_trusted_product") or "UNCERTAIN").upper(),
            confidence=float(identity_data.get("confidence", 0.8)),
            identifying_features_visible=list(identity_data.get("identifying_features_visible") or []),
            notes=identity_data.get("notes"),
        )

        quality_data = data.get("image_quality") or {}
        image_quality = ImageQualityAnalysis(
            is_clear=bool(quality_data.get("is_clear", True)),
            lighting=str(quality_data.get("lighting", "good")),
            blur_detected=bool(quality_data.get("blur_detected", False)),
            resolution_adequate=bool(quality_data.get("resolution_adequate", True)),
            overall=str(quality_data.get("overall", "GOOD")).upper(),
            product_visibility=str(quality_data.get("product_visibility", "CLEAR")).upper(),
            issues=list(quality_data.get("issues") or []),
        )

        consistency_data = data.get("product_consistency") or {}
        product_consistency = ProductConsistencyAnalysis(
            is_same_product_type=str(consistency_data.get("is_same_product_type", "observed")),
            matched_reference_angle=consistency_data.get("matched_reference_angle"),
            brand_marking_visible=str(consistency_data.get("brand_marking_visible", "observed")),
            color_consistency=str(consistency_data.get("color_consistency", "consistent")),
            shape_consistency=str(consistency_data.get("shape_consistency", "consistent")),
            notes=consistency_data.get("notes"),
        )

        condition_data = data.get("visible_condition") or data.get("condition") or {}
        visible_condition = VisibleConditionAnalysis(
            claimed_damage_visible=str(condition_data.get("claimed_damage_visible", "not_visible")),
            damage_type_detected=condition_data.get("damage_type_detected"),
            damage_location=condition_data.get("damage_location"),
            damage_severity_observation=condition_data.get("damage_severity_observation"),
            notes=condition_data.get("notes"),
        )

        key_observations = list(data.get("key_visual_observations") or [])
        uncertainties = list(data.get("uncertainties") or [])
        overall_conf = float(data.get("overall_visual_confidence") or 0.85)

        return VisualAnalysisResult(
            image_quality=image_quality,
            product_consistency=product_consistency,
            visible_condition=visible_condition,
            capture_assessment=capture_assessment,
            product_identity=product_identity,
            key_visual_observations=key_observations,
            uncertainties=uncertainties,
            overall_visual_confidence=overall_conf,
        )


# Global singleton service instance
qwen_vision_service = QwenVisionService()
