import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Layers,
  Plus,
  ShieldCheck,
  Camera,
  MapPin,
  Clock,
  Sparkles,
  HelpCircle,
  Check,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useMerchant } from '../../context/MerchantContext';
import { MerchantHeader } from '../../components/common/MerchantHeader';

export function WorkflowBuilderPage() {
  const navigate = useNavigate();
  const { workflows, saveWorkflow, activateWorkflow } = useMerchant();

  const activeWf = workflows.find((w) => w.is_active || w.status === 'ACTIVE') || workflows[0] || null;
  const [selectedWorkflow, setSelectedWorkflow] = useState(activeWf);

  const [layers, setLayers] = useState({
    cameraFirst: true,
    aiAuthenticity: true,
    geolocation: true,
    carrierDelivery: true,
    aiFollowUps: true,
    productReference: true,
    customQuestions: true,
  });

  const [customQuestions, setCustomQuestions] = useState([
    'Was the packaging torn or punctured when delivered?',
    'Are all original cables, accessories, and manual sheets included?',
  ]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Sync selectedWorkflow when workflows array loads from backend
  useEffect(() => {
    if (!selectedWorkflow && workflows.length > 0) {
      const active = workflows.find((w) => w.is_active || w.status === 'ACTIVE') || workflows[0];
      setSelectedWorkflow(active);
    }
  }, [workflows, selectedWorkflow]);

  // Load configuration from selectedWorkflow steps when changed
  useEffect(() => {
    if (selectedWorkflow?.steps?.length > 0) {
      const camStep = selectedWorkflow.steps.find(
        (s) => s.step_type === 'CAMERA' || s.step_key === 'camera_evidence'
      );
      if (camStep?.config?.layers) {
        setLayers((prev) => ({ ...prev, ...camStep.config.layers }));
      }
      const qSteps = selectedWorkflow.steps.filter(
        (s) => (s.step_type === 'MCQ' || s.step_type === 'TEXT') && s.step_key !== 'camera_evidence'
      );
      if (qSteps.length > 0) {
        setCustomQuestions(qSteps.map((s) => s.title));
      }
    }
  }, [selectedWorkflow]);

  const handleToggle = (key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddQuestion = (e) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    setCustomQuestions([...customQuestions, newQuestionText.trim()]);
    setNewQuestionText('');
  };

  const handleRemoveQuestion = (idx) => {
    setCustomQuestions(customQuestions.filter((_, i) => i !== idx));
  };

  // Real persistence to SQLite backend
  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const steps = [
        {
          step_key: 'camera_evidence',
          step_type: 'CAMERA',
          title: 'Capture Live Damage Evidence',
          description: 'Live device camera capture showing physical damage or defect.',
          step_order: 1,
          required: true,
          config: { min_images: 1, max_images: 4, layers },
        },
        ...customQuestions.map((qText, idx) => ({
          step_key: `question_${idx + 1}`,
          step_type: 'TEXT',
          title: qText,
          description: 'Customer evidence questionnaire',
          step_order: idx + 2,
          required: true,
          config: { min_length: 2, max_length: 1000 },
        })),
      ];

      const saved = await saveWorkflow({
        workflow_id: selectedWorkflow?.id,
        name: selectedWorkflow?.name || 'Standard 7-Layer Verification',
        description: selectedWorkflow?.description || 'Active return verification workflow',
        layers,
        steps,
        make_active: true,
      });

      setSelectedWorkflow(saved);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save workflow:', err);
      setSaveError(err.response?.data?.detail || err.message || 'Failed to save workflow rules');
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivate = async (wf) => {
    try {
      const act = await activateWorkflow(wf.id);
      setSelectedWorkflow(act);
    } catch (err) {
      console.error('Failed to activate workflow:', err);
    }
  };

  return (
    <div className="min-h-screen bg-appBg flex flex-col">
      <MerchantHeader
        title="Workflow & Verification Layers"
        subtitle="Configure return verification scenarios and security layers"
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving to SQLite...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Workflow Saved & Active</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Workflow Rules</span>
              </>
            )}
          </button>
        </div>

        {/* Notifications */}
        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">
              Workflow successfully persisted in SQLite database and marked as Active.
            </span>
          </div>
        )}

        {saveError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Workflow Template Selector */}
        <div className="bg-white p-5 rounded-2xl border border-appBorder shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-darkNeutral uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              1. Verification Workflow Templates
            </h2>
            <span className="text-[11px] text-textSecondary">
              {workflows.length} Persisted Templates
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {workflows.length === 0 ? (
              <div className="col-span-full p-6 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
                <p className="text-xs text-slate-600 font-medium">
                  Standard 7-layer verification rules are ready to configure.
                </p>
                <p className="text-[11px] text-slate-400">
                  Click 'Save Workflow Rules' above to persist your primary active workflow to SQLite.
                </p>
              </div>
            ) : (
              workflows.map((wf) => {
                const isActive = wf.is_active || wf.status === 'ACTIVE';
                const isSelected = selectedWorkflow?.id === wf.id;

                return (
                  <div
                    key={wf.id}
                    onClick={() => setSelectedWorkflow(wf)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-xs text-darkNeutral truncate">{wf.name}</span>
                      {isActive && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {wf.description || 'Standard multi-layer evidence flow with AI screening'}
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{wf.steps?.length || 3} verification steps</span>
                      {!isActive && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivate(wf);
                          }}
                          className="font-bold text-primary hover:underline cursor-pointer"
                        >
                          Set as Active
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 7 Verification Security Layers */}
        <div className="bg-white p-6 rounded-2xl border border-appBorder shadow-sm space-y-6">
          <div className="border-b border-appBorder pb-3">
            <h2 className="text-sm font-bold text-darkNeutral flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              2. Active Verification Layers
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enable or adjust security layers applied to incoming customer claims
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Layer 1: Camera-First Evidence */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200 text-primary">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-darkNeutral block">
                    1. Camera-First Evidence Submission
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Requires direct device camera capture to eliminate recycled album images.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={layers.cameraFirst}
                onChange={() => handleToggle('cameraFirst')}
                className="mt-1 h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Layer 2: Image Authenticity */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200 text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-darkNeutral block">
                    2. AI Authenticity Screening
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Detects digital screen moiré patterns, AI generation artifacts, and EXIF edits.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={layers.aiAuthenticity}
                onChange={() => handleToggle('aiAuthenticity')}
                className="mt-1 h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Layer 3: Geolocation */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200 text-primary">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-darkNeutral block">
                    3. Geolocation Proximity Check
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Validates submitter device coordinates against the delivery destination address.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={layers.geolocation}
                onChange={() => handleToggle('geolocation')}
                className="mt-1 h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Layer 4: Courier API */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200 text-primary">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-darkNeutral block">
                    4. Carrier Delivery Confirmation
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Cross-references carrier delivery timestamps and signed POD events.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={layers.carrierDelivery}
                onChange={() => handleToggle('carrierDelivery')}
                className="mt-1 h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Layer 5: Dynamic AI Follow-Ups */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200 text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-darkNeutral block">
                    5. Dynamic AI Follow-Up Questions
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Generates adaptive contextual questions when damage is ambiguous or obscured.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={layers.aiFollowUps}
                onChange={() => handleToggle('aiFollowUps')}
                className="mt-1 h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Layer 6: Product Reference Matching */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200 text-primary">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-darkNeutral block">
                    6. 4-Angle Reference Matching
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Compares customer item against registered canonical Front, Back, Left, Right profiles.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={layers.productReference}
                onChange={() => handleToggle('productReference')}
                className="mt-1 h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Custom Questionnaire Section */}
        <div className="bg-white p-6 rounded-2xl border border-appBorder shadow-sm space-y-4">
          <div className="border-b border-appBorder pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-darkNeutral flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary" />
                3. Customer Evidence Questionnaire
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Questions asked to customers during the verification session
              </p>
            </div>
            <span className="text-xs font-bold text-primary">
              {customQuestions.length} Questions
            </span>
          </div>

          <div className="space-y-2.5">
            {customQuestions.map((q, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-primary text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="text-slate-800 font-medium">{q}</span>
                </div>
                <button
                  onClick={() => handleRemoveQuestion(idx)}
                  className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Question Form */}
          <form onSubmit={handleAddQuestion} className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Type a new customer verification question..."
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Question
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
