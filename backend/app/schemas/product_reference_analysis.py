"""Pydantic schemas for merchant reference image analysis and consolidated product visual profile."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, AliasChoices


class ReferenceImageVisualMetadata(BaseModel):
    """Structured visual characteristics extracted from a single merchant product reference image."""
    product_id: Optional[str] = Field(None, description="Product ID")
    reference_angle: Optional[str] = Field(None, description="FRONT, BACK, LEFT, RIGHT")
    product_category: str = Field(..., description="Observed product category (e.g. Headphones, Smartphone, Footwear)")
    brand: Optional[str] = Field(None, description="Observed or inferred brand name")
    model: Optional[str] = Field(None, description="Observed or inferred model designation/number")
    main_object_description: Optional[str] = Field(
        None,
        description="Clear concise summary of what item is visible",
        validation_alias=AliasChoices("main_object_description", "visible_product_identity"),
    )
    visible_product_identity: Optional[str] = Field(
        None,
        description="Alias for main_object_description",
        validation_alias=AliasChoices("visible_product_identity", "main_object_description"),
    )
    shape_and_geometry: Optional[str] = Field(
        None,
        description="Geometric shape and silhouette characteristics",
        validation_alias=AliasChoices("shape_and_geometry", "shape"),
    )
    shape: Optional[str] = Field(
        None,
        description="Alias for shape_and_geometry",
        validation_alias=AliasChoices("shape", "shape_and_geometry"),
    )
    dimensions_proportions: str = Field("unclear", description="Visually inferable proportions or estimated dimensions")
    color_and_finish: Optional[str] = Field(
        None,
        description="Primary and secondary colors and surface finish",
        validation_alias=AliasChoices("color_and_finish", "color"),
    )
    color: Optional[str] = Field(
        None,
        description="Alias for color_and_finish",
        validation_alias=AliasChoices("color", "color_and_finish"),
    )
    materials_and_textures: Optional[str] = Field(
        None,
        description="Primary materials and surface textures",
        validation_alias=AliasChoices("materials_and_textures", "material"),
    )
    material: Optional[str] = Field(
        None,
        description="Alias for materials_and_textures",
        validation_alias=AliasChoices("material", "materials_and_textures"),
    )
    texture_finish: str = Field("unclear", description="Surface texture and finish (matte, glossy, brushed, textured, etc.)")
    distinctive_physical_features: List[str] = Field(
        default_factory=list,
        description="Unique design elements, hinges, seams, joints, curves",
        validation_alias=AliasChoices("distinctive_physical_features", "distinctive_features"),
    )
    distinctive_features: List[str] = Field(
        default_factory=list,
        description="Alias for distinctive_physical_features",
        validation_alias=AliasChoices("distinctive_features", "distinctive_physical_features"),
    )
    visible_buttons_ports_labels: List[str] = Field(
        default_factory=list,
        description="Visible buttons, charging ports, LEDs, grilles, connectors, labels",
        validation_alias=AliasChoices("visible_buttons_ports_labels", "buttons_ports_components"),
    )
    buttons_ports_components: List[str] = Field(
        default_factory=list,
        description="Alias for visible_buttons_ports_labels",
        validation_alias=AliasChoices("buttons_ports_components", "visible_buttons_ports_labels"),
    )
    component_placement: Optional[str] = Field(None, description="Spatial layout and placement of buttons/ports/modules")
    logos_markings: List[str] = Field(default_factory=list, description="Visible logos, brand emblems, text, regulatory badges, labels")
    visible_text: List[str] = Field(default_factory=list, description="Any readable text printed on product or serial labels")
    packaging_characteristics: Optional[str] = Field(None, description="Packaging box, seals, or tags visible in image")
    expected_physical_condition: str = Field(
        "NEW",
        description="Expected condition of item in reference photo (NEW, PRISTINE, LIGHT_WEAR)",
        validation_alias=AliasChoices("expected_physical_condition", "physical_condition"),
    )
    physical_condition: str = Field(
        "NEW",
        description="Alias for expected_physical_condition",
        validation_alias=AliasChoices("physical_condition", "expected_physical_condition"),
    )
    orientation_angle: str = Field("FRONT", description="FRONT, BACK, LEFT, RIGHT, OBLIQUE")
    angle_specific_characteristics: Optional[str] = Field(None, description="Visual characteristics unique to this angle")
    important_landmarks: List[str] = Field(default_factory=list, description="Key visual landmarks for cross-angle comparison")
    image_quality: str = Field("GOOD", description="Quality of reference photo (EXCELLENT, GOOD, ACCEPTABLE, LOW_RES)")
    occlusions: List[str] = Field(default_factory=list, description="Any areas occluded or out of frame")
    uncertainties: List[str] = Field(default_factory=list, description="Visual details that cannot be determined from this angle")
    model_name: Optional[str] = Field(None, description="Gemini model name used for analysis")
    analysis_timestamp: Optional[str] = Field(None, description="Timestamp of visual metadata extraction")
    processing_status: str = Field("COMPLETED", description="COMPLETED, FAILED, or PENDING")
    metadata_schema_version: str = Field("v2.0", description="Metadata schema version")


class ProductReferenceAnalysisResult(BaseModel):
    """Structured result payload for single reference image analysis."""
    angle: str = Field(..., description="Canonical reference angle (FRONT, BACK, LEFT, RIGHT)")
    metadata: ReferenceImageVisualMetadata
    summary: str = Field(..., description="Factual concise synthesis of reference image observations")
    confidence: float = Field(default=0.95, ge=0.0, le=1.0)


class ProductVisualProfileResult(BaseModel):
    """Canonical Product Visual Profile consolidated by Llama 3.2 1B from 4 Qwen reference observations."""
    canonical_product_name: str = Field(..., description="Official canonical product name")
    brand: str = Field("Unspecified", description="Consolidated brand name")
    model: str = Field("Unspecified", description="Consolidated model designation")
    category: str = Field(..., description="Consolidated product category")
    primary_colors: List[str] = Field(default_factory=list, description="All primary colors across reference angles")
    materials_finish: List[str] = Field(default_factory=list, description="Materials and surface finishes observed")
    key_design_features: List[str] = Field(default_factory=list, description="Key design features across all angles")
    angle_specific_expectations: Dict[str, str] = Field(
        default_factory=dict,
        description="Expected visual appearance mapped by angle (FRONT, BACK, LEFT, RIGHT)",
    )
    visible_identifiers_and_text: List[str] = Field(
        default_factory=list,
        description="Logos, serial numbers, regulatory marks across all angles",
    )
    distinguishing_landmarks: List[str] = Field(
        default_factory=list,
        description="Landmarks for forensic visual comparison against customer evidence",
    )
    packaging_characteristics: Optional[str] = Field(None, description="Packaging details if present")
    known_limitations_uncertainties: List[str] = Field(
        default_factory=list,
        description="Any details not visible from the 4 reference angles",
    )
    provenance_summary: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Feature provenance mapping showing which angle established each feature",
    )
