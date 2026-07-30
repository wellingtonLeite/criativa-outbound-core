import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Calendar, RotateCcw, Users } from 'lucide-react';

export default function CRMPage() {
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [campaignFilter, setCampaignFilter] = useState('Todos');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*, campaigns!inner(name, user_id)')
        .in('funnel_status', ['replied', 'booked'])
        .order('updated_at', { ascending: false })
        .limit(50);

      if (leadsError) throw leadsError;
      setLeads(leadsData || []);

      const uniqueCampaigns = Array.from(new Set((leadsData || []).map(l => l.campaigns?.name))).filter(Boolean);
      setCampaigns(uniqueCampaigns);

    } catch (error) {
      console.error('Erro ao buscar dados do CRM:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === 'replied' ? 'booked' : 'replied';
    try {
      const { error } = await supabase
        .from('leads')
        .update({ funnel_status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === id ? { ...lead, funnel_status: newStatus, updated_at: new Date().toISOString() } : lead
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar status do lead:', error);
      alert('Erro ao atualizar status');
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchSearch = 
        (lead.first_name || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (lead.email || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (lead.company_name || '').toLowerCase().includes(searchText.toLowerCase());
      
      const matchStatus = 
        statusFilter === 'Todos' || 
        (statusFilter === 'Responderam' && lead.funnel_status === 'replied') ||
        (statusFilter === 'Agendados' && lead.funnel_status === 'booked');
        
      const matchCampaign = 
        campaignFilter === 'Todos' || 
        lead.campaigns?.name === campaignFilter;

      return matchSearch && matchStatus && matchCampaign;
    });
  }, [leads, searchText, statusFilter, campaignFilter]);

  const repliedCount = leads.filter(l => l.funnel_status === 'replied').length;
  const bookedCount = leads.filter(l => l.funnel_status === 'booked').length;

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
          <h1 className="page-title">CRM / Inbox</h1>
          <p className="page-subtitle">Leads quentes para tratativa comercial</p>
        </div>
      </div>

      {/* Mini Stats */}
      <div className="crm-stats">
        <div className="glass-card crm-stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <p className="crm-stat-label">Responderam</p>
          <p className="crm-stat-value" style={{ color: '#00d4ff' }}>{repliedCount}</p>
        </div>
        <div className="glass-card crm-stat-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <p className="crm-stat-label">Agendados</p>
          <p className="crm-stat-value" style={{ color: '#7c3aed' }}>{bookedCount}</p>
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
          <select 
            className="form-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ minWidth: '180px' }}
          >
            <option value="Todos">Todos os Status</option>
            <option value="Responderam">Responderam</option>
            <option value="Agendados">Agendados</option>
          </select>
          <select 
            className="form-select"
            value={campaignFilter}
            onChange={e => setCampaignFilter(e.target.value)}
            style={{ minWidth: '200px' }}
          >
            <option value="Todos">Todas as Campanhas</option>
            {campaigns.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
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
              ? 'Leads que responderem ou agendarem aparecerão aqui.' 
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
                  <th>Receita Est.</th>
                  <th>Status</th>
                  <th>Campanha</th>
                  <th>Último Contato</th>
                  <th style={{ textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr key={lead.id}>
                    <td style={{ color: '#e2e8f0', fontWeight: 500 }}>{lead.first_name || '—'}</td>
                    <td>{lead.email}</td>
                    <td>{lead.company_name || '—'}</td>
                    <td>{lead.revenue_estimated || '—'}</td>
                    <td>
                      <span className={`badge ${lead.funnel_status === 'replied' ? 'badge-replied' : 'badge-booked'}`}>
                        {lead.funnel_status === 'replied' ? 'Respondeu' : 'Agendado'}
                      </span>
                    </td>
                    <td title={lead.campaigns?.name} style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lead.campaigns?.name}
                    </td>
                    <td>
                      {lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {lead.funnel_status === 'replied' ? (
                        <button 
                          onClick={() => handleStatusToggle(lead.id, lead.funnel_status)}
                          className="btn btn-sm btn-primary"
                          style={{ background: '#3b82f6' }}
                        >
                          <Calendar size={14} /> Agendado
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleStatusToggle(lead.id, lead.funnel_status)}
                          className="btn btn-sm btn-secondary"
                        >
                          <RotateCcw size={14} /> Reverter
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
