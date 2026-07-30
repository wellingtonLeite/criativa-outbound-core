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
      // Fetch leads that have replied or are booked
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*, campaigns!inner(name, user_id)')
        .in('funnel_status', ['replied', 'booked'])
        .order('updated_at', { ascending: false })
        .limit(50);

      if (leadsError) throw leadsError;
      setLeads(leadsData || []);

      // Extract unique campaigns for the filter dropdown
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
      
      // Update local state for immediate feedback
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

  // Client-side filtering
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
      <div className="flex justify-center items-center h-full">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-6 max-w-7xl mx-auto">
      <div className="page-header mb-8">
        <h1 className="page-title text-3xl font-bold">CRM / Inbox</h1>
        <p className="page-subtitle text-gray-400 mt-1">Leads para tratativa comercial</p>
      </div>

      {/* Mini Stats */}
      <div className="crm-stats grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="glass-card crm-stat-card p-6 rounded-xl border border-white/10 bg-white/5 flex flex-col justify-center items-center">
          <p className="text-gray-400 mb-2">Responderam</p>
          <p className="text-4xl font-bold text-cyan-400">{repliedCount}</p>
        </div>
        <div className="glass-card crm-stat-card p-6 rounded-xl border border-white/10 bg-white/5 flex flex-col justify-center items-center">
          <p className="text-gray-400 mb-2">Agendados</p>
          <p className="text-4xl font-bold text-violet-400">{bookedCount}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar flex flex-col md:flex-row gap-4 mb-6 bg-white/5 p-4 rounded-xl border border-white/10">
        <div className="search-input-wrapper relative flex-grow">
          <Search className="search-icon absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, email ou empresa..." 
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="form-input w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-primary focus:outline-none transition-colors"
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <select 
            className="form-select bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none flex-1 md:w-48 appearance-none"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="Todos">Todos os Status</option>
            <option value="Responderam">Responderam</option>
            <option value="Agendados">Agendados</option>
          </select>
          <select 
            className="form-select bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none flex-1 md:w-48 appearance-none"
            value={campaignFilter}
            onChange={e => setCampaignFilter(e.target.value)}
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
        <div className="flex flex-col items-center justify-center p-16 bg-white/5 rounded-xl border border-white/10 text-center">
          <Users size={48} className="text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">Nenhum lead encontrado</h3>
          <p className="text-gray-400">
            {leads.length === 0 
              ? 'Leads que responderem ou agendarem aparecerão aqui.' 
              : 'Tente ajustar seus filtros para ver outros resultados.'}
          </p>
        </div>
      ) : (
        <div className="data-table bg-white/5 rounded-xl border border-white/10 overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 text-gray-300 text-sm">
                <th className="p-4 font-medium">Nome</th>
                <th className="p-4 font-medium">E-mail</th>
                <th className="p-4 font-medium">Empresa</th>
                <th className="p-4 font-medium">Receita Est.</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Campanha</th>
                <th className="p-4 font-medium">Último Contato</th>
                <th className="p-4 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4 text-white">{lead.first_name || '—'}</td>
                  <td className="p-4 text-gray-300">{lead.email}</td>
                  <td className="p-4 text-gray-300">{lead.company_name || '—'}</td>
                  <td className="p-4 text-gray-300">{lead.revenue_estimated || '—'}</td>
                  <td className="p-4">
                    <span className={`badge badge-${lead.funnel_status} px-2.5 py-1 rounded-full text-xs font-medium`}>
                      {lead.funnel_status === 'replied' ? 'Respondeu' : 'Agendado'}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300 truncate max-w-[150px]" title={lead.campaigns?.name}>
                    {lead.campaigns?.name}
                  </td>
                  <td className="p-4 text-gray-400 text-sm">
                    {lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="p-4 text-right">
                    {lead.funnel_status === 'replied' ? (
                      <button 
                        onClick={() => handleStatusToggle(lead.id, lead.funnel_status)}
                        className="btn btn-sm btn-primary inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <Calendar size={14} />
                        Marcar Agendado
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleStatusToggle(lead.id, lead.funnel_status)}
                        className="btn btn-sm btn-secondary inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <RotateCcw size={14} />
                        Reverter
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
