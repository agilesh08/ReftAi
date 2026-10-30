import React, { useState } from 'react';
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
} from 'lucide-react';
import { useMerchant } from '../../context/MerchantContext';
import { MerchantHeader } from '../../components/common/MerchantHeader';

export function WorkflowBuilderPage() {
  const navigate = useNavigate();
  const { workflows } = useMerchant();

  const [selectedWorkflow, setSelectedWorkflow] = useState(workflows[0] || null);

  // Workflow layer toggles for the currently selected workflow
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
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </button>

          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Configuration Saved</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Workflow Rules</span>
              </>
            )}
          </button>
        </div>

        {/* Workflow Template Selector */}
        <div className="bg-white p-5 rounded-2xl border border-appBorder shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-darkNeutral uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            1. Select Active Workflow Template
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {workflows.map((wf) => (
              <button
                key={wf.id}
                onClick={() => setSelectedWorkflow(wf)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedWorkflow?.id === wf.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-xs text-darkNeutral">{wf.name}</div>
                <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                  {wf.description || 'Standard multi-layer evidence flow with AI screening'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 7 Verification Security Layers */}
        <div className="bg-white p-6 rounded-2xl border border-appBorder shadow-sm space-y-6">
          <div className="border-b border-appBorder pb-3">
            <h2 className="text-sm font-bold text-darkNeutral flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              2. Verification Layers Configuration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enable or adjust verification layers applied to incoming customer claims
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
                    4. Delivery Window Validation
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Cross-references carrier scan timestamps to verify package arrival window.
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
                    5. Dynamic AI Follow-Up Inquiries
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Generates autonomous contextual prompts if initial evidence is ambiguous.
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

            {/* Layer 6: Product Reference Gating */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200 text-primary">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-darkNeutral block">
                    6. 4-Angle Reference Comparison
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Compares customer images against canonical baseline (Front, Back, Left, Right).
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

        {/* Layer 7: Merchant-Defined Evidence Questions */}
        <div className="bg-white p-6 rounded-2xl border border-appBorder shadow-sm space-y-4">
          <div className="border-b border-appBorder pb-3">
            <h2 className="text-sm font-bold text-darkNeutral flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              7. Merchant-Defined Evidence Questions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              These custom questions will be presented directly to the customer during step 1 of verification
            </p>
          </div>

          <div className="space-y-2">
            {customQuestions.map((q, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              >
                <span className="text-slate-800 font-medium">
                  {idx + 1}. {q}
                </span>
                <button
                  onClick={() => handleRemoveQuestion(idx)}
                  className="text-slate-400 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddQuestion} className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Add a new custom question for the customer..."
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
            >
              Add Question
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
