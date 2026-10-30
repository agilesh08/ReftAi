"""Workflow lifecycle management, graph validation, and publishing services."""
import logging
from typing import List, Any
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.workflow import Workflow, WorkflowStatus
from app.schemas.workflow import (
    WorkflowCreateRequest,
    WorkflowUpdateRequest,
)
from app.services.workflow_step_service import validate_step_config

logger = logging.getLogger(__name__)


def create_workflow(
    db: Session,
    merchant_id: str,
    data: WorkflowCreateRequest,
) -> Workflow:
    """Create a new verification workflow in DRAFT state."""
    workflow = Workflow(
        merchant_id=merchant_id,
        name=data.name,
        description=data.description,
        status=WorkflowStatus.DRAFT.value,
        is_active=False,
        version=1,
    )
    db.add(workflow)
    db.commit()
    db.refresh(workflow)
    logger.info("Created workflow %s ('%s') for merchant %s", workflow.id, workflow.name, merchant_id)
    return workflow


def list_merchant_workflows(db: Session, merchant_id: str) -> List[Workflow]:
    """List all workflows owned by the authenticated merchant with steps loaded."""
    return list(
        db.execute(
            select(Workflow)
            .options(selectinload(Workflow.steps))
            .where(Workflow.merchant_id == merchant_id)
            .order_by(Workflow.created_at.desc())
        ).scalars().all()
    )


def get_merchant_workflow(db: Session, merchant_id: str, workflow_id: str) -> Workflow:
    """Retrieve an owned workflow by ID with steps loaded.
    
    Returns HTTP 404 if the workflow does not exist or belongs to another merchant.
    """
    workflow = db.execute(
        select(Workflow)
        .options(selectinload(Workflow.steps))
        .where(
            Workflow.id == workflow_id,
            Workflow.merchant_id == merchant_id,
        )
    ).scalar_one_or_none()

    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )
    return workflow


def update_merchant_workflow(
    db: Session,
    merchant_id: str,
    workflow_id: str,
    data: WorkflowUpdateRequest,
) -> Workflow:
    """Update workflow name or description."""
    workflow = get_merchant_workflow(db, merchant_id, workflow_id)

    if data.name is not None:
        workflow.name = data.name

    if data.description is not None:
        workflow.description = data.description

    db.commit()
    db.refresh(workflow)
    logger.info("Updated workflow %s for merchant %s", workflow_id, merchant_id)
    return workflow


def delete_merchant_workflow(db: Session, merchant_id: str, workflow_id: str) -> None:
    """Delete a draft or archived workflow.
    
    Active workflows cannot be deleted without first archiving.
    """
    workflow = get_merchant_workflow(db, merchant_id, workflow_id)

    if workflow.status == WorkflowStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Active workflows cannot be deleted. Archive the workflow first.",
        )

    db.delete(workflow)
    db.commit()
    logger.info("Deleted workflow %s for merchant %s", workflow_id, merchant_id)


def publish_workflow(db: Session, merchant_id: str, workflow_id: str) -> Workflow:
    """Validate workflow steps, configuration, and graph integrity, transitioning to ACTIVE."""
    workflow = get_merchant_workflow(db, merchant_id, workflow_id)

    if workflow.status == WorkflowStatus.ARCHIVED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archived workflows cannot be republished. Create a new workflow draft instead.",
        )

    # 1. Non-empty check
    if not workflow.steps or len(workflow.steps) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Workflow must have at least one step before it can be published",
        )

    # 2. Key uniqueness check
    all_keys = {s.step_key for s in workflow.steps}
    if len(all_keys) != len(workflow.steps):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Workflow contains duplicate step keys",
        )

    # 3. Individual step config & branching graph validation
    for step in workflow.steps:
        config = step.config_json or {}
        validate_step_config(step.step_type, config, step.step_key)

        # Validate conditional references point only to steps within this workflow
        conditions = config.get("conditions") or []
        for idx, cond in enumerate(conditions):
            when = cond.get("when", {})
            cond_key = when.get("step_key")
            next_step = cond.get("next_step")

            if cond_key not in all_keys:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"Step '{step.step_key}' condition references unknown step '{cond_key}'",
                )
            if next_step not in all_keys:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"Step '{step.step_key}' branch targets unknown next_step '{next_step}'",
                )
            if next_step == step.step_key:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"Step '{step.step_key}' cannot branch to itself (self-loop)",
                )

        default_next = config.get("default_next_step")
        if default_next:
            if default_next not in all_keys:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"Step '{step.step_key}' default_next_step targets unknown step '{default_next}'",
                )
            if default_next == step.step_key:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"Step '{step.step_key}' default_next_step cannot target itself (self-loop)",
                )

    # Transition to ACTIVE
    workflow.status = WorkflowStatus.ACTIVE.value
    workflow.is_active = True
    db.commit()
    db.refresh(workflow)
    logger.info("Published workflow %s to ACTIVE status", workflow.id)
    return workflow


