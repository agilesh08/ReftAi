import React, { createContext, useContext, useState, useCallback } from 'react';
import { customerVerificationService } from '../services/api/customerVerificationService';

const CustomerFlowContext = createContext(null);

export function CustomerFlowProvider({ children }) {
  const [token, setToken] = useState(null);
  const [session, setSession] = useState(null);
  const [steps, setSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [activeFollowUp, setActiveFollowUp] = useState(null);

  // Form evidence state collected across steps
  const [reason, setReason] = useState('Damaged on arrival');
  const [notes, setNotes] = useState('');
  const [evidenceItems, setEvidenceItems] = useState([]);
  const [packageCondition, setPackageCondition] = useState('Damaged / creased outer box');
  const [accessoriesRetained, setAccessoriesRetained] = useState(true);
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);

  const loadSession = useCallback(async (sessionToken) => {
    if (!sessionToken) return;
    setLoading(true);
    setError(null);
    setToken(sessionToken);

    try {
      const data = await customerVerificationService.loadSession(sessionToken);
      setSession(data);

      if (!data.isCompleted && !data.isHeld) {
        try {
          const wf = await customerVerificationService.getWorkflow(sessionToken);
          setSteps(wf.steps || []);
        } catch (wfErr) {
          console.warn('Could not load frozen workflow snapshot:', wfErr.message);
        }
      }
      return data;
    } catch (err) {
      console.error('Error loading verification session:', err);
      setError(err.response?.data?.detail || err.message || 'Verification link is invalid or expired.');
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const addEvidenceImage = (file, title = 'Damage Photo') => {
    const objectUrl = URL.createObjectURL(file);
    const item = {
      file,
      url: objectUrl,
      title,
      type: 'photo',
      id: `ev-local-${Date.now()}-${Math.random()}`,
    };
    const updated = [...evidenceItems, item];
    setEvidenceItems(updated);
    if (session) {
      setSession({ ...session, evidenceItems: updated });
    }
    return item;
  };

  const removeEvidenceImage = (idx) => {
    const updated = evidenceItems.filter((_, i) => i !== idx);
    setEvidenceItems(updated);
    if (session) {
      setSession({ ...session, evidenceItems: updated });
    }
  };

  // Submit collected evidence to the backend
  const submitEvidence = async () => {
    if (!token) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Ensure session is started in backend
      try {
        await customerVerificationService.startVerification(token);
      } catch (startErr) {
        // Idempotent or already IN_PROGRESS
        console.warn('Session start notification:', startErr?.message);
      }

      // Resolve step keys dynamically from workflow snapshot
      const textStep = (steps || []).find((s) => ['TEXT', 'MCQ'].includes(s.step_type)) ||
        (steps || []).find((s) => s.step_key === 'step_refund_reason');
      const textKey = textStep?.step_key;

      const imageStep = (steps || []).find((s) => ['CAMERA', 'IMAGE'].includes(s.step_type)) ||
        (steps || []).find((s) => s.step_key === 'step_initial_proof');
      const imageKey = imageStep?.step_key;

      const paymentStep = (steps || []).find((s) => s.step_type === 'PAYMENT' || s.step_key?.includes('payment')) || imageStep;
      const paymentKey = paymentStep?.step_key;

      // 1. Submit Claim Reason Text Evidence
      if (reason && textKey) {
        await customerVerificationService.submitEvidenceText(
          token,
          textKey,
          `${reason}${notes ? ` - ${notes}` : ''}`
        );
      }

      // 2. Submit Package Condition Text Evidence if another text step exists
      if (packageCondition) {
        const condStep = (steps || []).find((s) => s.step_key === 'step_delivery_condition') || textStep;
        if (condStep?.step_key && condStep.step_key !== textKey) {
          await customerVerificationService.submitEvidenceText(
            token,
            condStep.step_key,
            `Package condition: ${packageCondition}. Accessories retained: ${accessoriesRetained ? 'Yes' : 'No'}`
          );
        }
      }

      // 3. Submit Camera Image Evidence Files
      for (const item of evidenceItems) {
        if (item.file) {
          await customerVerificationService.submitEvidenceImage(
            token,
            imageKey,
            item.file
          );
        }
      }

      // 4. Submit Payment Screenshot if attached
      if (paymentScreenshot) {
        await customerVerificationService.submitEvidenceImage(
          token,
          paymentKey,
          paymentScreenshot
        );
      }

      // 5. Trigger Real-time Analysis Check
      await customerVerificationService.runAnalysis(token);

      return true;
    } catch (err) {
      console.error('Failed to submit evidence to backend:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to submit evidence');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Answer dynamic AI follow-up
  const answerFollowUp = async (requestId, answer, file = null) => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      const res = await customerVerificationService.fulfillFollowUp(token, requestId, {
        file,
        textContent: typeof answer === 'string' ? answer : null,
        selectedOption: typeof answer === 'string' ? answer : null,
      });
      setActiveFollowUp(null);
      return res;
    } catch (err) {
      console.error('Failed to fulfill dynamic follow-up:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Finalize verification session
  const completeVerification = async () => {
    if (!token) return;
    try {
      await customerVerificationService.completeVerification(token);
      if (session) {
        setSession({ ...session, status: 'COMPLETED', isCompleted: true });
      }
    } catch (err) {
      console.error('Failed to finalize customer verification:', err);
    }
  };

  return (
    <CustomerFlowContext.Provider
      value={{
        token,
        session,
        overview: session,
        steps,
        currentStepIndex,
        currentStep: steps[currentStepIndex] || null,
        loading,
        isLoading: loading,
        isSubmitting,
        error,
        errorMessage: error,
        activeFollowUp,

        // State & setters
        reason,
        setReason,
        notes,
        setNotes,
        evidenceItems,
        setEvidenceItems,
        packageCondition,
        setPackageCondition,
        accessoriesRetained,
        setAccessoriesRetained,
        paymentScreenshot,
        setPaymentScreenshot,

        // Actions
        loadSession,
        addEvidenceImage,
        removeEvidenceImage,
        submitEvidence,
        answerFollowUp,
        completeVerification,
        setCurrentStepIndex,
        setStep: setCurrentStepIndex,
      }}
    >
      {children}
    </CustomerFlowContext.Provider>
  );
}

export function useCustomerFlow() {
  const context = useContext(CustomerFlowContext);
  if (!context) {
    throw new Error('useCustomerFlow must be used within a CustomerFlowProvider');
  }
  return context;
}
