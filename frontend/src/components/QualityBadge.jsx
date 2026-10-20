import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

export default function QualityBadge({ status }) {
  const s = (status || 'valid').toLowerCase();

  if (s === 'valid' || s === 'healthy') {
    return (
      <span className="badge badge-green">
        <CheckCircle2 size={12} /> Valid
      </span>
    );
  }
  if (s === 'degraded' || s === 'warning') {
    return (
      <span className="badge badge-amber">
        <AlertTriangle size={12} /> Degraded
      </span>
    );
  }
  if (s === 'missing') {
    return (
      <span className="badge badge-amber">
        <HelpCircle size={12} /> Missing Data
      </span>
    );
  }
  return (
    <span className="badge badge-red">
      <XCircle size={12} /> Invalid
    </span>
  );
}
