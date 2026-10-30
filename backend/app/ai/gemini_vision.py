"""Gemini Vision AI integration service.

Provides visual consistency analysis comparing customer evidence images against
trusted merchant product reference images.
"""
import logging
from typing import Any, Dict, List, Optional
from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.visual_analysis import VisualAnalysisResult

logger = logging.getLogger(__name__)

GEMINI_VISION_SYSTEM_INSTRUCTION = """You are the Visual Consistency Observation Engine for an evidence verification platform.
Your responsibility is strictly limited to objective visual observation and comparison between merchant reference images and customer-submitted evidence images.

STRICT CONSTRAINTS:
1. DO NOT make refund approval or rejection recommendations.
2. DO NOT make any accusations of fraud, deception, or dishonesty. Never use words like 'fraud', 'scam', 'fake', or 'deceptive'.
3. DO NOT calculate or provide fraud risk scores.
4. DO NOT make definitive assumptions about angles or product parts that are out of frame, occluded, or not visible.
5. All observations must be objective, factual visual descriptions.

EPISTEMIC UNCERTAINTY INSTRUCTIONS:
- You must strictly differentiate between:
  - 'observed': Clearly and unambiguously visible in the image.
  - 'not_observed': The relevant area is clearly visible, but the feature/damage is absent.
  - 'not_visible': The area or angle is out of frame, obscured, hidden, or occluded.
  - 'unclear': The area is in frame but lighting, glare, low resolution, or distance makes it ambiguous.
- Under NO circumstance should 'not_visible' be equated to 'false' or 'not damaged'. If an area cannot be seen, report it as 'not_visible'.

CAPTURE ASSESSMENT (PHYSICAL VS DISPLAY / SCREEN):
Assess whether the submitted image appears to show:
- 'DIRECT_PHYSICAL_APPEARANCE': A real physical object photographed directly with depth of field, perspective, and natural ambient lighting.
- 'SCREEN_DISPLAY_APPEARANCE': An image displayed on a phone, laptop, monitor, or tablet screen that has been photographed.
  Look for visual indicators: monitor/laptop frame or bezel, visible desktop or mobile OS UI (taskbar, browser tabs, status bar, desktop icons), screen reflections or glare, moire pattern, pixel grid lines, perspective distortion of a monitor, unnatural image-within-image borders.
- 'SCREENSHOT_APPEARANCE': A direct electronic screenshot (crisp pixel-flat rendering without camera distortion).
- 'PRINTED_IMAGE_APPEARANCE': A physical paper printout of an image photographed (paper texture, halftone dots, edge curl).
- 'UNCLEAR': The capture method cannot be determined with confidence due to lighting, tight crop, or low resolution.
IMPORTANT: State observations factually without accusation (e.g. 'Evidence appears to show the product image displayed on a laptop screen').

IMAGE QUALITY ASSESSMENT:
- Evaluate overall quality: 'GOOD', 'ACCEPTABLE', 'POOR', 'INSUFFICIENT'.
- Evaluate product visibility: 'CLEAR', 'PARTIAL', 'UNCLEAR', 'NOT_VISIBLE'.
- Note issues such as blur, dim lighting, harsh glare, occlusion, severe crop, low resolution, or display interference.

PRODUCT IDENTITY & REFERENCE COMPARISON:
- Identify the apparent product type/name in the customer evidence (e.g. computer mouse, in-ear earphones, smartphone, athletic shoe).
- Determine whether it matches the merchant's trusted product: 'MATCH', 'MISMATCH', 'UNCERTAIN', 'NOT_APPLICABLE'.
- Note visible brand markings, model identifiers, physical contours, material textures, and colors.
- Identify which reference angle (FRONT, BACK, LEFT, RIGHT) it matches, or note an unrepresented angle.

CONDITION & DAMAGE OBSERVATIONS:
- Report any visible damage (scratches, cracks, dents, tears, liquid damage, broken parts).
- State the exact location where damage is observed.
- Note visible packaging condition if present.
"""


