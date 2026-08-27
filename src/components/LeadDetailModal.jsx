import React, { useState, useEffect } from 'react';
import { X, Linkedin, Twitter, Globe, Building2, Phone, Mail, Calendar, ShieldCheck, CheckCircle2, RotateCcw } from 'lucide-react';
import { mockDataStore } from '../lib/mockDataStore';
import CompanyAvatar from './CompanyAvatar';
import ValidationStatusBadge from './ValidationStatusBadge';
import FunnelStatusBadge from './FunnelStatusBadge';
import EventTypeBadge from './EventTypeBadge';

const joinList = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return value.length ? value.join(', ') : null;
  return String(value);
};

const location = (obj) => obj?.raw_address || [obj?.city, obj?.state, obj?.country].filter(Boolean).join(', ') || null;

const PERSON_FIELDS = [
  { label: 'Cargo', get: (p) => p.title },
  { label: 'Headline Profissional', get: (p) => p.headline },
  { label: 'Localização', get: (p) => location(p) },
  { label: 'Senioridade', get: (p) => p.seniority },
  { label: 'Departamentos', get: (p) => joinList(p.departments) },
  { label: 'Funções', get: (p) => joinList(p.functions) },
  { label: 'Telefones Adicionais', get: (p) => joinList(p.phone_numbers) },
  { label: 'Origem da Mineração', get: (p) => p.source },
];

const COMPANY_FIELDS = [
  { label: 'Domínio Web', get: (c) => c.domain || c.primary_domain },
  { label: 'Localização / Sede', get: (c) => location(c) },
  { label: 'Ano de Fundação', get: (c) => c.founded_year },
  { label: 'Porte / Funcionários', get: (c) => c.estimated_num_employees },
  { label: 'Indústria / Setor', get: (c) => c.industry || joinList(c.industries) },
  { label: 'Palavras-chave', get: (c) => joinList(c.keywords) },
  { label: 'Stack / Tecnologias', get: (c) => joinList(c.technology_names) },
  { label: 'Descrição da Empresa', get: (c) => c.short_description || c.description, long: true },
];

const PERSON_LINKS = [
  { label: 'Perfil LinkedIn', get: (p) => p.linkedin_url, icon: Linkedin },
  { label: 'X / Twitter', get: (p) => p.twitter_url, icon: Twitter },
];

const COMPANY_LINKS = [
  { label: 'Website Oficial', get: (c) => c.website_url, icon: Globe },
  { label: 'LinkedIn Institucional', get: (c) => c.linkedin_url, icon: Linkedin },
];

function collectInfoEntries(data, fields, links) {
  if (!data) return { textEntries: [], linkEntries: [] };
  const textEntries = fields
    .map((f) => ({ label: f.label, value: f.get(data), long: f.long }))
    .filter((e) => e.value !== null && e.value !== undefined && e.value !== '');
  const linkEntries = (links || [])
    .map((f) => ({ label: f.label, value: f.get(data), icon: f.icon }))
    .filter((e) => !!e.value);
  return { textEntries, linkEntries };
}

