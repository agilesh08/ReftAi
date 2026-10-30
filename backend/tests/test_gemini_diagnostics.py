"""Live integration test suite for Gemini AI Backend Audit in Reft.AI."""
import pytest
from scripts.test_gemini_diagnostics import run_diagnostics


def test_live_gemini_diagnostics_audit():
    """Run full live Gemini diagnostics verifying configuration, model, text understanding, and multimodal analysis."""
    result = run_diagnostics()
    assert result["config_present"] is True, "GEMINI_API_KEY must be configured in backend"
    assert result["model_accessible"] is True, f"Configured Gemini model must be accessible: {result['errors']}"
    assert result["text_understanding_passed"] is True, "Gemini text reasoning test failed"
    assert result["image_clear_passed"] is True, "Clear image visual observation failed"
    assert result["image_damaged_passed"] is True, "Damaged image fracture detection failed"
    assert result["image_unclear_passed"] is True, "Unclear image quality analysis failed"
    assert result["structured_evidence_passed"] is True, "Structured evidence analysis schema validation failed"
    assert result["structured_reference_passed"] is True, "Structured reference analysis schema validation failed"
    assert result["invalid_image_fails_gracefully"] is True, "Invalid image bytes did not fail gracefully"
    assert result["overall_status"] == "PASS", f"Diagnostics suite overall failure: {result['errors']}"
