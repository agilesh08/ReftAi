import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Clock,
  Sparkles,
  Cpu,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import { useCustomerFlow } from '../../context/CustomerFlowContext';
import { customerVerificationService } from '../../services/api/customerVerificationService';
import { CustomerHeader } from '../../components/common/CustomerHeader';
import { DynamicAiFollowUpSheet } from '../../components/customer/DynamicAiFollowUpSheet';

const STAGES = [
  { id: 'EVIDENCE_UPLOAD', label: 'Evidence Upload', icon: UploadCloud, description: 'Validating camera frames, cryptographic checksums, and workflow steps.' },
  { id: 'QUEUED', label: 'Verification Queued', icon: Clock, description: 'Allocating vision reasoning workers and loading product baseline...' },
  { id: 'VISUAL_ANALYSIS', label: 'Visual Analysis', icon: Sparkles, description: 'Evaluating customer evidence against stored canonical reference metadata...' },
  { id: 'REASONING', label: 'Reasoning Synthesis', icon: Cpu, description: 'Synthesizing damage observations, claim reason, and verification context...' },
  { id: 'COMPLETE', label: 'Verification Complete', icon: CheckCircle2, description: 'Dossier generated and transmitted to merchant for final decision.' },
];

export function ReviewingPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { session, completeVerification } = useCustomerFlow();

  const [currentStageId, setCurrentStageId] = useState('QUEUED');
  const [processingStatus, setProcessingStatus] = useState('PROCESSING');
  const [errorMessage, setErrorMessage] = useState(null);
  const [pendingFollowUp, setPendingFollowUp] = useState(null);
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const pollIntervalRef = useRef(null);
  const isAnalyzingRef = useRef(false);

  // Map backend stage string to index in STAGES
  const getStageIndex = (stageId) => {
    const idx = STAGES.findIndex((s) => s.id === stageId);
    return idx >= 0 ? idx : 1;
  };

  const currentStageIndex = getStageIndex(currentStageId);
  const currentStage = STAGES[currentStageIndex];

  // Perform backend status check and progress update
  const checkStatus = useCallback(async () => {
    if (!token) return;
    try {
      const data = await customerVerificationService.getStatus(token);

      if (data.stage) {
        setCurrentStageId(data.stage);
      }
      if (data.status) {
        setProcessingStatus(data.status);
      }

      if (data.error || data.status === 'FAILED') {
        const friendlyMsg =
          data.error ||
          'AI analysis encountered an issue. You can retry verification.';
        setErrorMessage(friendlyMsg);
        return;
      }

      // Check for dynamic follow-up request from Gemini
      if (data.pending_followup) {
        setPendingFollowUp(data.pending_followup);
        setCurrentStageId('REASONING');
        setProcessingStatus('PENDING');
        return;
      } else {
        setPendingFollowUp(null);
      }

      // If completed, finalize and navigate
      if (data.is_completed || data.status === 'COMPLETED') {
        setCurrentStageId('COMPLETE');
        setProcessingStatus('COMPLETED');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setTimeout(() => {
          navigate(`/verify/${token}/completed`);
        }, 1200);
      }
    } catch (err) {
      console.warn('Status poll warning:', err.message);
      if (err.response?.status === 404 || err.response?.status === 410) {
        setErrorMessage('Verification session is invalid or has expired.');
      }
    }
  }, [token, navigate]);

  // Execute verification analysis pipeline
  const executeAnalysis = useCallback(async () => {
    if (!token || isAnalyzingRef.current) return;
    isAnalyzingRef.current = true;
    setErrorMessage(null);
    setProcessingStatus('PROCESSING');
    setCurrentStageId('VISUAL_ANALYSIS');

    try {
      const result = await customerVerificationService.runAnalysis(token);

      if (result.status === 'FAILED') {
        setErrorMessage(result.message || 'AI analysis could not evaluate the submitted evidence.');
        setProcessingStatus('FAILED');
        return;
      }

      if (result.status === 'FOLLOWUP_REQUIRED' && result.request) {
        setPendingFollowUp(result.request);
        setCurrentStageId('REASONING');
        setProcessingStatus('PENDING');
        return;
      }

      if (result.status === 'COMPLETED' || result.stage === 'COMPLETE') {
        setCurrentStageId('COMPLETE');
        setProcessingStatus('COMPLETED');
        setTimeout(() => {
          navigate(`/verify/${token}/completed`);
        }, 1200);
        return;
      }

      // Re-check backend status
      await checkStatus();
    } catch (err) {
      console.error('Verification analysis pipeline error:', err);
      const detail = err.response?.data?.detail || err.message || '';
      let userMsg = 'AI analysis encountered an unexpected issue. You can retry verification.';

      if (detail.includes('credentials') || detail.includes('API key') || detail.includes('authentication')) {
        userMsg = 'AI verification failed because the configured AI credentials are invalid.';
      } else if (detail.includes('configured') || detail.includes('not configured')) {
        userMsg = 'AI verification is currently unavailable. The AI service is not configured. Please contact the merchant or try again later.';
      } else if (detail.includes('rate limit') || detail.includes('quota') || detail.includes('429')) {
        userMsg = 'AI verification is temporarily unavailable due to rate limits. Please try again in a few moments.';
      } else if (detail.includes('longer than expected') || detail.includes('timeout')) {
        userMsg = 'AI analysis is taking longer than expected. You can retry verification.';
      } else if (detail.includes('Unable to analyze') || detail.includes('image')) {
        userMsg = 'Unable to analyze the submitted image. Please capture another clear photograph.';
      }

      setErrorMessage(userMsg);
      setProcessingStatus('FAILED');
    } finally {
      isAnalyzingRef.current = false;
      setIsRetrying(false);
    }
  }, [token, checkStatus, navigate]);

  // Initial trigger and polling cycle
  useEffect(() => {
    executeAnalysis();

    // Start status polling interval (every 2.5s)
    pollIntervalRef.current = setInterval(() => {
      checkStatus();
    }, 2500);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [executeAnalysis, checkStatus]);

  // When customer answers the dynamic AI follow-up
  const handleFollowUpSubmit = async (requestId, answer, file) => {
    setIsSubmittingFollowUp(true);
    setErrorMessage(null);
    try {
      await customerVerificationService.fulfillFollowUp(token, requestId, {
        file,
        textContent: typeof answer === 'string' ? answer : null,
        selectedOption: typeof answer === 'string' ? answer : null,
      });

      setPendingFollowUp(null);
      setCurrentStageId('REASONING');
      setProcessingStatus('PROCESSING');

      // Trigger re-analysis check with fulfilled answer
      await executeAnalysis();
    } catch (err) {
      console.error('Failed to submit dynamic AI follow-up response:', err);
      setErrorMessage(err.response?.data?.detail || err.message || 'Failed to submit follow-up response.');
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  const handleRetry = () => {
    setIsRetrying(true);
    setErrorMessage(null);
    setCurrentStageId('QUEUED');
    setProcessingStatus('PROCESSING');
    executeAnalysis();
  };

  return (
    <div className="min-h-screen bg-appBg flex flex-col justify-between">
      <CustomerHeader orderId={session?.orderId} />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col justify-center">
        <div className="bg-white rounded-3xl border border-appBorder shadow-sm p-6 sm:p-10 text-center space-y-8">
          {/* Main Animated Icon */}
          <div className="relative inline-flex items-center justify-center">
            <div
              className={`w-20 h-20 rounded-3xl flex items-center justify-center ring-8 transition-colors ${
                errorMessage
                  ? 'bg-rose-50 text-rose-600 ring-rose-100/50'
                  : currentStageIndex === 4
                  ? 'bg-emerald-50 text-emerald-600 ring-emerald-100/50'
                  : 'bg-primary/10 text-primary ring-primary/5 animate-pulse'
              }`}
            >
              {errorMessage ? (
                <AlertCircle className="w-10 h-10 text-rose-600" />
              ) : (
                <currentStage.icon className="w-10 h-10" />
              )}
            </div>
            {currentStageIndex < 4 && !errorMessage && (
              <div className="absolute -inset-1 rounded-3xl border-2 border-primary border-t-transparent animate-spin" />
            )}
          </div>

          {/* Current Stage Label */}
          <div className="space-y-2">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                errorMessage
                  ? 'text-rose-700 bg-rose-100'
                  : currentStageIndex === 4
                  ? 'text-emerald-700 bg-emerald-100'
                  : 'text-primary bg-primary/10'
              }`}
            >
              STAGE {currentStageIndex + 1} OF {STAGES.length}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-darkNeutral">
              {errorMessage ? 'Verification Paused' : currentStage.label}
            </h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {errorMessage ? errorMessage : currentStage.description}
            </p>
          </div>

          {/* Error Banner with Retry Action */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-left space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-800 leading-relaxed font-medium">
                  {errorMessage}
                </div>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>{isRetrying ? 'Retrying Verification...' : 'Retry Verification'}</span>
              </button>
            </div>
          )}

          {/* Dynamic Follow-Up Prompt Card */}
          {pendingFollowUp && !errorMessage && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl text-left space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                Clarification Requested
              </span>
              <p className="text-xs text-darkNeutral font-medium">
                {pendingFollowUp.prompt || pendingFollowUp.reason || 'Additional clarification required to verify claim'}
              </p>
            </div>
          )}

          {/* Progress Tracker Steps */}
          <div className="space-y-4 max-w-sm mx-auto text-left">
            {STAGES.map((st, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;

              return (
                <div key={st.id} className="flex items-center gap-3 text-xs">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                      isPast
                        ? 'bg-emerald-500 text-white'
                        : isCurrent && !errorMessage
                        ? 'bg-primary text-white ring-2 ring-primary/30'
                        : isCurrent && errorMessage
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span
                    className={`font-semibold ${
                      isPast
                        ? 'text-emerald-700'
                        : isCurrent && !errorMessage
                        ? 'text-darkNeutral font-bold'
                        : isCurrent && errorMessage
                        ? 'text-rose-700 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {st.label}
                  </span>
                  {isCurrent && !errorMessage && currentStageIndex < 4 && (
                    <div className="ml-auto w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Trust and Verification Integrity Note */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span>Verified by Reft.AI Gemini Multimodal Reasoning Engine</span>
          </div>
        </div>
      </main>

      {/* Dynamic AI Follow-up Bottom Sheet */}
      {pendingFollowUp && (
        <DynamicAiFollowUpSheet
          request={pendingFollowUp}
          onSubmit={handleFollowUpSubmit}
          isSubmitting={isSubmittingFollowUp}
        />
      )}
    </div>
  );
}
