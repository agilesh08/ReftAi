"""Real Google Gemini API Integration Verification Tests.

Executes real text, image, and integrated metadata-based verification requests against Google Gemini.
NO MOCKING. Verifies real API keys, multimodal comprehension, and structured Pydantic validation.
"""
import io
import os
import sys
import pytest
from PIL import Image, ImageDraw

from app.core.config import settings
from app.ai.gemini_vision import gemini_vision_service
from app.schemas.verification_reasoning import GeminiVerificationAssessment
from app.schemas.product_reference_analysis import ProductReferenceAnalysisResult, ReferenceImageVisualMetadata


def create_test_damaged_headphone_image() -> bytes:
    """Generate a realistic test image of a headphone earcup with a visible fracture crack."""
    img = Image.new("RGB", (512, 512), color=(245, 245, 250))
    draw = ImageDraw.Draw(img)

    # Black matte earcup body
    draw.ellipse([100, 100, 412, 412], outline=(30, 30, 35), width=16, fill=(25, 25, 30))
    # Inner silver driver grille
    draw.ellipse([160, 160, 352, 352], outline=(120, 120, 130), width=6, fill=(45, 45, 50))
    # Visible jagged crack across upper right bezel
    draw.line([300, 120, 340, 210], fill=(230, 40, 40), width=5)
    draw.line([340, 210, 385, 260], fill=(230, 40, 40), width=4)
    # Power slider button
    draw.rectangle([90, 240, 110, 275], fill=(160, 160, 170))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def create_test_reference_headphone_image() -> bytes:
    """Generate a realistic pristine reference image of a headphone earcup (FRONT canonical angle)."""
    img = Image.new("RGB", (512, 512), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Pristine black matte earcup body with no cracks
    draw.ellipse([100, 100, 412, 412], outline=(30, 30, 35), width=16, fill=(25, 25, 30))
    draw.ellipse([160, 160, 352, 352], outline=(140, 140, 150), width=6, fill=(45, 45, 50))
    draw.text((220, 250), "AUDIO", fill=(200, 200, 210))
    draw.rectangle([90, 240, 110, 275], fill=(160, 160, 170))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


def test_gemini_api_key_configuration():
    """Verify Gemini API key exists and is non-empty."""
    assert settings.GEMINI_API_KEY, "GEMINI_API_KEY must be configured in backend .env"
    assert len(settings.GEMINI_API_KEY.strip()) > 15, "GEMINI_API_KEY appears too short"
    assert gemini_vision_service.is_available() is True


def test_real_gemini_test_a_text_claim_reasoning():
    """TEST A - TEXT: Realistic damaged-product claim reasoning and dynamic follow-up generation."""
    client = gemini_vision_service.get_client()

    prompt = (
        "You are an evidence verification engine. A customer filed a refund claim stating:\n"
        "'The left earcup of my Bose QuietComfort 45 arrived with a severe hairline crack right above the pivot hinge.'\n\n"
        "1. Understand and summarize the claim issue.\n"
        "2. State what specific visual evidence is required to verify this claim.\n"
        "3. Produce exactly one targeted follow-up question asking for a close-up angle of the reported hinge area.\n"
        "Return valid JSON adhering to: {'issue': str, 'evidence_needed': str, 'followup_question': str}"
    )

    response = client.models.generate_content(
        model=settings.GEMINI_VISION_MODEL,
        contents=prompt,
    )

    assert response.text, "Gemini returned empty text response"
    print("\n--- TEST A (TEXT REASONING) OUTPUT ---")
    print(response.text[:300])
    text_lower = response.text.lower()
    assert any(w in text_lower for w in ("crack", "hinge", "earcup", "damage", "pivot")), "Gemini failed to understand the damaged earcup claim"


def test_real_gemini_test_b_image_metadata_extraction():
    """TEST B - IMAGE: Send an authentic reference image and verify Gemini extracts structured visual metadata."""
    ref_bytes = create_test_reference_headphone_image()

    product_info = {
        "id": "prod-test-headphones-001",
        "name": "Bose QuietComfort 45 Headphones",
        "sku": "BQC-45-BLK",
        "category": "Consumer Electronics / Over-Ear Headphones",
        "description": "Premium noise cancelling over-ear headphones in matte black finish.",
    }

    result = gemini_vision_service.analyze_reference_image(
        image_bytes=ref_bytes,
        angle="FRONT",
        product_info=product_info,
        mime_type="image/jpeg",
    )

    assert isinstance(result, ProductReferenceAnalysisResult)
    assert result.angle == "FRONT"
    assert result.metadata.product_id == "prod-test-headphones-001"
    assert result.metadata.reference_angle == "FRONT"
    assert result.metadata.processing_status == "COMPLETED"
    assert result.metadata.product_category, "Category must be extracted"
    assert result.confidence > 0.0

    print("\n--- TEST B (IMAGE METADATA EXTRACTION) OUTPUT ---")
    print(f"Product Category: {result.metadata.product_category}")
    print(f"Main Object: {result.metadata.main_object_description}")
    print(f"Shape: {result.metadata.shape_and_geometry}")
    print(f"Color: {result.metadata.color_and_finish}")
    print(f"Confidence: {result.confidence}")


def test_real_gemini_test_c_integrated_customer_evidence_reasoning():
    """TEST C - INTEGRATED: Customer live damaged photo compared against stored visual metadata profile."""
    customer_image_bytes = create_test_damaged_headphone_image()

    product_info = {
        "id": "prod-test-headphones-001",
        "name": "Bose QuietComfort 45 Headphones",
        "sku": "BQC-45-BLK",
        "category": "Consumer Electronics / Over-Ear Headphones",
        "description": "Premium noise cancelling over-ear headphones in matte black finish.",
    }

    # Persisted visual metadata profile (from previous 4 canonical angles)
    persisted_visual_profile = {
        "canonical_product_name": "Bose QuietComfort 45 Headphones",
        "category": "Over-Ear Headphones",
        "primary_colors": ["Matte Black"],
        "materials_finish": ["Matte polycarbonate", "Synthetic leather", "Aluminum pivot joints"],
        "key_design_features": ["Circular earcup with outer bezel", "Central driver grille", "Physical slider button"],
        "angle_specific_expectations": {
            "FRONT": "Outer earcup face showing circular contour and smooth unbroken bezel",
            "BACK": "Inner earcup cushion showing perforated acoustic foam",
            "LEFT": "Left slider adjustment band and volume toggle",
            "RIGHT": "Right USB-C charging port and power switch",
        },
    }

    persisted_reference_metadata = [
        {
            "angle": "FRONT",
            "main_object_description": "Matte black headphone earcup with circular outer bezel",
            "shape_and_geometry": "Circular elliptical outer shell with flush contours",
            "color_and_finish": "Matte black with silver-grey central grille",
            "materials_and_textures": "Smooth injection-molded plastic",
            "expected_physical_condition": "NEW",
            "distinctive_features": ["Pristine smooth outer bezel", "Power slider on edge"],
        }
    ]

    claim_context = {
        "order_id": "ORD-TEST-9921",
        "customer_name": "Agilesh",
        "refund_reason": "Left earcup arrived cracked right on the upper bezel",
        "customer_notes": "Unboxed the item immediately after courier delivery and found a prominent crack on the shell.",
        "workflow_step_key": "step_initial_proof",
    }

    assessment = gemini_vision_service.analyze_customer_evidence_against_metadata(
        evidence_bytes=customer_image_bytes,
        evidence_mime_type="image/jpeg",
        product_info=product_info,
        visual_profile=persisted_visual_profile,
        reference_metadata_list=persisted_reference_metadata,
        claim_context=claim_context,
        previous_followups=[],
    )

    assert isinstance(assessment, GeminiVerificationAssessment)
    assert assessment.machine_assessment in ("EVIDENCE_CONSISTENT", "REVIEW_REQUIRED", "INCONSISTENCY_DETECTED")
    assert assessment.claim_understanding.reported_issue
    assert assessment.reasoning_summary

    print("\n--- TEST C (INTEGRATED CUSTOMER REASONING) OUTPUT ---")
    print(f"Machine Assessment: {assessment.machine_assessment}")
    print(f"Reported Issue: {assessment.claim_understanding.reported_issue}")
    print(f"Visible Damage: {assessment.visual_analysis.visible_damage}")
    print(f"Supports Claim: {assessment.evidence_assessment.supports_claim}")
    print(f"Reasoning Summary: {assessment.reasoning_summary}")
    print(f"Follow-up Questions: {[q.question for q in assessment.follow_up_questions]}")


def test_gemini_error_categorization():
    """Verify Gemini error categorization generates exact user-facing error messages."""
    missing_key_cat = gemini_vision_service.categorize_gemini_error(Exception("401 API_KEY_INVALID unauthorized"))
    assert missing_key_cat["error_code"] == "INVALID_API_KEY"
    assert missing_key_cat["user_message"] == "AI verification failed because the configured AI credentials are invalid."

    rate_limit_cat = gemini_vision_service.categorize_gemini_error(Exception("429 ResourceExhausted rate limit exceeded"))
    assert rate_limit_cat["error_code"] == "RATE_LIMIT"
    assert "rate limit" in rate_limit_cat["user_message"].lower()

    timeout_cat = gemini_vision_service.categorize_gemini_error(Exception("Deadline exceeded timeout waiting for response"))
    assert timeout_cat["error_code"] == "TIMEOUT"
    assert timeout_cat["user_message"] == "AI analysis is taking longer than expected. You can retry verification."
