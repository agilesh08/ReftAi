import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Check,
  RefreshCw,
  AlertCircle,
  Plus,
  Trash2,
  ShieldCheck,
  Camera,
  Layers,
  HelpCircle,
  ArrowRight,
  ChevronRight,
  Info,
} from 'lucide-react';

export function GeminiWorkflowGeneratorDialog({
  isOpen,
  onClose,
  claimContext,
  onWorkflowApplied,
  generateAiWorkflow,
  saveWorkflow,
}) {
  if (!isOpen) return null;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [workflow, setWorkflow] = useState(null);

  // Editable fields within the generated workflow
  const [workflowName, setWorkflowName] = useState('');
  const [layers, setLayers] = useState({
    cameraFirst: true,
    aiAuthenticity: true,
    geolocation: true,
    carrierDelivery: true,
    aiFollowUps: true,
    productReference: true,
    customQuestions: true,
  });
  const [questions, setQuestions] = useState([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState('TEXT');
  const [followUps, setFollowUps] = useState([]);

  // Trigger Gemini generation
  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generateAiWorkflow({
        order_id: claimContext.orderId,
        product_name: claimContext.productName,
        product_sku: claimContext.productSku,
        product_description: claimContext.productDescription,
        refund_amount: Number(claimContext.refundAmount || 0),
        currency: 'INR',
        refund_reason: claimContext.refundReason,
        claim_details: claimContext.claimDetails || claimContext.customReason,
        evidence_requirements: claimContext.evidenceRequirements,
        existing_layers: layers,
      });

      setWorkflow(data);
      setWorkflowName(data.workflow_name || 'AI-Optimized Verification Flow');
      if (data.enabled_verification_layers) {
        setLayers((prev) => ({ ...prev, ...data.enabled_verification_layers }));
      }
      setQuestions(data.customer_questions || []);
      setFollowUps(data.conditional_follow_ups || []);
    } catch (err) {
      console.error('Gemini generation error:', err);
      const msg = err.response?.data?.detail || err.message || 'Gemini AI generation failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Initial generation on first mount if no workflow yet
  React.useEffect(() => {
    if (!workflow && !loading) {
      handleGenerate();
    }
  }, []);

  const handleToggleLayer = (key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddQuestion = (e) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    setQuestions([
      ...questions,
      {
        id: `q_${Date.now()}`,
        question: newQuestionText.trim(),
        question_type: newQuestionType,
        required: true,
        options: newQuestionType === 'YES_NO' ? ['Yes', 'No'] : [],
      },
    ]);
    setNewQuestionText('');
  };

  const handleRemoveQuestion = (idx) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  // Save the workflow to SQLite backend and apply to New Session
  const handleApplyWorkflow = async () => {
    setSaving(true);
    setError(null);
    try {
      // Map questions into backend steps
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
        ...questions.map((q, idx) => ({
          step_key: `question_${idx + 1}`,
          step_type: q.question_type === 'MULTIPLE_CHOICE' ? 'MCQ' : 'TEXT',
          title: q.question,
          description: q.guidance || 'Customer evidence question',
          step_order: idx + 2,
          required: q.required !== false,
          config:
            q.question_type === 'MULTIPLE_CHOICE' && q.options?.length >= 2
              ? {
                  options: q.options.map((opt) => ({
                    value: String(opt).toLowerCase().replace(/\s+/g, '_'),
                    label: String(opt),
                  })),
                }
              : { min_length: 2, max_length: 1000 },
        })),
      ];

      const savedWf = await saveWorkflow({
        name: workflowName.trim() || 'AI Verification Workflow',
        description: workflow?.claim_summary || `Tailored verification for ${claimContext.productName}`,
        layers,
        steps,
        make_active: true,
      });

      onWorkflowApplied?.(savedWf);
      onClose();
    } catch (err) {
      console.error('Failed to save AI workflow:', err);
      const msg = err.response?.data?.detail || err.message || 'Failed to save workflow';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-appBorder overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-appBorder shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-sky-400 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-darkNeutral flex items-center gap-2">
                Gemini AI Workflow Generator
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Google Gemini
                </span>
              </h3>
              <p className="text-xs text-textSecondary">
                Claim: {claimContext.productName} • {claimContext.refundReason}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 text-textSecondary hover:text-darkNeutral rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
          {/* Loading State */}
          {loading && (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto animate-pulse">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-darkNeutral">
                  Synthesizing Verification Workflow...
                </h4>
                <p className="text-xs text-textSecondary max-w-sm mx-auto">
                  Google Gemini is analyzing the return claim parameters, product reference profile, and generating tailored verification rules.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <span className="font-bold block text-rose-900">AI Generation Failed</span>
                <p className="leading-relaxed">{error}</p>
                <button
                  onClick={handleGenerate}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Generation
                </button>
              </div>
            </div>
          )}

          {/* Generated Workflow Content */}
          {!loading && workflow && (
            <div className="space-y-5">
              {/* Claim Summary Card */}
              <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-200/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
                  <Info className="w-4 h-4 text-primary" />
                  <span>AI Claim Synthesis</span>
                </div>
                <p className="text-xs text-sky-950 leading-relaxed font-medium">
                  {workflow.claim_summary}
                </p>
                {workflow.merchant_review_guidance && (
                  <p className="text-[11px] text-sky-800/90 pt-1 border-t border-sky-200/60 leading-relaxed">
                    <span className="font-bold">Review Advice:</span> {workflow.merchant_review_guidance}
                  </p>
                )}
              </div>

              {/* Workflow Name Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-darkNeutral">
                  Workflow Name
                </label>
                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-darkNeutral focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* 7 Verification Security Layers */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-darkNeutral">
                  Enabled Security Layers
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'cameraFirst', label: '1. Camera-First Live Capture' },
                    { key: 'aiAuthenticity', label: '2. AI Authenticity & Screen Detection' },
                    { key: 'geolocation', label: '3. Geolocation Telemetry Match' },
                    { key: 'carrierDelivery', label: '4. Carrier Delivery Confirmation' },
                    { key: 'aiFollowUps', label: '5. Dynamic AI Follow-Up Questions' },
                    { key: 'productReference', label: '6. 4-Angle Reference Comparison' },
                    { key: 'customQuestions', label: '7. Merchant Verification Form' },
                  ].map((layer) => (
                    <label
                      key={layer.key}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        layers[layer.key]
                          ? 'bg-primary/5 border-primary/30 text-darkNeutral font-medium'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <span className="text-xs">{layer.label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(layers[layer.key])}
                        onChange={() => handleToggleLayer(layer.key)}
                        className="rounded text-primary focus:ring-primary h-4 w-4"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Customer Questions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-darkNeutral">
                    Customer Evidence Questions ({questions.length})
                  </label>
                  <span className="text-[11px] text-textSecondary">
                    Add, edit, or remove questions
                  </span>
                </div>

                <div className="space-y-2">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">Q{idx + 1}:</span>
                          <span className="text-darkNeutral font-medium">{q.question}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-textSecondary">
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 font-bold uppercase">
                            {q.question_type}
                          </span>
                          {q.options?.length > 0 && (
                            <span>Options: {q.options.join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                        title="Remove Question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Custom Question Form */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add a custom claim question..."
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <select
                    value={newQuestionType}
                    onChange={(e) => setNewQuestionType(e.target.value)}
                    className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                  >
                    <option value="TEXT">Text</option>
                    <option value="YES_NO">Yes / No</option>
                    <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                    <option value="PHOTO">Photo</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-darkNeutral rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Conditional Follow-Ups Preview */}
              {followUps.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-darkNeutral">
                    Adaptive AI Follow-Up Triggers
                  </label>
                  <div className="space-y-2">
                    {followUps.map((fu, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-xs space-y-1"
                      >
                        <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                          <ChevronRight className="w-3 h-3 text-amber-600" />
                          <span>Condition: {fu.trigger_condition}</span>
                        </div>
                        <p className="text-amber-950 pl-4">{fu.follow_up_question}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="pt-4 border-t border-appBorder flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Regenerate with Gemini</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApplyWorkflow}
              disabled={loading || saving || !workflow}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving to SQLite...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Apply & Save Workflow</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
