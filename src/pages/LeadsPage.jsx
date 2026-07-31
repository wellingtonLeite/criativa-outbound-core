import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import LeadDetailModal from '../components/LeadDetailModal';
import CompanyAvatar from '../components/CompanyAvatar';
import ValidationStatusBadge from '../components/ValidationStatusBadge';
import { Search, Users } from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);

  const [searchText, setSearchText] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('Todas');
  const [funnelFilter, setFunnelFilter] = useState('Todos');
  const [validationFilter, setValidationFilter] = useState('Todos');

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
      </div>

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
            <option value="scraped">Scraped</option>
            <option value="in_sequence">Em Sequência</option>
            <option value="replied">Respondeu</option>
            <option value="bounced">Bounced</option>
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
                    <td><span className={`badge badge-${lead.funnel_status}`}>{lead.funnel_status}</span></td>
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
