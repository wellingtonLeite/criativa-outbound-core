import React from 'react';
import { CheckCircle2, Clock, XCircle, HelpCircle } from 'lucide-react';

const CONFIG = {
  valid: { icon: CheckCircle2, label: 'Verificado (válido)' },
  catch_all: { icon: HelpCircle, label: 'Verificado (catch-all)' },
  invalid: { icon: XCircle, label: 'Verificado (inválido)' },
  pending: { icon: Clock, label: 'Aguardando Reoon' },
};

export default function ValidationStatusBadge({ status }) {
  const cfg = CONFIG[status] || CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span
      className={`badge badge-${status}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
      title={status === 'pending' ? 'A Reoon ainda não processou este e-mail' : 'A Reoon já processou este e-mail'}
    >
      <Icon size={13} />
      {cfg.label}
    </span>
  );
}
