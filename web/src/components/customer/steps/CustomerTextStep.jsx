import React, { useState } from 'react';

export function CustomerTextStep({ step, onTextChange }) {
  const [text, setText] = useState('');

  const handleChange = (e) => {
    setText(e.target.value);
    onTextChange(e.target.value);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs sm:text-sm text-textSecondary">
        {step.description || 'Please provide details below:'}
      </p>

      <textarea
        rows={4}
        required={step.required}
        placeholder="Type your explanation here..."
        className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-appBorder rounded-xl focus:outline-none focus:border-primary"
        value={text}
        onChange={handleChange}
      />
    </div>
  );
}