def archive_workflow(db: Session, merchant_id: str, workflow_id: str) -> Workflow:
    """Archive an existing workflow, retiring it from future session creation."""
    workflow = get_merchant_workflow(db, merchant_id, workflow_id)

    workflow.status = WorkflowStatus.ARCHIVED.value
    workflow.is_active = False
    db.commit()
    db.refresh(workflow)
    logger.info("Archived workflow %s", workflow.id)
    return workflow


def activate_merchant_workflow(db: Session, merchant_id: str, workflow_id: str) -> Workflow:
    """Mark the specified workflow as active for this merchant and deactivate any others."""
    workflow = get_merchant_workflow(db, merchant_id, workflow_id)

    # Deactivate other active workflows for this merchant
    other_workflows = db.scalars(
        select(Workflow).where(
            Workflow.merchant_id == merchant_id,
            Workflow.id != workflow_id,
            Workflow.is_active == True,
        )
    ).all()
    for w in other_workflows:
        w.is_active = False

    workflow.status = WorkflowStatus.ACTIVE.value
    workflow.is_active = True
    db.commit()
    db.refresh(workflow)
    logger.info("Activated workflow %s for merchant %s", workflow.id, merchant_id)
    return workflow


def save_full_workflow(
    db: Session,
    merchant_id: str,
    data: Any,
) -> Workflow:
    """Atomically save or update a full workflow including its verification layers and steps."""
    from app.models.workflow_step import WorkflowStep, WorkflowStepType

    workflow = None
    if data.workflow_id:
        try:
            workflow = get_merchant_workflow(db, merchant_id, data.workflow_id)
            workflow.name = data.name.strip()
            workflow.description = data.description.strip() if data.description else None
            # Clear old steps to replace with updated configuration
            for step in list(workflow.steps):
                db.delete(step)
            db.flush()
        except HTTPException:
            workflow = None

    if not workflow:
        # Check by name to avoid duplicate workflows on repeated saves
        existing = db.scalars(
            select(Workflow).where(
                Workflow.merchant_id == merchant_id,
                Workflow.name == data.name.strip(),
            )
        ).first()
        if existing:
            workflow = existing
            workflow.description = data.description.strip() if data.description else None
            for step in list(workflow.steps):
                db.delete(step)
            db.flush()
        else:
            workflow = Workflow(
                merchant_id=merchant_id,
                name=data.name.strip(),
                description=data.description.strip() if data.description else None,
                status=WorkflowStatus.DRAFT.value,
            )
            db.add(workflow)
            db.flush()

    # Create steps
    if not data.steps:
        # Provide canonical default 3-step sequence
        default_steps = [
            WorkflowStep(
                workflow_id=workflow.id,
                step_key="camera_evidence",
                step_type=WorkflowStepType.CAMERA.value,
                title="Capture Live Damage Evidence",
                description="Live device camera capture showing physical damage or defect.",
                step_order=1,
                required=True,
                config_json={"min_images": 1, "max_images": 4, "layers": data.layers},
            ),
            WorkflowStep(
                workflow_id=workflow.id,
                step_key="packaging_condition",
                step_type=WorkflowStepType.MCQ.value,
                title="Delivery Packaging Condition",
                description="State of outer shipping box upon delivery.",
                step_order=2,
                required=True,
                config_json={
                    "options": [
                        {"value": "intact", "label": "Completely Intact & Sealed"},
                        {"value": "damaged", "label": "Torn / Crushed / Punctured"},
                        {"value": "opened", "label": "Opened or Resealed"},
                    ]
                },
            ),
            WorkflowStep(
                workflow_id=workflow.id,
                step_key="issue_explanation",
                step_type=WorkflowStepType.TEXT.value,
                title="Detailed Defect Explanation",
                description="Describe the problem, when it was noticed, and operating state.",
                step_order=3,
                required=True,
                config_json={"min_length": 10, "max_length": 1500},
            ),
        ]
        for s in default_steps:
            db.add(s)
    else:
        for idx, s_req in enumerate(data.steps, start=1):
            cfg = dict(s_req.config or {})
            if idx == 1 and data.layers:
                cfg["layers"] = data.layers
            step_type_val = s_req.step_type.value if hasattr(s_req.step_type, "value") else str(s_req.step_type)
            step = WorkflowStep(
                workflow_id=workflow.id,
                step_key=s_req.step_key,
                step_type=step_type_val,
                title=s_req.title,
                description=s_req.description,
                step_order=s_req.step_order or idx,
                required=s_req.required,
                config_json=cfg,
            )
            db.add(step)

    db.flush()

    if data.make_active:
        other_workflows = db.scalars(
            select(Workflow).where(
                Workflow.merchant_id == merchant_id,
                Workflow.id != workflow.id,
                Workflow.is_active == True,
            )
        ).all()
        for w in other_workflows:
            w.is_active = False

        workflow.status = WorkflowStatus.ACTIVE.value
        workflow.is_active = True

    db.commit()
    db.refresh(workflow)
    logger.info("Saved full workflow %s with active status %s", workflow.id, workflow.is_active)
    return workflow
