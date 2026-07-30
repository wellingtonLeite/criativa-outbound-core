import React from 'react';

export default function CompanyAvatar({ name, logoUrl, size = 40 }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  const style = { width: `${size}px`, height: `${size}px`, borderRadius: '50%', flexShrink: 0 };

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name || 'Empresa'}
        style={{ ...style, objectFit: 'cover', background: '#1e293b' }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  return (
    <div style={{
      ...style, background: '#1e293b', color: '#00d4ff',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: `${size * 0.4}px`
    }}>
      {initial}
    </div>
  );
}
