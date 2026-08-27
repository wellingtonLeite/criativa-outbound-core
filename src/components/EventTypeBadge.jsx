import React from 'react';

const LABELS = {
  sent: 'Enviado',
  delivered: 'Entregue',
  opened: 'Aberto',
  replied: 'Respondeu 🔥',
  booked: 'Agendado 📅',
  bounced: 'Retornou (Bounce)',
  cleaned: 'Higienizado 🧼',
  scraped: 'Minerado 🚀',
};

export default function EventTypeBadge({ type }) {
  return (
    <span className={`badge badge-${type}`}>
      {LABELS[type] || type}
    </span>
  );
}
