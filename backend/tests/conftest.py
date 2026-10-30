import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.main import app as fastapi_app
from app.core.database import Base, get_db
from app.models import (
    Merchant,
    Product,
    ProductReference,
    Workflow,
    WorkflowStep,
    VerificationSession,
    VerificationEvent,
    Evidence,
    EvidenceEvent,
    VisualAnalysis,
    ReasoningRun,
    EvidenceRequest,
    VerificationSignal,
    EvidenceFusionResult,
)  # ensure models are registered



# In-memory SQLite with StaticPool so all connections share the same in-memory database
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

from sqlalchemy import event

@event.listens_for(test_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.close()

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
)


import app.core.database
app.core.database.SessionLocal = TestingSessionLocal


@pytest.fixture(autouse=True)
def clean_test_db():
    """Create fresh schema for each test and drop after completion."""
    app.core.database.SessionLocal = TestingSessionLocal
    Base.metadata.create_all(bind=test_engine)
    yield
    from app.ai.ai_queue import ai_job_queue
    try:
        ai_job_queue._queue.queue.clear()
    except Exception:
        pass
    Base.metadata.drop_all(bind=test_engine)


from unittest.mock import patch

@pytest.fixture(autouse=True)
def mock_app_init_local_ai_services():
    """Prevent FastAPI TestClient lifespan from running 15-second live Ollama warmups on every test."""
    with patch("app.main.init_local_ai_services"):
        yield


@pytest.fixture(autouse=True)
def mock_ai_queue_enqueue(request):
    """Automatically patch background AI job queueing during unit tests to prevent unmocked live Ollama calls and auto-complete reference profiles when 4 references exist."""
    if "test_ai_queue_and_gating" in request.node.nodeid or "test_ai_pipeline_harness" in request.node.nodeid:
        yield
    else:
        def fake_enqueue(job):
            from app.ai.ai_queue import JobType
            if job.job_type == JobType.REFERENCE_ANALYSIS and job.product_id:
                db = TestingSessionLocal()
                try:
                    from app.models.product import Product
                    from app.models.product_reference import ProductReference
                    from app.models.product_visual_profile import ProductVisualProfile, ProductVisualProfileStatus
                    prod = db.get(Product, job.product_id)
                    if prod:
                        refs = db.query(ProductReference).filter(ProductReference.product_id == job.product_id).all()
                        if len(refs) >= 4:
                            prod.reference_processing_status = "READY"
                            prof = db.query(ProductVisualProfile).filter(ProductVisualProfile.product_id == job.product_id).first()
                            if not prof:
                                prof = ProductVisualProfile(
                                    product_id=job.product_id,
                                    qwen_model_name="qwen2.5vl:3b-q4_K_M",
                                    llama_model_name="llama3.2:1b",
                                    profile_version="v1.0-profile",
                                    reference_hashes_json={},
                                    status=ProductVisualProfileStatus.READY.value,
                                    profile_json={"mock": "profile"},
                                )
                                db.add(prof)
                            else:
                                prof.status = ProductVisualProfileStatus.READY.value
                                prof.profile_json = {"mock": "profile"}
                            db.commit()
                finally:
                    db.close()
            return job.job_id

        with patch("app.ai.ai_queue.ai_job_queue.enqueue", side_effect=fake_enqueue):
            yield


@pytest.fixture(autouse=True)
def mock_ollama_reasoning_calls(request):
    """Automatically patch live Ollama reasoning generation and fusion explanation during unit tests."""
    if "test_ai_pipeline_harness" in request.node.nodeid or "no_mock_reasoning" in request.keywords:
        yield
    else:
        from app.schemas.reasoning import ReasoningResult, ReasoningAction
        mock_result = ReasoningResult(
            action=ReasoningAction.COMPLETE_VERIFICATION,
            reasoning_summary="Mock factual synthesis summary for unit tests.",
            confidence=0.95,
        )
        with patch("app.ai.ollama_reasoning.ollama_reasoning_service.generate_reasoning", return_value=mock_result), \
             patch("app.ai.ollama_reasoning.ollama_reasoning_service.generate_fusion_explanation", return_value="Mocked AI fusion reasoning explanation for testing."):
            yield


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provide a direct database session for testing."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """TestClient fixture overriding get_db to use test database engine."""
    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()
    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as test_client:
        yield test_client
    fastapi_app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def mock_gemini_vision_default_in_tests():
    """Ensure test suite doesn't make live Gemini calls with dummy test bytes."""
    with patch("app.ai.gemini_vision.gemini_vision_service.is_available", return_value=False):
        yield

