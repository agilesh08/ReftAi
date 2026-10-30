import React, { useState } from 'react';
import { HelpCircle, Camera, Check, Upload, Send } from 'lucide-react';
import { CustomerCameraCapture } from './CustomerCameraCapture';

export function DynamicAiFollowUpSheet({ request, onSubmit, isSubmitting }) {
  const [selectedOption, setSelectedOption] = useState('');
  const [textAnswer, setTextAnswer] = useState('');
  const [capturedFile, setCapturedFile] = useState(null);

  if (!request) return null;

  const type = (request.requested_evidence_type || 'CUSTOMER_TEXT').toUpperCase();
  const prompt = request.prompt || request.reason || 'Additional evidence requested to verify claim';
  const options = request.options || [
    'Yes, observed as described',
    'Partially visible on unboxing',
    'No, not observed',
    'Other / Prefer to explain in text'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    let finalAnswer = '';
    if (type === 'MCQ') {
      finalAnswer = selectedOption;
    } else if (type === 'CUSTOMER_TEXT') {
      finalAnswer = textAnswer.trim();
    } else if (type === 'CUSTOMER_IMAGE') {
      finalAnswer = capturedFile ? `Uploaded ${capturedFile.name}` : 'Photo provided';
    }
    onSubmit(request.id, finalAnswer, capturedFile);
  };

  const isReady =
    (type === 'MCQ' && selectedOption) ||
    (type === 'CUSTOMER_TEXT' && textAnswer.trim()) ||
    (type === 'CUSTOMER_IMAGE' && capturedFile);

  return (
    <div className="bg-white rounded-2xl border-2 border-primary/40 shadow-xl p-5 mb-6 animate-in slide-in-from-bottom-3 duration-300">
      <div className="flex items-start gap-3 pb-3 border-b border-appBorder">
        <div className="w-9 h-9 rounded-xl bg-primaryLight/40 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-primary">
            Verification Clarification
          </span>
          <h3 className="text-sm sm:text-base font-bold text-darkNeutral leading-snug">
            {prompt}
          </h3>
          {request.reason && (
            <p className="text-xs text-textSecondary mt-1 italic">
              Goal: {request.reason}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="pt-4 space-y-4">
        {/* MCQ Option Cards */}
        {type === 'MCQ' && (
          <div className="space-y-2">
            {options.map((opt, i) => {
              const isSelected = selectedOption === opt;
              return (
                <div
                  key={i}
                  onClick={() => setSelectedOption(opt)}
                  className={`p-3 rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                      : 'border-appBorder hover:bg-surface-variant text-darkNeutral'
                  }`}
                >
                  <span>{opt}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                </div>
              );
            })}
          </div>
        )}

        {/* Text Area */}
        {type === 'CUSTOMER_TEXT' && (
          <div>
            <textarea
              rows={3}
              required
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-appBorder rounded-xl focus:outline-none focus:border-primary"
              placeholder="Please describe the condition in detail..."
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
            />
          </div>
        )}

        {/* Camera Image Capture */}
        {type === 'CUSTOMER_IMAGE' && (
          <div>
            <CustomerCameraCapture onCapture={(file) => setCapturedFile(file)} />
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={!isReady || isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting Clarification...' : 'Submit Response & Continue'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
