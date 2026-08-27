import React from 'react';
import { CheckCircle2, Clock, XCircle, HelpCircle } from 'lucide-react';

const CONFIG = {
  valid: { icon: CheckCircle2, label: 'Válido', title: 'E-mail confirmado pelo Reacher local (:8080)' },
  catch_all: { icon: HelpCircle, label: 'Catch-all', title: 'Servidor aceita todos os e-mails (requer cautela)' },
  invalid: { icon: XCircle, label: 'Inválido', title: 'E-mail rejeitado no handshake SMTP (descarte recomendado)' },
  pending: { icon: Clock, label: 'Aguardando Validação', title: 'Aguardando validação gratuita via Reacher Docker (:8080)' },
};

export default function ValidationStatusBadge({ status }) {
  const cfg = CONFIG[status] || CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span
      className={`badge badge-${status || 'pending'}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
      title={cfg.title}
    >
      <Icon size={13} />
      {cfg.label}
    </span>
  );
}
