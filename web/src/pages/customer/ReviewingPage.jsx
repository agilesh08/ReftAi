import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Clock,
  Sparkles,
  Cpu,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useCustomerFlow } from '../../context/CustomerFlowContext';
import { CustomerHeader } from '../../components/common/CustomerHeader';
import { DynamicAiFollowUpSheet } from '../../components/customer/DynamicAiFollowUpSheet';

const STAGES = [
  { id: 'UPLOADING', label: 'Uploading Evidence', icon: UploadCloud, description: 'Encrypting and transferring high-resolution camera frames...' },
  { id: 'QUEUED', label: 'Queued for Verification', icon: Clock, description: 'Allocating vision inspection cluster...' },
  { id: 'VISUAL_ANALYSIS', label: 'Visual Analysis', icon: Sparkles, description: 'Comparing damage angles against canonical reference baseline...' },
  { id: 'REASONING', label: 'Reasoning Synthesis', icon: Cpu, description: 'Synthesizing damage topology with telemetry signals...' },
  { id: 'COMPLETE', label: 'Verification Complete', icon: CheckCircle2, description: 'Dossier generated and transmitted to merchant.' },
];

export function ReviewingPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { session, completeVerification } = useCustomerFlow();

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [hasAnsweredFollowUp, setHasAnsweredFollowUp] = useState(false);

  useEffect(() => {
    // Stage 0: Uploading (0 - 1.5s)
    const t0 = setTimeout(() => {
      setCurrentStageIndex(1); // QUEUED
    }, 1500);

    // Stage 1: Queued (1.5s - 3s)
    const t1 = setTimeout(() => {
      setCurrentStageIndex(2); // VISUAL_ANALYSIS
    }, 3000);

    // Stage 2: Trigger AI Follow-up at 4.5s
    const t2 = setTimeout(() => {
      setShowFollowUp(true);
    }, 4500);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // When customer answers the dynamic AI follow-up
  const handleFollowUpSubmit = async (answer) => {
    setShowFollowUp(false);
    setHasAnsweredFollowUp(true);

    // Advance to REASONING
    setCurrentStageIndex(3);

    // Advance to COMPLETE after 2 seconds
    setTimeout(() => {
      setCurrentStageIndex(4);
      // Finalize verification session in store
      completeVerification();

      // Navigate to completed page
      setTimeout(() => {
        navigate(`/verify/${token}/completed`);
      }, 1200);
    }, 2000);
  };

  const currentStage = STAGES[currentStageIndex];

  return (
    <div className="min-h-screen bg-appBg flex flex-col justify-between">
      <CustomerHeader orderId={session?.orderId} />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col justify-center">
        <div className="bg-white rounded-3xl border border-appBorder shadow-sm p-6 sm:p-10 text-center space-y-8">
          {/* Main Animated Icon */}
          <div className="relative inline-flex items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center ring-8 ring-primary/5 animate-pulse">
              <currentStage.icon className="w-10 h-10" />
            </div>
            {currentStageIndex < 4 && (
              <div className="absolute -inset-1 rounded-3xl border-2 border-primary border-t-transparent animate-spin" />
            )}
          </div>

          {/* Current Stage Label */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
              STAGE {currentStageIndex + 1} OF 5
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-darkNeutral">
              {currentStage.label}
            </h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {currentStage.description}
            </p>
          </div>

          {/* Progress Tracker Steps */}
          <div className="space-y-4 max-w-sm mx-auto text-left">
            {STAGES.map((st, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const isUpcoming = idx > currentStageIndex;

              return (
                <div key={st.id} className="flex items-center gap-3 text-xs">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                      isPast
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-primary text-white ring-2 ring-primary/30'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span
                    className={`font-semibold ${
                      isPast
                        ? 'text-emerald-700'
                        : isCurrent
                        ? 'text-darkNeutral font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {st.label}
                  </span>
                  {isCurrent && (
                    <div className="ml-auto w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Educational Note */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span>Simulated development response for upcoming backend integration</span>
          </div>
        </div>
      </main>

      {/* Dynamic AI Follow-up Bottom Sheet */}
      <DynamicAiFollowUpSheet
        isOpen={showFollowUp}
        question="Our visual analysis detected significant glare on the lower bezel. Could you clarify if the hairline crack extends into the active OLED display when powered on?"
        options={[
          'Yes, the display lines bleed into the active OLED screen.',
          'No, only the outer glass bezel is cracked.',
          'The device will not power on at all.',
        ]}
        onSubmit={handleFollowUpSubmit}
      />
    </div>
  );
}
