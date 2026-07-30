import React, { useState, useEffect } from 'react';
import { X, Linkedin, Twitter, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CompanyAvatar from './CompanyAvatar';

const joinList = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return value.length ? value.join(', ') : null;
  return String(value);
};

const location = (obj) => obj.raw_address || [obj.city, obj.state, obj.country].filter(Boolean).join(', ') || null;

// Campos curados exibidos como texto simples (label em PT-BR + como extrair o valor)
const PERSON_FIELDS = [
  { label: 'Cargo', get: (p) => p.title },
  { label: 'Outros Cargos / Headline', get: (p) => p.headline },
  { label: 'Localização', get: (p) => location(p) },
  { label: 'Senioridade', get: (p) => p.seniority },
  { label: 'Departamento', get: (p) => joinList(p.departments) },
  { label: 'Função', get: (p) => joinList(p.functions) },
  { label: 'Telefones Adicionais', get: (p) => joinList(p.phone_numbers) },
  { label: 'Origem', get: (p) => p.source },
];

const COMPANY_FIELDS = [
  { label: 'Domínio', get: (c) => c.domain || c.primary_domain },
  { label: 'Localização', get: (c) => location(c) },
  { label: 'Ano de Fundação', get: (c) => c.founded_year },
  { label: 'Funcionários', get: (c) => c.estimated_num_employees },
  { label: 'Indústria', get: (c) => c.industry || joinList(c.industries) },
  { label: 'Palavras-chave', get: (c) => joinList(c.keywords) },
  { label: 'Tecnologias', get: (c) => joinList(c.technology_names) },
  { label: 'Descrição', get: (c) => c.short_description || c.description, long: true },
];

// Campos que viram link clicável em vez de texto
const PERSON_LINKS = [
  { label: 'LinkedIn', get: (p) => p.linkedin_url, icon: Linkedin },
  { label: 'X / Twitter', get: (p) => p.twitter_url, icon: Twitter },
];

const COMPANY_LINKS = [
  { label: 'Site', get: (c) => c.website_url, icon: Globe },
  { label: 'LinkedIn da Empresa', get: (c) => c.linkedin_url, icon: Linkedin },
];

function collectInfoEntries(data, fields, links) {
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
            <a key={label} href={value} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#00d4ff' }}>
              <Icon size={14} /> {label}
            </a>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
        {textEntries.map(({ label, value, long }) => (
          <div key={label} style={long ? { gridColumn: '1 / -1' } : undefined}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
            <div style={{ fontSize: '0.8rem', color: '#e2e8f0', wordBreak: 'break-word' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  const companyInfo = lead.company_info || {};
  const personInfo = lead.person_info || {};
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Lead';

  const personEntries = collectInfoEntries(personInfo, PERSON_FIELDS, PERSON_LINKS);
  const hasPersonInfo = personEntries.textEntries.length > 0 || personEntries.linkEntries.length > 0;
  const companyEntries = collectInfoEntries(companyInfo, COMPANY_FIELDS, COMPANY_LINKS);
  const hasCompanyInfo = companyEntries.textEntries.length > 0 || companyEntries.linkEntries.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CompanyAvatar name={lead.company_name} logoUrl={companyInfo.logo_url} />
            <div>
              <h2 style={{ marginBottom: '2px' }}>{fullName}</h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{lead.email}</p>
            </div>
          </div>
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
            <label className="form-label">Telefone</label>
            <p style={{ color: '#e2e8f0' }}>{lead.phone || '—'}</p>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Receita Estimada</label>
            <p style={{ color: '#e2e8f0' }}>{lead.revenue_estimated || '—'}</p>
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

        {hasPersonInfo && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '12px' }}>Sobre a Pessoa</h3>
            <InfoGrid data={personInfo} fields={PERSON_FIELDS} links={PERSON_LINKS} />
          </div>
        )}

        {hasCompanyInfo && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '12px' }}>Sobre a Empresa (para personalização no n8n)</h3>
            <InfoGrid data={companyInfo} fields={COMPANY_FIELDS} links={COMPANY_LINKS} />
          </div>
        )}

        {lead.raw_data && (
          <details style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', marginBottom: '20px' }}>
            <summary style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', cursor: 'pointer' }}>
              Ver todos os dados brutos recebidos da Apollo
            </summary>
            <pre style={{
              marginTop: '12px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px',
              fontSize: '0.7rem', color: '#94a3b8', maxHeight: '300px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word'
            }}>
              {JSON.stringify(lead.raw_data, null, 2)}
            </pre>
          </details>
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
