import React from 'react';

const LABELS = {
  sent: 'Enviado',
  opened: 'Aberto',
  replied: 'Respondeu',
  bounced: 'Retornou (Bounce)',
};

export default function EventTypeBadge({ type }) {
  return (
    <span className={`badge badge-${type}`}>
      {LABELS[type] || type}
    </span>
  );
}
