"""Pydantic schemas for Gemini-powered customer verification reasoning and visual consistency assessment."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ClaimUnderstanding(BaseModel):
    """Gemini's structured comprehension of the customer's stated claim."""
    reported_issue: str = Field(..., description="Reported customer issue, damage, or defect")
    product_identified: str = Field(..., description="Product identified from image and metadata")
    claim_summary: str = Field(..., description="Concise summary of the customer's claim")


class CustomerVisualAnalysis(BaseModel):
    """Detailed visual findings comparing customer evidence against stored reference metadata."""
    visible_damage: List[str] = Field(default_factory=list, description="Observed visible physical damage, cracks, breaks, or defects")
    product_characteristics: List[str] = Field(default_factory=list, description="Observed visual characteristics (materials, branding, geometry)")
    reference_consistency: str = Field("CONSISTENT", description="CONSISTENT, INCONSISTENT, UNCERTAIN, or NOT_APPLICABLE")
    image_quality: str = Field("GOOD", description="GOOD, ACCEPTABLE, POOR, or INSUFFICIENT")
    uncertainties: List[str] = Field(default_factory=list, description="Visual limitations, occluded angles, or ambiguous areas")


class EvidenceAssessment(BaseModel):
    """Evaluates whether submitted evidence supports the claim and notes gaps."""
    supports_claim: Optional[bool] = Field(None, description="True if evidence supports claim, False if refuting, None if inconclusive")
    missing_evidence: List[str] = Field(default_factory=list, description="Required angles, serial numbers, or packaging not visible")
    inconsistencies: List[str] = Field(default_factory=list, description="Any visual or contextual contradictions detected")


class DynamicFollowUpQuestion(BaseModel):
    """Targeted follow-up question dynamically generated to resolve claim ambiguities."""
    question: str = Field(..., description="The direct question to ask the customer")
    question_type: str = Field("PHOTO", description="PHOTO, MCQ, or TEXT")
    reason: str = Field(..., description="Forensic reason explaining why this clarification is needed")
    trigger_condition: Optional[str] = Field("", description="Trigger condition for this follow-up")
    options: Optional[List[str]] = Field(default_factory=list, description="Selectable options if MCQ question_type")


class GeminiVerificationAssessment(BaseModel):
    """Structured Gemini response schema for customer verification against stored product metadata."""
    claim_understanding: ClaimUnderstanding
    visual_analysis: CustomerVisualAnalysis
    evidence_assessment: EvidenceAssessment
    follow_up_questions: List[DynamicFollowUpQuestion] = Field(default_factory=list)
    machine_assessment: str = Field(
        "REVIEW_REQUIRED",
        description="EVIDENCE_CONSISTENT, REVIEW_REQUIRED, or INCONSISTENCY_DETECTED",
    )
    reasoning_summary: str = Field(..., description="Objective, non-accusatory reasoning synthesis for merchant review")
