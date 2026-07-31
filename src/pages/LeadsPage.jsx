import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import LeadDetailModal from '../components/LeadDetailModal';
import CompanyAvatar from '../components/CompanyAvatar';
import ValidationStatusBadge from '../components/ValidationStatusBadge';
import FunnelStatusBadge from '../components/FunnelStatusBadge';
import { verifyEmailsBulk } from '../lib/reoonClient';
import { Search, Users, RefreshCw } from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);

  const [searchText, setSearchText] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('Todas');
  const [funnelFilter, setFunnelFilter] = useState('Todos');
  const [validationFilter, setValidationFilter] = useState('Todos');

  const [revalidating, setRevalidating] = useState(false);
  const [reoonProgress, setReoonProgress] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*, campaigns!inner(name, user_id)')
        .order('created_at', { ascending: false });
      if (leadsError) throw leadsError;
      setLeads(leadsData || []);

      const uniqueCampaigns = Array.from(new Set((leadsData || []).map(l => l.campaigns?.name))).filter(Boolean);
      setCampaigns(uniqueCampaigns);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const pendingLeads = useMemo(() => leads.filter(l => l.validation_status === 'pending'), [leads]);

  const handleRevalidateAllPending = async () => {
    if (pendingLeads.length === 0) return;
    setRevalidating(true);
    setReoonProgress({ status: 'creating', total: pendingLeads.length });
    try {
      const statusByEmail = await verifyEmailsBulk(pendingLeads.map(l => l.email), { maxWaitMs: 120000, onProgress: setReoonProgress });
      let resolved = 0;
      for (const lead of pendingLeads) {
        const newStatus = statusByEmail.get(lead.email) || 'pending';
        if (newStatus === 'pending') continue;
        resolved++;
        const update = { validation_status: newStatus };
        if (newStatus === 'valid' && lead.funnel_status === 'scraped') {
          update.funnel_status = 'in_sequence';
        }
        await supabase.from('leads').update(update).eq('id', lead.id);
      }
      await fetchData();
      alert(`✓ ${resolved} de ${pendingLeads.length} leads pendentes foram validados.`);
    } catch (error) {
      console.error('Erro ao revalidar leads pendentes:', error);
      alert('Erro ao revalidar leads pendentes: ' + error.message);
    } finally {
      setRevalidating(false);
      setReoonProgress(null);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchSearch =
        (lead.first_name || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (lead.last_name || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (lead.email || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (lead.company_name || '').toLowerCase().includes(searchText.toLowerCase());

      const matchCampaign = campaignFilter === 'Todas' || lead.campaigns?.name === campaignFilter;
      const matchFunnel = funnelFilter === 'Todos' || lead.funnel_status === funnelFilter;
      const matchValidation = validationFilter === 'Todos' || lead.validation_status === validationFilter;

      return matchSearch && matchCampaign && matchFunnel && matchValidation;
    });
  }, [leads, searchText, campaignFilter, funnelFilter, validationFilter]);

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">Todos os contatos coletados, em todas as campanhas ({leads.length})</p>
        </div>
        {pendingLeads.length > 0 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setValidationFilter('pending')}
              className="btn btn-secondary"
              title="Filtrar só os pendentes"
            >
              Ver Pendentes ({pendingLeads.length})
            </button>
            <button
              onClick={handleRevalidateAllPending}
              disabled={revalidating}
              className="btn btn-primary"
            >
              <RefreshCw size={16} /> {revalidating ? 'Revalidando...' : `Revalidar Pendentes (${pendingLeads.length})`}
            </button>
          </div>
        )}
      </div>

      {/* Progresso da higienização de e-mails (Reoon) */}
      {reoonProgress && (
        <div className="glass-card" style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', marginBottom: '20px',
          border: '1px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.07)'
        }}>
          <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', flexShrink: 0 }}></div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>
              Higienizando e-mails na Reoon{reoonProgress.total ? ` — ${reoonProgress.total} contato${reoonProgress.total > 1 ? 's' : ''}` : ''}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              {reoonProgress.status === 'creating' && 'Enviando e-mails para verificação...'}
              {reoonProgress.status === 'waiting' && 'Na fila de processamento da Reoon...'}
              {reoonProgress.status === 'running' && (
                `Verificando${reoonProgress.checked != null ? ` — ${reoonProgress.checked}/${reoonProgress.total} checados` : ''}${reoonProgress.progress != null ? ` (${Math.round(reoonProgress.progress)}%)` : ''}`
              )}
              {reoonProgress.status === 'completed' && 'Concluído — salvando resultados...'}
              {reoonProgress.status === 'failed' && 'Falha na verificação — os e-mails ficarão como "pendente".'}
              {reoonProgress.status === 'timeout' && 'Demorando mais que o esperado — os não confirmados ficarão "pendente".'}
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="filters-bar glass-card" style={{ padding: '16px' }}>
        <div className="search-input-wrapper" style={{ flexGrow: 1 }}>
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, email ou empresa..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="form-input"
          />
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <select className="form-select" value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)} style={{ minWidth: '180px' }}>
            <option value="Todas">Todas as Campanhas</option>
            {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-select" value={funnelFilter} onChange={e => setFunnelFilter(e.target.value)} style={{ minWidth: '160px' }}>
            <option value="Todos">Todo o Funil</option>
            <option value="scraped">Coletado</option>
            <option value="in_sequence">Em Sequência</option>
            <option value="replied">Respondeu</option>
            <option value="bounced">Retornou (Bounce)</option>
            <option value="booked">Agendado</option>
            <option value="unsubscribed">Descadastrado</option>
          </select>
          <select className="form-select" value={validationFilter} onChange={e => setValidationFilter(e.target.value)} style={{ minWidth: '160px' }}>
            <option value="Todos">Toda Validação</option>
            <option value="pending">Pendente</option>
            <option value="valid">Válido</option>
            <option value="invalid">Inválido</option>
            <option value="catch_all">Catch-all</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      {filteredLeads.length === 0 ? (
        <div className="empty-state glass-card">
          <Users size={48} className="empty-state-icon" />
          <h3>Nenhum lead encontrado</h3>
          <p>
            {leads.length === 0
              ? 'Adicione leads dentro de uma campanha (busca no Apollo ou importação de lista) para vê-los aqui.'
              : 'Ajuste os filtros de busca para ver resultados.'}
          </p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead style={{ background: 'rgba(0,0,0,0.3)' }}>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Empresa</th>
                  <th>Campanha</th>
                  <th>Validação</th>
                  <th>Status no Funil</th>
                  <th>E-mail</th>
                  <th>Adicionado em</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr key={lead.id} onClick={() => setSelectedLead(lead)} style={{ cursor: 'pointer' }}>
                    <td style={{ color: '#e2e8f0', fontWeight: 500 }}>{[lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—'}</td>
                    <td>{lead.email}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CompanyAvatar name={lead.company_name} logoUrl={lead.company_info?.logo_url} size={24} />
                        {lead.company_name || '—'}
                      </div>
                    </td>
                    <td title={lead.campaigns?.name} style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lead.campaigns?.name}
                    </td>
                    <td><ValidationStatusBadge status={lead.validation_status} /></td>
                    <td><FunnelStatusBadge status={lead.funnel_status} /></td>
                    <td>
                      {lead.current_step > 0 ? (
                        <span
                          className="badge badge-sent"
                          title={lead.last_contacted_at ? `Último envio: ${new Date(lead.last_contacted_at).toLocaleString('pt-BR')}` : undefined}
                        >
                          ✓ Enviado ({lead.current_step}){lead.last_contacted_at ? ` — ${new Date(lead.last_contacted_at).toLocaleDateString('pt-BR')}` : ''}
                        </span>
                      ) : (
                        <span className="badge badge-pending">Ainda não enviado</span>
                      )}
                    </td>
                    <td>{new Date(lead.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
    </div>
  );
}
