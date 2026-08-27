import React, { useState, useEffect } from 'react';
import { 
  X, 
  Linkedin, 
  Twitter, 
  Globe, 
  Building2, 
  Phone, 
  Mail, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  RotateCcw,
  MessageSquare,
  CheckCheck
} from 'lucide-react';
import { mockDataStore } from '../lib/mockDataStore';
import { fetchMessageHistory } from '../lib/evolutionClient';
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

export default function LeadDetailModal({ lead: initialLead, onClose }) {
  const [currentLead, setCurrentLead] = useState(initialLead);
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'person' | 'company' | 'chat' | 'timeline' | 'raw'

  const handleClose = () => {
    setCurrentLead(null);
    if (onClose) onClose();
  };

  const reloadData = async (leadToFetch = currentLead) => {
    if (!leadToFetch) return;
    try {
      const allLogs = await mockDataStore.getMockLogs(50);
      const leadLogs = allLogs.filter(l => l.lead_id === leadToFetch.id || l.leads?.email === leadToFetch.email);
      setLogs(leadLogs);

      const msgs = await fetchMessageHistory('Criativa-Core-Outbound', leadToFetch.phone || leadToFetch.id);
      const cleanMsgs = (msgs || []).filter(m => !String(m.id || '').startsWith('msg-init-'));
      setMessages(cleanMsgs);

      const freshLead = await mockDataStore.getMockLeadById(leadToFetch.id);
      if (freshLead) {
        setCurrentLead(freshLead);
      }
    } catch (err) {
      console.warn('Erro ao atualizar dados do lead:', err);
    }
  };

  useEffect(() => {
    setCurrentLead(initialLead);
    if (!initialLead) return;
    reloadData(initialLead);

    const unsubscribe = mockDataStore.subscribe(() => {
      reloadData(initialLead);
    });

    return () => unsubscribe();
  }, [initialLead]);

  // Keyboard close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!initialLead || !currentLead) return null;

  const companyInfo = currentLead.company_info || {};
  const personInfo = currentLead.person_info || {};
  const fullName = [currentLead.first_name, currentLead.last_name].filter(Boolean).join(' ') || 'Lead B2B';

  const personEntries = collectInfoEntries(personInfo, PERSON_FIELDS, PERSON_LINKS);
  const hasPersonInfo = personEntries.textEntries.length > 0 || personEntries.linkEntries.length > 0;
  const companyEntries = collectInfoEntries(companyInfo, COMPANY_FIELDS, COMPANY_LINKS);
  const hasCompanyInfo = companyEntries.textEntries.length > 0 || companyEntries.linkEntries.length > 0;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '680px', width: '94%', maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <CompanyAvatar name={currentLead.company_name} logoUrl={companyInfo.logo_url} size={46} />
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '2px', color: '#fff' }}>{fullName}</h2>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{currentLead.email}</span>
                {currentLead.phone && <span>· {currentLead.phone}</span>}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="btn-icon" 
            style={{ border: 'none', background: 'transparent' }}
            title="Fechar (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', marginBottom: '20px', overflowX: 'auto' }}>
          {[
            { key: 'overview', label: 'Visão Geral' },
            { key: 'chat', label: `WhatsApp (${messages.length})` },
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
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
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
                <p style={{ color: '#e2e8f0', fontWeight: 500 }}>{currentLead.company_name || '—'}</p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">CNPJ</label>
                <p style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{currentLead.cnpj || '—'}</p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Receita Estimada</label>
                <p style={{ color: '#10b981', fontWeight: 600 }}>{currentLead.revenue_estimated || '—'}</p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Campanha Associada</label>
                <p style={{ color: '#e2e8f0' }}>{currentLead.campaigns?.name || '—'}</p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Validação de E-mail (Reacher)</label>
                <ValidationStatusBadge status={currentLead.validation_status} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Status no Funil</label>
                <FunnelStatusBadge status={currentLead.funnel_status} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Step Atual da Cadência</label>
                <p style={{ color: '#e2e8f0' }}>Step {currentLead.current_step ?? 0}</p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Último Contato</label>
                <p style={{ color: '#e2e8f0' }}>
                  {currentLead.last_contacted_at ? new Date(currentLead.last_contacted_at).toLocaleString('pt-BR') : 'Ainda não contatado'}
                </p>
              </div>
            </div>

            {currentLead.qualification_status && (
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Qualificação Comercial</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge" style={{ background: 'rgba(0,212,255,0.12)', color: '#00d4ff' }}>
                    Status: {currentLead.qualification_status.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                    {currentLead.qualification_status === 'lead_qualificado' || currentLead.qualification_status === 'qualified' || currentLead.qualification_status === 'hot'
                      ? 'Lead com alto engajamento e intenção de compra confirmada via resposta direta.'
                      : 'Lead qualificado para nutrição e cadência ativa.'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: WhatsApp Chat (100% Real Messages) */}
        {activeTab === 'chat' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Messages Stream Container */}
            <div style={{
              background: '#0d1418',
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid rgba(255,255,255,0.06)',
              minHeight: '220px',
              maxHeight: '360px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', padding: '36px 16px', color: '#64748b' }}>
                  <MessageSquare size={36} color="#64748b" style={{ margin: '0 auto 12px auto' }} />
                  <p style={{ margin: 0, fontWeight: 500, color: '#e2e8f0', fontSize: '0.84rem' }}>
                    Nenhuma mensagem trocada com este contato ainda.
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                    As mensagens enviadas via WhatsApp aparecerão aqui em tempo real.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isOutbound = m.from_me || m.direction === 'outbound' || m.sender === 'user' || m.key?.fromMe;
                  const textContent = m.text || m.message?.conversation || m.message?.extendedTextMessage?.text || '';
                  const msgDate = m.timestamp ? new Date(m.timestamp) : new Date();
                  const timeFormatted = isNaN(msgDate.getTime()) ? (m.time || 'Hoje') : msgDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div 
                      key={m.id || `msg-${Math.random()}`}
                      style={{
                        maxWidth: '82%',
                        alignSelf: isOutbound ? 'flex-end' : 'flex-start',
                        background: isOutbound ? '#005c4b' : '#202c33',
                        color: '#e9edef',
                        borderRadius: isOutbound ? '8px 8px 0px 8px' : '8px 8px 8px 0px',
                        padding: '10px 14px',
                        fontSize: '0.84rem',
                        lineHeight: '1.4',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        position: 'relative'
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', color: isOutbound ? '#53bdeb' : '#00d4ff', fontWeight: 600, marginBottom: '2px' }}>
                        {m.sender || (isOutbound ? 'Criativa Outbound' : fullName)}
                      </div>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{textContent}</p>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '0.68rem', color: '#8696a0' }}>
                        <span>{timeFormatted}</span>
                        {isOutbound && <CheckCheck size={14} color="#53bdeb" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Person */}
        {activeTab === 'person' && (
          <div className="animate-fade-in">
            {hasPersonInfo ? (
              <InfoGrid data={personInfo} fields={PERSON_FIELDS} links={PERSON_LINKS} />
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Informações de perfil não detalhadas para este contato.</p>
            )}
          </div>
        )}

        {/* Tab 4: Company */}
        {activeTab === 'company' && (
          <div className="animate-fade-in">
            {hasCompanyInfo ? (
              <InfoGrid data={companyInfo} fields={COMPANY_FIELDS} links={COMPANY_LINKS} />
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Informações de empresa não detalhadas para este contato.</p>
            )}
          </div>
        )}

        {/* Tab 5: Timeline */}
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

        {/* Tab 6: Raw Data */}
        {activeTab === 'raw' && (
          <div className="animate-fade-in">
            <pre style={{
              padding: '14px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px',
              fontSize: '0.72rem', color: '#94a3b8', maxHeight: '320px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word'
            }}>
              {JSON.stringify({ lead_id: currentLead.id, company: currentLead.company_name, raw_data: currentLead.raw_data || currentLead }, null, 2)}
            </pre>
          </div>
        )}

        {/* Modal Footer */}
        <div className="modal-footer">
          <button onClick={handleClose} className="btn btn-secondary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
