"""Google Gemini AI Workflow Generation Service.

Dynamically synthesizes claim-aware, multi-layered verification workflows
using the Google Gemini API based on merchant claim parameters.
"""
import json
import logging
from typing import Any, Dict, Optional
from google import genai
from google.genai import types
from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.workflow import (
    AIGenerateWorkflowRequest,
    AIGeneratedWorkflowResponse,
)

logger = logging.getLogger(__name__)

GEMINI_WORKFLOW_SYSTEM_INSTRUCTION = """You are the Senior Verification Workflow Architect for Reft.AI, an enterprise refund evidence platform.
Your objective is to analyze the merchant's refund claim context and synthesize a tailored, objective, and proportional verification workflow.

SAFETY & COMPLIANCE MANDATES:
1. NEVER declare a customer fraudulent, dishonest, or malicious. Do NOT use words like 'fraud', 'scam', 'cheat', or 'fake'.
2. DO NOT automatically approve or automatically reject any refund. The generated workflow is an objective evidence collection tool for merchant review.
3. DO NOT request unnecessary personal or sensitive information (e.g., government identity cards, bank account passwords, or personal biometric IDs).
4. DO NOT generate repetitive, irrelevant, or redundant questions. Every step and question must be directly actionable for the specific product and claim reason.
5. Provide balanced, claim-aware evidence requests:
   - 'Damaged on arrival': Focus on close-up photographs of the damaged area, packaging punctures/dents, and basic functional check if powered.
   - 'Defective / Not functioning': Focus on symptoms, error lights/indicators, cable/battery checks, and power verification.
   - 'Wrong item received': Focus on photos of barcode/serial label, model number print, and overall item comparison without accusing customer of theft.
   - 'Missing parts or accessories': Request itemized identification of the missing piece and unboxing carton contents.
   - 'Counterfeit / Authenticity doubt': Request detailed photos of brand logos, serial numbers, seams, and packaging tags for merchant reference comparison.

RESPONSE STRUCTURE:
You must return a single JSON object strictly matching this schema:
{
  "workflow_name": "Concise, descriptive title for the workflow",
  "claim_summary": "Objective, 1-2 sentence summary of the return scenario and reported issue",
  "verification_steps": [
    {
      "step_key": "unique_snake_case_key",
      "title": "Clear step title",
      "description": "Specific instruction for customer",
      "step_type": "CAMERA" | "TEXT" | "MCQ" | "IMAGE"
    }
  ],
  "required_evidence": [
    {
      "item": "Evidence item name (e.g. Left earcup closeup)",
      "description": "Why this evidence is needed",
      "angle": "FRONT" | "BACK" | "LEFT" | "RIGHT" | "DEFECT_CLOSEUP"
    }
  ],
  "customer_questions": [
    {
      "id": "q1",
      "question": "Clear, neutral question text",
      "question_type": "TEXT" | "MULTIPLE_CHOICE" | "PHOTO" | "YES_NO",
      "options": ["Option 1", "Option 2"],  // only if MULTIPLE_CHOICE or YES_NO
      "required": true,
      "guidance": "Brief helper text"
    }
  ],
  "conditional_follow_ups": [
    {
      "trigger_condition": "e.g. If damage is not clearly visible in initial photo",
      "follow_up_question": "Targeted secondary question or request",
      "response_type": "PHOTO" | "TEXT",
      "evidence_requirement": "Specific additional photo angle or detail"
    }
  ],
  "enabled_verification_layers": {
    "cameraFirst": true,
    "aiAuthenticity": true,
    "geolocation": true,
    "carrierDelivery": true,
    "aiFollowUps": true,
    "productReference": true,
    "customQuestions": true
  },
  "merchant_review_guidance": "Clear, practical guidance for the merchant when evaluating the submitted evidence."
}
"""


class GeminiWorkflowService:
    """Service for generating intelligent refund verification workflows via Google Gemini."""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_VISION_MODEL or "gemini-flash-lite-latest"
        self._client: Optional[genai.Client] = None

    def get_client(self) -> genai.Client:
        """Obtain or initialize the Gemini client."""
        if self._client is None:
            if not self.api_key or not self.api_key.strip():
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Gemini API key is not configured. Set GEMINI_API_KEY in environment or .env.",
                )
            self._client = genai.Client(api_key=self.api_key.strip())
        return self._client

    def generate_workflow(self, req: AIGenerateWorkflowRequest) -> AIGeneratedWorkflowResponse:
        """Invoke Google Gemini to synthesize a claim-aware verification workflow."""
        client = self.get_client()

        # Build comprehensive prompt context
        currency_code = req.currency or "INR"
        amount_str = f"{currency_code} {req.refund_amount:.2f}" if req.refund_amount is not None else "Not specified"

        user_prompt = f"""Generate a targeted refund verification workflow for the following return claim:

CLAIM CONTEXT:
- Order ID: {req.order_id or 'ORD-NEW'}
- Product Name: {req.product_name}
- Product SKU: {req.product_sku or 'N/A'}
- Product Description: {req.product_description or 'Standard commercial product'}
- Requested Refund Amount: {amount_str}
- Primary Refund Reason: {req.refund_reason}
- Customer / Merchant Claim Notes: {req.claim_details or 'Customer requests return based on selected reason.'}
- Specific Evidence Requirements: {req.evidence_requirements or 'Standard photographic and functional verification.'}

Design a proportional, respectful, and thorough verification workflow tailored to this exact product and reported defect.
Return only valid JSON matching the required schema.
"""

        try:
            logger.info(
                "Invoking Gemini model '%s' for AI workflow generation (Product: %s, Reason: %s)",
                self.model_name,
                req.product_name,
                req.refund_reason,
            )

            response = client.models.generate_content(
                model=self.model_name,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=GEMINI_WORKFLOW_SYSTEM_INSTRUCTION,
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )

            if not response or not response.text:
                raise ValueError("Gemini returned an empty response.")

            parsed_data = json.loads(response.text)
            validated = AIGeneratedWorkflowResponse.model_validate(parsed_data)
            logger.info("Successfully generated AI workflow: '%s'", validated.workflow_name)
            return validated

        except json.JSONDecodeError as jde:
            logger.error("Failed to parse Gemini workflow response as JSON: %s", jde)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Gemini returned an invalid JSON structure: {str(jde)}",
            )
        except Exception as exc:
            exc_str = str(exc)
            logger.error("Gemini workflow generation failed: %s", exc_str, exc_info=True)
            if "429" in exc_str or "RESOURCE_EXHAUSTED" in exc_str:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Gemini API rate limit exceeded. Please wait a moment and try again.",
                )
            elif "401" in exc_str or "API_KEY_INVALID" in exc_str:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Invalid Gemini API key configuration.",
                )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Google Gemini AI generation service error: {exc_str}",
            )


# Singleton instance
gemini_workflow_service = GeminiWorkflowService()
