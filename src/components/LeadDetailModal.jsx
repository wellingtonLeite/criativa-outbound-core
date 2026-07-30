import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function LeadDetailModal({ lead, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (!lead) return;
    const fetchLogs = async () => {
      setLoadingLogs(true);
      try {
        const { data, error } = await supabase
          .from('outreach_logs')
          .select('*, email_templates(subject, step_number)')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setLogs(data || []);
      } catch (error) {
        console.error('Erro ao buscar histórico do lead:', error);
      } finally {
        setLoadingLogs(false);
      }
    };
    fetchLogs();
  }, [lead]);

  if (!lead) return null;

  const formatLabel = (key) => key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (Array.isArray(value)) return value.length ? value.join(', ') : null;
    if (typeof value === 'object') return Object.keys(value).length ? JSON.stringify(value) : null;
    return String(value);
  };

  const renderInfoEntries = (obj) => {
    if (!obj) return null;
    const entries = Object.entries(obj)
      .map(([key, value]) => [key, formatValue(value)])
      .filter(([, value]) => value !== null);
    if (entries.length === 0) return null;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
        {entries.map(([key, value]) => (
          <div key={key}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{formatLabel(key)}</div>
            <div style={{ fontSize: '0.8rem', color: '#e2e8f0', wordBreak: 'break-word' }}>{value}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <h2>{lead.first_name || 'Lead'} — {lead.email}</h2>
          <button onClick={onClose} className="btn-icon" style={{ border: 'none', background: 'transparent' }}>
            <X size={20} />
          </button>
        </div>

        <div className="form-grid" style={{ marginBottom: '20px' }}>
          {lead.campaigns?.name && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Campanha</label>
              <p style={{ color: '#e2e8f0' }}>{lead.campaigns.name}</p>
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Empresa</label>
            <p style={{ color: '#e2e8f0' }}>{lead.company_name || '—'}</p>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Receita Estimada</label>
            <p style={{ color: '#e2e8f0' }}>{lead.revenue_estimated || '—'}</p>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Telefone</label>
            <p style={{ color: '#e2e8f0' }}>{lead.phone || '—'}</p>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Validação do E-mail</label>
            <span className={`badge badge-${lead.validation_status}`}>{lead.validation_status}</span>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Status no Funil</label>
            <span className={`badge badge-${lead.funnel_status}`}>{lead.funnel_status}</span>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Step Atual da Sequência</label>
            <p style={{ color: '#e2e8f0' }}>{lead.current_step ?? 0}</p>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Último Contato</label>
            <p style={{ color: '#e2e8f0' }}>
              {lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleString('pt-BR') : '—'}
            </p>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Adicionado em</label>
            <p style={{ color: '#e2e8f0' }}>{new Date(lead.created_at).toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {renderInfoEntries(lead.person_info) && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '12px' }}>Dados Adicionais da Pessoa</h3>
            {renderInfoEntries(lead.person_info)}
          </div>
        )}

        {renderInfoEntries(lead.company_info) && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '12px' }}>Dados da Empresa (para personalização no n8n)</h3>
            {renderInfoEntries(lead.company_info)}
          </div>
        )}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '12px' }}>Histórico de Atividade</h3>
          {loadingLogs ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}><div className="spinner"></div></div>
          ) : logs.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Nenhuma atividade registrada ainda — os eventos aparecem aqui assim que o motor de disparo enviar e-mails para este lead.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {logs.map(log => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8' }}>
                  <span>
                    <span className={`badge badge-${log.event_type}`} style={{ marginRight: '8px' }}>{log.event_type}</span>
                    {log.email_templates?.subject || `Step ${log.email_templates?.step_number ?? '—'}`}
                  </span>
                  <span>{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