function InfoGrid({ data, fields, links }) {
  const { textEntries, linkEntries } = collectInfoEntries(data, fields, links);
  if (textEntries.length === 0 && linkEntries.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {linkEntries.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {linkEntries.map(({ label, value, icon: Icon }) => (
            <a 
              key={label} 
              href={value} 
              target="_blank" 
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#00d4ff' }}
            >
              <Icon size={14} /> {label}
            </a>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 16px' }}>
        {textEntries.map(({ label, value, long }) => (
          <div key={label} style={long ? { gridColumn: '1 / -1' } : undefined}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              {label}
            </div>
            <div style={{ fontSize: '0.84rem', color: '#e2e8f0', wordBreak: 'break-word', marginTop: '2px' }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LeadDetailModal({ lead, onClose }) {
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'person' | 'company' | 'timeline' | 'raw'

  useEffect(() => {
    if (!lead) return;
    const fetchLeadLogs = async () => {
      const allLogs = await mockDataStore.getMockLogs(50);
      const leadLogs = allLogs.filter(l => l.lead_id === lead.id || l.leads?.email === lead.email);
      setLogs(leadLogs);
    };
    fetchLeadLogs();
  }, [lead]);

  // Keyboard close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && lead) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lead, onClose]);

  if (!lead) return null;

  const companyInfo = lead.company_info || {};
  const personInfo = lead.person_info || {};
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Lead B2B';

  const personEntries = collectInfoEntries(personInfo, PERSON_FIELDS, PERSON_LINKS);
  const hasPersonInfo = personEntries.textEntries.length > 0 || personEntries.linkEntries.length > 0;
  const companyEntries = collectInfoEntries(companyInfo, COMPANY_FIELDS, COMPANY_LINKS);
  const hasCompanyInfo = companyEntries.textEntries.length > 0 || companyEntries.linkEntries.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '640px', width: '92%', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <CompanyAvatar name={lead.company_name} logoUrl={companyInfo.logo_url} size={46} />
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '2px', color: '#fff' }}>{fullName}</h2>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{lead.email}</span>
                {lead.phone && <span>· {lead.phone}</span>}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="btn-icon" 
            style={{ border: 'none', background: 'transparent' }}
            title="Fechar (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', marginBottom: '20px' }}>
          {[
            { key: 'overview', label: 'Visão Geral' },
            { key: 'person', label: 'Contato / Decisor' },
            { key: 'company', label: 'Empresa & CNPJ' },
            { key: 'timeline', label: `Histórico (${logs.length})` },
            { key: 'raw', label: 'Dados Brutos' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: activeTab === tab.key ? 'rgba(0,212,255,0.1)' : 'transparent',
                color: activeTab === tab.key ? '#00d4ff' : '#94a3b8',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-grid">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Empresa</label>
                <p style={{ color: '#e2e8f0', fontWeight: 500 }}>{lead.company_name || '—'}</p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">CNPJ</label>
                <p style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{lead.cnpj || '—'}</p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Receita Estimada</label>
                <p style={{ color: '#10b981', fontWeight: 600 }}>{lead.revenue_estimated || '—'}</p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Campanha Associada</label>
                <p style={{ color: '#e2e8f0' }}>{lead.campaigns?.name || '—'}</p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Higienização Reoon</label>
                <ValidationStatusBadge status={lead.validation_status} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Status no Funil</label>
                <FunnelStatusBadge status={lead.funnel_status} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Step Atual da Cadência</label>
                <p style={{ color: '#e2e8f0' }}>Step {lead.current_step ?? 0}</p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Último Contato</label>
                <p style={{ color: '#e2e8f0' }}>
                  {lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleString('pt-BR') : 'Ainda não contatado'}
                </p>
              </div>
            </div>

            {lead.qualification_status && (
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Qualificação Comercial</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge" style={{ background: 'rgba(0,212,255,0.12)', color: '#00d4ff' }}>
                    Status: {lead.qualification_status.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                    {lead.qualification_status === 'hot' ? 'Lead com alto engajamento e intenção de compra confirmada.' : 'Lead qualificado para nutrição e cadência ativa.'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Person */}
        {activeTab === 'person' && (
          <div className="animate-fade-in">
            {hasPersonInfo ? (
              <InfoGrid data={personInfo} fields={PERSON_FIELDS} links={PERSON_LINKS} />
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Informações de perfil não detalhadas para este contato.</p>
            )}
          </div>
        )}

        {/* Tab 3: Company */}
        {activeTab === 'company' && (
          <div className="animate-fade-in">
            {hasCompanyInfo ? (
              <InfoGrid data={companyInfo} fields={COMPANY_FIELDS} links={COMPANY_LINKS} />
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Informações de empresa não detalhadas para este contato.</p>
            )}
          </div>
        )}

        {/* Tab 4: Timeline */}
        {activeTab === 'timeline' && (
          <div className="animate-fade-in">
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '0.85rem' }}>
                Nenhum evento registrado ainda para este lead.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                {logs.map(log => (
                  <div 
                    key={log.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.04)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <EventTypeBadge type={log.event_type} />
                      <span style={{ fontSize: '0.82rem', color: '#e2e8f0' }}>
                        {log.email_templates?.subject || `Disparo ${log.channel}`}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Raw Data */}
        {activeTab === 'raw' && (
          <div className="animate-fade-in">
            <pre style={{
              padding: '14px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px',
              fontSize: '0.72rem', color: '#94a3b8', maxHeight: '320px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word'
            }}>
              {JSON.stringify({ lead_id: lead.id, company: lead.company_name, raw_data: lead.raw_data || lead }, null, 2)}
            </pre>
          </div>
        )}

        {/* Modal Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
