import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { useCustomerFlow } from '../../context/CustomerFlowContext';
import { CustomerHeader } from '../../components/common/CustomerHeader';
import { RefundReasonStep } from '../../components/customer/steps/RefundReasonStep';
import { CameraEvidenceStep } from '../../components/customer/steps/CameraEvidenceStep';
import { PaymentProofStep } from '../../components/customer/steps/PaymentProofStep';
import { DeliveryConditionStep } from '../../components/customer/steps/DeliveryConditionStep';

const STEPS = [
  { id: 'REASON', title: 'Claim Reason', component: RefundReasonStep },
  { id: 'CAMERA', title: 'Damage Photos', component: CameraEvidenceStep },
  { id: 'DELIVERY', title: 'Package Condition', component: DeliveryConditionStep },
  { id: 'PAYMENT', title: 'Purchase Proof', component: PaymentProofStep },
];

export function WorkflowRunnerPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { session, currentStep, setStep, submitEvidence, isSubmitting, error } = useCustomerFlow();

  const [localStepIndex, setLocalStepIndex] = useState(0);
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    if (!session && token) {
      navigate(`/verify/${token}`);
    }
  }, [session, token, navigate]);

  if (!session) {
    return null;
  }

  const CurrentStepComponent = STEPS[localStepIndex].component;
  const isFirstStep = localStepIndex === 0;
  const isLastStep = localStepIndex === STEPS.length - 1;

  const handleNext = async () => {
    setValidationError(null);

    // Validation per step
    if (localStepIndex === 1) {
      // Camera evidence check: require at least 1 image
      if (!session.evidenceItems || session.evidenceItems.length === 0) {
        setValidationError('Please capture at least 1 live photo of the item damage.');
        return;
      }
    }

    if (!isLastStep) {
      setLocalStepIndex((prev) => prev + 1);
    } else {
      // Submit evidence and navigate to reviewing
      try {
        await submitEvidence();
        navigate(`/verify/${token}/reviewing`);
      } catch (err) {
        setValidationError(err.message || 'Failed to submit evidence');
      }
    }
  };

  const handleBack = () => {
    setValidationError(null);
    if (isFirstStep) {
      navigate(`/verify/${token}`);
    } else {
      setLocalStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-appBg flex flex-col justify-between">
      <CustomerHeader orderId={session.orderId} />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Step Progress Tracker */}
          <div className="bg-white p-4 rounded-2xl border border-appBorder shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>
                Step {localStepIndex + 1} of {STEPS.length}: {STEPS[localStepIndex].title}
              </span>
              <span className="text-primary font-mono font-semibold">
                {Math.round(((localStepIndex + 1) / STEPS.length) * 100)}%
              </span>
            </div>

            {/* Progress bar line */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300 rounded-full"
                style={{ width: `${((localStepIndex + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Validation Notice */}
          {(validationError || error) && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{validationError || error}</span>
            </div>
          )}

          {/* Active Step Content */}
          <div className="bg-white rounded-3xl border border-appBorder shadow-sm p-6 sm:p-8">
            <CurrentStepComponent />
          </div>
        </div>

        {/* Bottom Navigation Buttons */}
        <div className="pt-6 pb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isFirstStep ? 'Overview' : 'Back'}</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none sm:min-w-[180px] inline-flex items-center justify-center gap-2 py-3 px-6 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : isLastStep ? (
              <>
                <span>Submit for Verification</span>
                <Check className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
