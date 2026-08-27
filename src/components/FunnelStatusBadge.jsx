import React from 'react';

const FUNNEL_CONFIG = {
  scraped: {
    label: 'Coletado',
    description: 'Lead minerado, aguardando envio'
  },
  in_sequence: {
    label: 'Em Sequência',
    description: 'E-mail ou WhatsApp disparado'
  },
  replied: {
    label: 'Respondeu 🔥',
    description: 'Lead respondeu ao contato'
  },
  booked: {
    label: 'Reunião Agendada 🎯',
    description: 'Demo agendada'
  },
  bounced: {
    label: 'Retornou (Bounce)',
    description: 'Caixa postal inválida ou erro'
  },
  unsubscribed: {
    label: 'Descadastrado',
    description: 'Opt-out solicitado'
  },
};

export default function FunnelStatusBadge({ status }) {
  const cfg = FUNNEL_CONFIG[status] || { label: status || 'Coletado', description: '' };
  return (
    <span 
      className={`badge badge-${status || 'scraped'}`}
      title={cfg.description}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
    >
      {cfg.label}
    </span>
  );
}
