import React from 'react';

const LABELS = {
  scraped: 'Coletado',
  in_sequence: 'Em Sequência',
  replied: 'Respondeu',
  bounced: 'Retornou (Bounce)',
  booked: 'Agendado',
  unsubscribed: 'Descadastrado',
};

export default function FunnelStatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      {LABELS[status] || status}
    </span>
  );
}
