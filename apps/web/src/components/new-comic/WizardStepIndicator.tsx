'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { STEP_LABELS } from '../../lib/wizard-constants';

interface WizardStepIndicatorProps {
  activeStep: number;
}

export function WizardStepIndicator({ activeStep }: WizardStepIndicatorProps) {
  return (
    <div className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-4 flex-wrap">
      {STEP_LABELS.map((label, i) => (
        <React.Fragment key={label}>
          <div
            className={`flex items-center gap-1.5 ${
              i === activeStep ? 'text-white' : 'text-slate-500'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                i < activeStep
                  ? 'bg-violet-600 text-white'
                  : i === activeStep
                    ? 'bg-violet-500/20 border border-violet-500 text-violet-300'
                    : 'bg-slate-800 text-slate-500'
              }`}
            >
              {i < activeStep ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className="text-[10px] uppercase tracking-widest hidden sm:block">
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div
              className={`w-8 h-0.5 ${
                i < activeStep ? 'bg-violet-500' : 'bg-slate-700'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