class GeminiVisionService:
    """Encapsulated service for invoking Google Gemini Vision models."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        prompt_version: Optional[str] = None,
    ) -> None:
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_VISION_MODEL
        self.prompt_version = prompt_version or settings.GEMINI_VISION_PROMPT_VERSION
        self._client: Optional[genai.Client] = None

    def is_available(self) -> bool:
        """Return True if Gemini API key is configured."""
        return bool(self.api_key and self.api_key.strip())

    @classmethod
    def log_startup_diagnostics(cls) -> None:
        """Log safe startup diagnostics without revealing secrets."""
        is_configured = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())
        logger.info(
            "GEMINI STARTUP DIAGNOSTICS: GEMINI_CONFIGURED=%s | GEMINI_MODEL=%s | GEMINI_AUTH_MODE=API_KEY",
            is_configured,
            settings.GEMINI_VISION_MODEL,
        )

    def get_client(self) -> genai.Client:
        """Obtain or initialize the Gemini client strictly in API key mode."""
        if self._client is None:
            if not self.api_key or not self.api_key.strip():
                raise ValueError(
                    "Gemini API key is not configured. Set GEMINI_API_KEY in environment or .env."
                )
            # Strictly use configured API key; do not fall back to ambient OAuth credentials
            self._client = genai.Client(api_key=self.api_key.strip())
        return self._client

    @staticmethod
    def _is_auth_error(exc: Exception) -> bool:
        """Detect Gemini authentication/authorization errors that must fast-fail without retry.

        Returns True for HTTP 401, ACCESS_TOKEN_TYPE_UNSUPPORTED, API_KEY_INVALID,
        UNAUTHENTICATED. These indicate configuration problems — retrying is pointless
        and makes the customer wait needlessly.
        """
        exc_str = str(exc).upper()
        auth_markers = (
            "401",
            "UNAUTHENTICATED",
            "ACCESS_TOKEN_TYPE_UNSUPPORTED",
            "API_KEY_INVALID",
            "PERMISSION_DENIED",
            "INVALID_API_KEY",
        )
        return any(m in exc_str for m in auth_markers)


    def analyze_evidence_image(
        self,
        evidence_bytes: bytes,
        evidence_mime_type: str,
        reference_images: List[Dict[str, Any]],
        product_info: Dict[str, Any],
        claim_context: Optional[Dict[str, Any]] = None,
    ) -> VisualAnalysisResult:
        """Perform multimodal visual analysis comparing customer evidence to merchant reference angles.

        Args:
            evidence_bytes: Raw binary bytes of the customer's submitted photo.
            evidence_mime_type: MIME type of customer evidence (e.g. image/jpeg, image/png).
            reference_images: List of dicts, each with 'angle' (str), 'bytes' (bytes), 'mime_type' (str).
            product_info: Dict containing product details (name, sku, category, description).
            claim_context: Optional dict with customer claim details (step key, customer notes, claim text, refund_reason).

        Returns:
            VisualAnalysisResult structured schema.
        """
        client = self.get_client()

        # Build contents array for multimodal invocation
        contents: List[Any] = []

        # System and task preamble
        intro_text = [
            f"=== GEMINI VISION VISUAL CONSISTENCY ANALYSIS ({self.prompt_version}) ===",
            "TASK: Analyze the submitted customer evidence image against the merchant's trusted reference angles.",
            "",
            "--- MERCHANT PRODUCT SPECIFICATION ---",
            f"Product Name: {product_info.get('name', 'Unknown')}",
            f"SKU: {product_info.get('sku', 'Unknown')}",
            f"Category: {product_info.get('category', 'Unknown')}",
            f"Description: {product_info.get('description', 'None')}",
            "",
        ]

        if claim_context:
            refund_reason = str(claim_context.get("refund_reason") or claim_context.get("workflow_step_key") or "").upper()
            claim_notes = str(claim_context.get("customer_notes") or claim_context.get("claim_text") or "")
            intro_text.extend([
                "--- CLAIM CONTEXT ---",
                f"Workflow Step: {claim_context.get('workflow_step_key', 'Unknown')}",
                f"Refund Reason: {claim_context.get('refund_reason', 'Not specified')}",
                f"Claimed Notes: {claim_notes or 'None'}",
                "",
            ])

            claim_instructions = []
            if "WRONG" in refund_reason or "different" in claim_notes.lower():
                claim_instructions.append(
                    "SPECIFIC CLAIM FOCUS (WRONG PRODUCT RECEIVED):\n"
                    "- What specific physical product or device is visible in the customer evidence?\n"
                    "- Does it match the merchant's specified product (name, category, design)?\n"
                    "- Is the evidence showing a real physical product or an image displayed on another screen?\n"
                    "- Is enough of the product visible to establish its identity?"
                )
            elif "DAMAG" in refund_reason or "DEFECT" in refund_reason or "broken" in claim_notes.lower():
                claim_instructions.append(
                    "SPECIFIC CLAIM FOCUS (PRODUCT ARRIVED DAMAGED):\n"
                    "- Is visible physical damage observed on the product? What type and exact location?\n"
                    "- Is the reported damaged area in frame and clearly visible?\n"
                    "- Is the item photographed directly or shown on another screen?"
                )
            elif "MISSING" in refund_reason or "incomplete" in claim_notes.lower():
                claim_instructions.append(
                    "SPECIFIC CLAIM FOCUS (MISSING COMPONENT / ACCESSORY):\n"
                    "- What components/accessories are visible versus absent?\n"
                    "- Is the packaging or unboxing state visible?"
                )

            if claim_instructions:
                intro_text.extend(["--- CLAIM-AWARE PRIORITIES ---"] + claim_instructions + [""])

        intro_text.append("--- MERCHANT TRUSTED REFERENCE IMAGES ---")
        intro_text.append("The following reference images represent the verified standard product from 4 canonical angles:")
        contents.append("\n".join(intro_text))

        # Add reference images with their labeled angle
        for ref in reference_images:
            angle = ref.get("angle", "UNKNOWN")
            contents.append(f"\n[REFERENCE IMAGE - ANGLE: {angle}]")
            contents.append(
                types.Part.from_bytes(
                    data=ref["bytes"],
                    mime_type=ref.get("mime_type", "image/jpeg"),
                )
            )

        # Add customer evidence
        contents.append("\n--- CUSTOMER SUBMITTED SUBJECT EVIDENCE ---")
        contents.append("Below is the evidence photo submitted by the customer for this refund claim:")
        contents.append(
            types.Part.from_bytes(
                data=evidence_bytes,
                mime_type=evidence_mime_type,
            )
        )

        contents.append(
            "\nAnalyze the customer image thoroughly against the trusted reference images according to the instructions. "
            "Evaluate image quality, product identity, capture appearance (direct physical vs screen/display), product consistency, and visible condition/damage. "
            "Return output strictly adhering to the JSON schema."
        )

        # Configure structured output with Gemini
        config = types.GenerateContentConfig(
            system_instruction=GEMINI_VISION_SYSTEM_INSTRUCTION,
            temperature=0.2,
            response_mime_type="application/json",
            response_schema=VisualAnalysisResult,
        )

        logger.info(
            "Invoking Gemini Vision model %s (prompt %s) with %d reference images",
            self.model_name,
            self.prompt_version,
            len(reference_images),
        )

        models_to_try = [self.model_name]
        for fallback in ["gemini-flash-lite-latest", "gemini-2.5-flash"]:
            if fallback not in models_to_try:
                models_to_try.append(fallback)

        response = None
        last_exc = None
        for m in models_to_try:
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=contents,
                    config=config,
                )
                self.model_name = m
                break
            except Exception as exc:
                if self._is_auth_error(exc):
                    logger.error(
                        "Gemini Vision AUTHENTICATION FAILURE (fast-fail): %s. "
                        "Check GEMINI_API_KEY in .env — OAuth/ADC tokens are not supported.",
                        exc,
                    )
                    raise ValueError(
                        f"Gemini Vision authentication failed (API key invalid or unsupported). "
                        f"Configure GEMINI_API_KEY correctly in .env. Detail: {exc}"
                    ) from exc
                logger.warning("Gemini Vision model %s failed (%s); attempting next candidate", m, exc)
                last_exc = exc

        if response is None:
            raise last_exc or RuntimeError("All Gemini Vision model candidates failed")

        if not response.text:
            raise RuntimeError("Gemini Vision returned empty text response")

        result = VisualAnalysisResult.model_validate_json(response.text)
        return result

    @staticmethod
    def categorize_gemini_error(exc: Exception) -> Dict[str, str]:
        """Categorize Gemini API exceptions into clear user-facing failure types."""
        exc_str = str(exc)
        exc_upper = exc_str.upper()

        if any(m in exc_upper for m in ("401", "UNAUTHENTICATED", "API_KEY_INVALID", "INVALID_API_KEY", "PERMISSION_DENIED")):
            return {
                "error_code": "INVALID_API_KEY",
                "user_message": "AI verification failed because the configured AI credentials are invalid.",
                "detail": exc_str,
            }
        if any(m in exc_upper for m in ("429", "RESOURCE_EXHAUSTED", "RATE_LIMIT", "QUOTA")):
            return {
                "error_code": "RATE_LIMIT",
                "user_message": "AI verification is temporarily unavailable due to rate limits. Please try again in a few moments.",
                "detail": exc_str,
            }
        if any(m in exc_upper for m in ("TIMEOUT", "DEADLINE_EXCEEDED", "TIMED OUT")):
            return {
                "error_code": "TIMEOUT",
                "user_message": "AI analysis is taking longer than expected. You can retry verification.",
                "detail": exc_str,
            }
        if any(m in exc_upper for m in ("DECODE", "INVALID_IMAGE", "CORRUPT", "UNSUPPORTED_MIME", "BAD_REQUEST")):
            return {
                "error_code": "IMAGE_PROCESSING_FAILED",
                "user_message": "Unable to analyze the submitted image. Please capture another clear photograph.",
                "detail": exc_str,
            }
        return {
            "error_code": "UNKNOWN_ERROR",
            "user_message": f"AI verification encountered an unexpected issue: {exc_str[:120]}",
            "detail": exc_str,
        }

    def analyze_reference_image(
        self,
        image_bytes: bytes,
        angle: str,
        product_info: Dict[str, Any],
        mime_type: str = "image/jpeg",
    ):
        """Perform multimodal visual analysis on a single merchant reference angle using Gemini Vision."""
        from datetime import datetime, timezone
        from app.schemas.product_reference_analysis import ProductReferenceAnalysisResult, ReferenceImageVisualMetadata

        client = self.get_client()
        norm_angle = angle.upper()

        prompt = (
            f"=== GEMINI VISION REFERENCE IMAGE ANALYSIS ({self.prompt_version}) ===\n"
            f"TASK: Extract comprehensive structured visual metadata from this authentic merchant baseline photo.\n\n"
            f"--- PRODUCT SPECIFICATION ---\n"
            f"Product ID: {product_info.get('id', 'Unknown')}\n"
            f"Name: {product_info.get('name', 'Unknown')}\n"
            f"SKU: {product_info.get('sku', 'Unknown')}\n"
            f"Category: {product_info.get('category', 'Unknown')}\n"
            f"Description: {product_info.get('description', 'None')}\n"
            f"Canonical Angle: {norm_angle}\n\n"
            f"Analyze and extract structured visual metadata:\n"
            f"1. Main object description and visible product identity\n"
            f"2. Shape and geometry (silhouette, contours, curvature)\n"
            f"3. Color and finish (primary/secondary colors, matte/gloss finish)\n"
            f"4. Materials and textures (plastic, aluminum, glass, leather, mesh)\n"
            f"5. Distinctive physical features (seams, joints, hinges, bezels)\n"
            f"6. Visible buttons, ports, labels, and components\n"
            f"7. Component placement and layout\n"
            f"8. Expected physical condition (NEW / PRISTINE)\n"
            f"9. Angle-specific visual characteristics\n"
            f"10. Notable landmarks and any uncertainties/limitations\n\n"
            f"Return strictly valid JSON matching the schema."
        )

        contents = [
            prompt,
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
        ]

        config = types.GenerateContentConfig(
            system_instruction=GEMINI_VISION_SYSTEM_INSTRUCTION,
            temperature=0.1,
            response_mime_type="application/json",
            response_schema=ProductReferenceAnalysisResult,
        )

        models_to_try = [self.model_name]
        for fallback in ["gemini-flash-lite-latest", "gemini-2.5-flash"]:
            if fallback not in models_to_try:
                models_to_try.append(fallback)

        response = None
        last_exc = None
        for m in models_to_try:
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=contents,
                    config=config,
                )
                self.model_name = m
                break
            except Exception as exc:
                if self._is_auth_error(exc):
                    raise ValueError(f"Gemini authentication failed: {exc}") from exc
                logger.warning("Gemini Vision reference model %s failed (%s); attempting fallback", m, exc)
                last_exc = exc

        if response is None:
            raise last_exc or RuntimeError("All Gemini Vision reference model candidates failed")

        if not response.text:
            raise RuntimeError("Gemini Vision returned empty text response for reference image")

        result = ProductReferenceAnalysisResult.model_validate_json(response.text)
        # Ensure priority metadata fields are populated
        result.metadata.product_id = str(product_info.get("id") or "")
        result.metadata.reference_angle = norm_angle
        result.metadata.orientation_angle = norm_angle
        result.metadata.model_name = self.model_name
        result.metadata.analysis_timestamp = datetime.now(timezone.utc).isoformat()
        result.metadata.processing_status = "COMPLETED"
        result.metadata.metadata_schema_version = "v2.0"
        if not result.metadata.main_object_description:
            result.metadata.main_object_description = result.metadata.visible_product_identity or product_info.get("name", "")
        if not result.metadata.shape_and_geometry:
            result.metadata.shape_and_geometry = result.metadata.shape or "standard product geometry"
        if not result.metadata.color_and_finish:
            result.metadata.color_and_finish = result.metadata.color or "standard color and finish"
        if not result.metadata.materials_and_textures:
            result.metadata.materials_and_textures = result.metadata.material or "standard materials"
        if not result.metadata.distinctive_physical_features and result.metadata.distinctive_features:
            result.metadata.distinctive_physical_features = result.metadata.distinctive_features
        if not result.metadata.visible_buttons_ports_labels and result.metadata.buttons_ports_components:
            result.metadata.visible_buttons_ports_labels = result.metadata.buttons_ports_components
        if not result.metadata.expected_physical_condition:
            result.metadata.expected_physical_condition = result.metadata.physical_condition or "NEW"

        return result

    def consolidate_product_visual_profile(
        self,
        product_info: Dict[str, Any],
        reference_analyses: List[Dict[str, Any]],
    ):
        """Consolidate the 4 structured reference image visual metadata records into a ProductVisualProfileResult using Gemini."""
        import json
        from app.schemas.product_reference_analysis import ProductVisualProfileResult

        client = self.get_client()

        system_instruction = (
            "You are the Product Visual Profile Consolidation Engine for an evidence verification platform.\n"
            "Your task is to synthesize individual visual metadata records from the 4 canonical reference angles (FRONT, BACK, LEFT, RIGHT) "
            "into a single consolidated Product Visual Profile.\n\n"
            "STRICT RULES:\n"
            "1. Do NOT invent physical features or markings not present in the input reference metadata.\n"
            "2. Establish angle-specific visual expectations for FRONT, BACK, LEFT, and RIGHT.\n"
            "3. Identify distinguishing visual landmarks for forensic comparison against customer evidence.\n"
            "4. Return strictly valid JSON containing these exact fields:\n"
            "  - canonical_product_name (string)\n"
            "  - brand (string)\n"
            "  - model (string)\n"
            "  - category (string)\n"
            "  - primary_colors (list of strings)\n"
            "  - materials_finish (list of strings)\n"
            "  - key_design_features (list of strings)\n"
            "  - angle_specific_expectations (object with keys FRONT, BACK, LEFT, RIGHT mapping to descriptions)\n"
            "  - visible_identifiers_and_text (list of strings)\n"
            "  - distinguishing_landmarks (list of strings)\n"
            "  - packaging_characteristics (string or null)\n"
            "  - known_limitations_uncertainties (list of strings)\n"
            "  - provenance_summary (object mapping angle keys to lists of features established by that angle)"
        )

        user_content = (
            f"=== PRODUCT CATALOG INFORMATION ===\n"
            f"Product ID: {product_info.get('id', 'Unknown')}\n"
            f"Name: {product_info.get('name', 'Unknown')}\n"
            f"SKU: {product_info.get('sku', 'Unknown')}\n"
            f"Category: {product_info.get('category', 'Unknown')}\n"
            f"Description: {product_info.get('description', 'None')}\n\n"
            f"=== STRUCTURED VISUAL METADATA FROM 4 CANONICAL ANGLES ===\n"
            f"{json.dumps(reference_analyses, indent=2, default=str)}\n\n"
            f"Consolidate these observations into a comprehensive Product Visual Profile adhering strictly to the JSON schema."
        )

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.1,
            response_mime_type="application/json",
        )

        models_to_try = [self.model_name, "gemini-flash-lite-latest", "gemini-2.5-flash"]
        response = None
        last_exc = None
        for m in models_to_try:
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=user_content,
                    config=config,
                )
                self.model_name = m
                break
            except Exception as exc:
                if self._is_auth_error(exc):
                    raise ValueError(f"Gemini authentication failed: {exc}") from exc
                logger.warning("Gemini visual profile consolidation model %s failed: %s", m, exc)
                last_exc = exc

        if response is None or not response.text:
            raise last_exc or RuntimeError("Failed to consolidate Product Visual Profile with Gemini")

        return ProductVisualProfileResult.model_validate_json(response.text)

    def analyze_customer_evidence_against_metadata(
        self,
        evidence_bytes: bytes,
        evidence_mime_type: str,
        product_info: Dict[str, Any],
        visual_profile: Optional[Dict[str, Any]],
        reference_metadata_list: List[Dict[str, Any]],
        claim_context: Dict[str, Any],
        previous_followups: Optional[List[Dict[str, Any]]] = None,
    ):
        """Analyze customer evidence image directly against stored product visual metadata using Gemini.

        CRITICAL ARCHITECTURAL CONSTRAINTS:
        - Receives the customer's actual live image bytes (never just URL or filename).
        - Receives stored structured reference metadata (NO raw reference images re-sent).
        - Reasons about the customer claim, comparing customer photo to stored profile.
        - Returns structured GeminiVerificationAssessment validated with Pydantic.
        """
        import json
        from app.schemas.verification_reasoning import GeminiVerificationAssessment

        client = self.get_client()

        system_instruction = (
            "You are the Lead Visual Evidence Verification & Reasoning Engine for Reft.AI.\n"
            "Your task is to compare customer-submitted evidence images against the merchant's stored canonical visual metadata profile "
            "and reason about the customer's refund claim.\n\n"
            "STRICT CONSTRAINTS & BEHAVIORAL RULES:\n"
            "1. DO NOT make refund approval or rejection decisions. The merchant makes the final decision.\n"
            "2. DO NOT make any accusations of fraud, deception, dishonesty, or malice. Never use words like 'fraud', 'scam', 'fake', or 'deceptive'.\n"
            "3. Objective, factual observations only.\n"
            "4. Epistemic uncertainty:\n"
            "   - 'observed': Clearly and unambiguously visible in customer evidence.\n"
            "   - 'not_observed': Relevant area is in frame and clear, but reported defect/feature is absent.\n"
            "   - 'not_visible': Relevant area or angle is occluded, cropped, or out of frame.\n"
            "   - 'unclear': In frame but lighting, glare, low resolution, or angle makes it ambiguous.\n"
            "5. CLAIM-AWARE REASONING:\n"
            "   - If customer reports 'Wrong Product Received': a visual mismatch with the merchant profile SUPPORTS the customer's claim! Do not treat a mismatch as fraud.\n"
            "   - If customer reports 'Damaged on Arrival': verify if the reported damage is visibly present at the described location.\n"
            "   - If customer reports 'Missing Items/Parts': check if components are present or absent.\n"
            "6. DYNAMIC FOLLOW-UP STRATEGY:\n"
            "   - If key areas are occluded or glare prevents verifying damage, generate targeted follow_up_questions (PHOTO, MCQ, or TEXT).\n"
            "   - If damage is clear and sufficient, follow_up_questions can be empty.\n"
            "7. MACHINE ASSESSMENT STATUS:\n"
            "   - 'EVIDENCE_CONSISTENT': Evidence clearly supports the claim with no major contradictions.\n"
            "   - 'REVIEW_REQUIRED': Partial evidence, ambiguous lighting, or human merchant review needed.\n"
            "   - 'INCONSISTENCY_DETECTED': Direct visual contradiction with claim or stored baseline (e.g. pristine condition claimed as shattered).\n"
            "8. Return strictly valid JSON adhering to the schema."
        )

        intro = [
            f"=== GEMINI CUSTOMER EVIDENCE REASONING ({self.prompt_version}) ===",
            "TASK: Evaluate the customer's submitted photograph against the stored product visual metadata and reason about their claim.",
            "",
            "--- MERCHANT PRODUCT SPECIFICATION ---",
            f"Product Name: {product_info.get('name', 'Unknown')}",
            f"SKU: {product_info.get('sku', 'Unknown')}",
            f"Category: {product_info.get('category', 'Unknown')}",
            f"Description: {product_info.get('description', 'None')}",
            "",
            "--- CUSTOMER REFUND CLAIM ---",
            f"Order ID: {claim_context.get('order_id', 'Unknown')}",
            f"Customer Name: {claim_context.get('customer_name', 'Customer')}",
            f"Reported Refund Reason: {claim_context.get('refund_reason', 'Product defect or damage')}",
            f"Customer Explanation / Notes: {claim_context.get('customer_notes', 'None provided')}",
            f"Workflow Step Key: {claim_context.get('workflow_step_key', 'step_initial_proof')}",
            "",
        ]

        if previous_followups:
            intro.append("--- PREVIOUS CUSTOMER FOLLOW-UPS & ANSWERS ---")
            for prev in previous_followups:
                intro.append(f"Q: {prev.get('question', '')} | Answer: {prev.get('answer', '')}")
            intro.append("")

        intro.append("--- STORED CANONICAL PRODUCT VISUAL PROFILE ---")
        if visual_profile:
            intro.append(json.dumps(visual_profile, indent=2, default=str))
        else:
            intro.append("Consolidated visual profile pending; refer to reference angle metadata below.")
        intro.append("")

        if reference_metadata_list:
            intro.append("--- STORED REFERENCE ANGLE VISUAL METADATA ---")
            for ref_meta in reference_metadata_list:
                angle_label = ref_meta.get("angle") or ref_meta.get("reference_angle") or "CANONICAL_ANGLE"
                intro.append(f"[METADATA FOR ANGLE: {angle_label}]")
                intro.append(json.dumps(ref_meta, indent=2, default=str))
            intro.append("")

        intro.append("--- CUSTOMER SUBMITTED LIVE EVIDENCE IMAGE ---")
        intro.append("Analyze the attached customer image bytes against the stored visual metadata above:")

        contents = [
            "\n".join(intro),
            types.Part.from_bytes(data=evidence_bytes, mime_type=evidence_mime_type),
            (
                "\nPerform deep visual inspection and claim reasoning. Compare the customer's photo against the stored product visual profile. "
                "Assess visible damage, product characteristics, consistency, and whether the evidence supports the claim. "
                "Produce dynamic follow-up questions only if critical areas are occluded or ambiguous. "
                "Output strictly adhering to the JSON schema."
            ),
        ]

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.2,
            response_mime_type="application/json",
            response_schema=GeminiVerificationAssessment,
        )

        models_to_try = [self.model_name, "gemini-flash-lite-latest", "gemini-2.5-flash"]
        response = None
        last_exc = None
        for m in models_to_try:
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=contents,
                    config=config,
                )
                self.model_name = m
                break
            except Exception as exc:
                if self._is_auth_error(exc):
                    raise ValueError(f"Gemini authentication failed: {exc}") from exc
                logger.warning("Gemini customer evidence reasoning model %s failed: %s", m, exc)
                last_exc = exc

        if response is None or not response.text:
            raise last_exc or RuntimeError("All Gemini customer reasoning model candidates failed")

        return GeminiVerificationAssessment.model_validate_json(response.text)


# Global singleton service instance
gemini_vision_service = GeminiVisionService()
