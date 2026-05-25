export interface PanelStatusLabel {
  text: string;
  className: string;
}

export function getPanelStatusLabel(status: string): PanelStatusLabel {
  switch (status) {
    case 'completed':
      return {
        text: 'Completed',
        className: 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30',
      };
    case 'generated':
      return {
        text: 'Review Pending',
        className: 'bg-amber-950/40 text-amber-400 border-amber-500/30',
      };
    case 'generating':
      return {
        text: 'Generating...',
        className:
          'bg-indigo-950/40 text-indigo-400 border-indigo-500/30 animate-pulse',
      };
    case 'pending':
      return {
        text: 'Pending',
        className: 'bg-slate-900 text-slate-500 border-slate-800',
      };
    case 'failed':
      return {
        text: 'Failed',
        className: 'bg-red-950/40 text-red-400 border-red-500/30',
      };
    default:
      return { text: status, className: 'bg-slate-800 text-slate-300' };
  }
}
