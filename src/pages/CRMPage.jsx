import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockDataStore } from '../lib/mockDataStore';
import { downloadCrmReportPdf } from '../lib/typstReportGenerator';
import { 
  Search, 
  Calendar, 
  RotateCcw, 
  Users, 
  Columns3, 
  ListFilter, 
  CheckCircle2, 
  Flame, 
  Building2, 
  Phone, 
  Mail, 
  ArrowRight,
  TrendingUp,
  Sparkles,
  Eye,
  MessageSquare,
  Send,
  FileDown
} from 'lucide-react';
import LeadDetailModal from '../components/LeadDetailModal';
import WhatsAppChatDrawer from '../components/WhatsAppChatDrawer';
import CompanyAvatar from '../components/CompanyAvatar';
import FunnelStatusBadge from '../components/FunnelStatusBadge';

export default function CRMPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'

  // Report export & toast state
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // WhatsApp drawer state
  const [whatsAppDrawerOpen, setWhatsAppDrawerOpen] = useState(false);
  const [whatsAppTargetLead, setWhatsAppTargetLead] = useState(null);

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [campaignFilter, setCampaignFilter] = useState('Todos');
  const [qualificationFilter, setQualificationFilter] = useState('Todos');

  const loadData = async () => {
    setLoading(true);
    try {
      const [leadsData, campsData] = await Promise.all([
        mockDataStore.getMockLeads(),
        mockDataStore.getMockCampaigns()
      ]);
      setLeads(leadsData || []);
      setCampaigns(campsData || []);
    } catch (err) {
      console.error('Erro ao carregar dados do CRM:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = mockDataStore.subscribe(() => {
      setLeads(mockDataStore.getLeadsSync());
      setCampaigns(mockDataStore.getCampaignsSync());
    });
    return () => unsubscribe();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleExportReport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await downloadCrmReportPdf('relatorio-core-crm.pdf', {
        title: 'Relatório Executivo CRM - Funil e Oportunidades',
        leads: filteredLeads.length > 0 ? filteredLeads : leads,
        campaigns: campaigns
      });
      showToast('Relatório PDF exportado com sucesso via motor Typst!');
    } catch (err) {
      console.error('Erro ao exportar PDF do CRM:', err);
      showToast('Erro ao exportar relatório PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleStatusChange = async (id, newStatus, e) => {
    if (e) e.stopPropagation();
    try {
      await mockDataStore.updateLeadStatus(id, newStatus);
      const updated = mockDataStore.getLeadsSync();
      setLeads(updated);
    } catch (error) {
      console.error('Erro ao atualizar status do lead:', error);
    }
  };

  const handleOpenWhatsApp = (lead, e) => {
    if (e) e.stopPropagation();
    setWhatsAppTargetLead(lead);
    setWhatsAppDrawerOpen(true);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const q = searchText.toLowerCase().trim();
      const matchSearch = !q ||
        (lead.first_name || '').toLowerCase().includes(q) ||
        (lead.last_name || '').toLowerCase().includes(q) ||
        (lead.email || '').toLowerCase().includes(q) ||
        (lead.company_name || '').toLowerCase().includes(q) ||
        (lead.cnpj || '').toLowerCase().includes(q);

      const matchStatus = statusFilter === 'Todos' || lead.funnel_status === statusFilter;
      const matchCampaign = campaignFilter === 'Todos' || lead.campaigns?.name === campaignFilter;
      const matchQualification = qualificationFilter === 'Todos' || lead.qualification_status === qualificationFilter;

      return matchSearch && matchStatus && matchCampaign && matchQualification;
    });
  }, [leads, searchText, statusFilter, campaignFilter, qualificationFilter]);

  // Funnel stats
  const repliedCount = leads.filter(l => l.funnel_status === 'replied').length;
  const bookedCount = leads.filter(l => l.funnel_status === 'booked').length;
  const inSequenceCount = leads.filter(l => l.funnel_status === 'in_sequence').length;
  const hotCount = leads.filter(l => l.qualification_status === 'hot').length;
  const kanbanColumns = [
    { key: 'in_sequence', label: 'Em Sequência', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    { key: 'replied', label: 'Respondeu 🔥', color: '#00d4ff', bg: 'rgba(0,212,255,0.08)' },
    { key: 'booked', label: 'Reunião Agendada 🎯', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' }
  ];

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">CRM Pipeline & Inbox</h1>
          <p className="page-subtitle">Gestão visual do funil comercial e oportunidades qualificadas (B2B Brasil)</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleExportReport}
            disabled={isExporting}
            className="btn btn-secondary"
            title="Exportar dados do CRM em PDF"
            style={{ borderColor: 'rgba(0, 212, 255, 0.35)', color: '#00d4ff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {isExporting ? (
              <>
                <span className="spinner" style={{ width: '13px', height: '13px', borderWidth: '2px' }}></span>
                <span>Gerando PDF...</span>
              </>
            ) : (
              <>
                <FileDown size={15} />
                <span>Exportar Relatório</span>
              </>
            )}
          </button>

          <button
            onClick={() => setViewMode('kanban')}
            className={`btn btn-sm ${viewMode === 'kanban' ? 'btn-primary' : 'btn-secondary'}`}
            title="Visualização em Kanban"
          >
            <Columns3 size={15} /> Funil Visual
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
            title="Visualização em Tabela"
          >
            <ListFilter size={15} /> Lista Detalhada
          </button>

          <button
            onClick={() => navigate('/campaigns')}
            className="btn btn-primary"
            style={{ background: '#7c3aed', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Send size={15} />
            <span>Gerenciar Campanhas</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="metric-label">Respostas Quentes 🔥</div>
            <div className="metric-value">{repliedCount}</div>
          </div>
          <div style={{ padding: '10px', background: 'rgba(0,212,255,0.1)', borderRadius: '10px', color: '#00d4ff' }}>
            <MessageSquare size={22} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="metric-label">Reuniões Agendadas 🎯</div>
            <div className="metric-value">{bookedCount}</div>
          </div>
          <div style={{ padding: '10px', background: 'rgba(124,58,237,0.1)', borderRadius: '10px', color: '#7c3aed' }}>
            <Calendar size={22} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="metric-label">Em Sequência Ativa</div>
            <div className="metric-value">{inSequenceCount}</div>
          </div>
          <div style={{ padding: '10px', background: 'rgba(245,158,11,0.1)', borderRadius: '10px', color: '#f59e0b' }}>
            <Send size={22} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="metric-label">Leads Hot / Qualificados</div>
            <div className="metric-value">{hotCount}</div>
          </div>
          <div style={{ padding: '10px', background: 'rgba(10,185,129,0.1)', borderRadius: '10px', color: '#10b981' }}>
            <Sparkles size={22} />
          </div>
        </div>
      </div>

      {/* Control Bar: View Toggle & Filters */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div className="search-input-wrapper" style={{ flex: 1, minWidth: '240px' }}>
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Buscar por nome, empresa, e-mail ou CNPJ..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="form-input"
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ minWidth: '170px' }}
          >
            <option value="Todos">Todo o Funil</option>
            <option value="scraped">Coletado</option>
            <option value="in_sequence">Em Sequência</option>
            <option value="replied">Respondeu 🔥</option>
            <option value="booked">Reunião Agendada 🎯</option>
          </select>

          <select
            className="form-select"
            value={campaignFilter}
            onChange={e => setCampaignFilter(e.target.value)}
            style={{ minWidth: '190px' }}
          >
            <option value="Todos">Todas as Campanhas</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select
            className="form-select"
            value={qualificationFilter}
            onChange={e => setQualificationFilter(e.target.value)}
            style={{ minWidth: '150px' }}
          >
            <option value="Todos">Qualificação</option>
            <option value="hot">Hot (Quente)</option>
            <option value="warm">Warm (Morno)</option>
            <option value="qualified">Qualified</option>
            <option value="cold">Cold</option>
          </select>
        </div>
      </div>

      {/* Content Rendering: Kanban vs Table */}
      {viewMode === 'kanban' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', alignItems: 'start' }}>
          {kanbanColumns.map(col => {
            const colLeads = filteredLeads.filter(l => l.funnel_status === col.key);
            return (
              <div 
                key={col.key} 
                className="glass-card" 
                style={{ 
                  padding: '16px', 
                  minHeight: '520px', 
                  borderTop: `3px solid ${col.color}`,
                  background: 'rgba(255,255,255,0.02)'
                }}
              >
                {/* Column Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: col.color }}></span>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0' }}>{col.label}</h3>
                  </div>
                  <span className="badge" style={{ background: col.bg, color: col.color, fontWeight: 700 }}>
                    {colLeads.length}
                  </span>
                </div>

                {/* Column Leads List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {colLeads.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '36px 14px',
                      color: '#64748b',
                      fontSize: '0.82rem',
                      border: '1px dashed rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.01)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>Nenhum lead neste estágio</span>
                    </div>
                  ) : (
                    colLeads.map(lead => (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className="glass-card"
                        style={{
                          padding: '16px',
                          cursor: 'pointer',
                          background: 'rgba(22, 22, 42, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <CompanyAvatar name={lead.company_name} logoUrl={lead.company_info?.logo_url} size={32} />
                            <div>
                              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
                                {[lead.first_name, lead.last_name].filter(Boolean).join(' ')}
                              </h4>
                              <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{lead.person_info?.title || lead.company_name}</p>
                            </div>
                          </div>
                          {lead.qualification_status === 'hot' && (
                            <span className="badge" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e', fontSize: '0.7rem' }}>
                              HOT 🔥
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Building2 size={13} color="#64748b" />
                            <span style={{ fontWeight: 500 }}>{lead.company_name}</span>
                          </div>
                          {lead.cnpj && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              CNPJ: {lead.cnpj}
                            </div>
                          )}
                          {lead.phone && (
                            <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={12} /> {lead.phone}
                            </div>
                          )}
                          {lead.revenue_estimated && (
                            <div style={{ fontSize: '0.75rem', color: '#10b981' }}>
                              {lead.revenue_estimated}
                            </div>
                          )}
                        </div>

                        {/* Quick action buttons */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {lead.campaigns?.name || 'Campanha'}
                          </span>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            {/* Evolution WhatsApp Action Trigger */}
                            <button
                              onClick={(e) => handleOpenWhatsApp(lead, e)}
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#10b981', borderColor: 'rgba(16,185,129,0.25)' }}
                              title="Disparar WhatsApp via Evolution API"
                            >
                              <MessageSquare size={12} /> WhatsApp
                            </button>

                            {col.key === 'in_sequence' && (
                              <button
                                onClick={(e) => handleStatusChange(lead.id, 'replied', e)}
                                className="btn btn-sm btn-primary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#00d4ff', color: '#0a0a0f' }}
                                title="Marcar como Respondeu"
                              >
                                <ArrowRight size={12} /> Respondeu
                              </button>
                            )}

                            {col.key === 'replied' && (
                              <button
                                onClick={(e) => handleStatusChange(lead.id, 'booked', e)}
                                className="btn btn-sm btn-primary"
                                style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#7c3aed', color: '#fff' }}
                                title="Agendar Reunião Comercial"
                              >
                                <Calendar size={12} /> Agendar
                              </button>
                            )}

                            {col.key === 'booked' && (
                              <button
                                onClick={(e) => handleStatusChange(lead.id, 'replied', e)}
                                className="btn btn-sm btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                title="Reverter para Respondeu"
                              >
                                <RotateCcw size={12} /> Reverter
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        filteredLeads.length === 0 ? (
          <div className="empty-state glass-card" style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(0, 212, 255, 0.1)', color: '#00d4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={26} />
            </div>
            <div>
              <h3 style={{ color: '#e2e8f0', fontSize: '1.05rem', fontWeight: 600, marginBottom: '4px' }}>
                {leads.length === 0 ? 'Nenhum lead no pipeline no momento' : 'Nenhum lead encontrado no funil'}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.84rem', margin: 0, maxWidth: '440px', lineHeight: 1.4 }}>
                {leads.length === 0 ? 'Sua base de CRM está limpa e pronta para novas prospecções. Inicie a mineração de decisores para alimentar o funil!' : 'Ajuste os filtros de busca para ver resultados.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <tr>
                    <th>Nome</th>
                    <th>Empresa & CNPJ</th>
                    <th>E-mail</th>
                    <th>Telefone</th>
                    <th>Receita Est.</th>
                    <th>Status no Funil</th>
                    <th>Campanha</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map(lead => (
                    <tr 
                      key={lead.id} 
                      onClick={() => setSelectedLead(lead)} 
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CompanyAvatar name={lead.company_name} logoUrl={lead.company_info?.logo_url} size={28} />
                          <div>
                            <div style={{ color: '#e2e8f0', fontWeight: 500 }}>
                              {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {lead.person_info?.title || 'Decisor B2B'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{lead.company_name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{lead.cnpj || '—'}</div>
                      </td>
                      <td>{lead.email}</td>
                      <td>{lead.phone || '—'}</td>
                      <td>
                        <span style={{ color: '#10b981', fontWeight: 500 }}>
                          {lead.revenue_estimated || '—'}
                        </span>
                      </td>
                      <td>
                        <FunnelStatusBadge status={lead.funnel_status} />
                      </td>
                      <td title={lead.campaigns?.name} style={{ maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lead.campaigns?.name || '—'}
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {/* Evolution WhatsApp Action */}
                          <button
                            onClick={(e) => handleOpenWhatsApp(lead, e)}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#10b981', borderColor: 'rgba(16,185,129,0.25)' }}
                            title="Disparar WhatsApp via Evolution API"
                          >
                            <MessageSquare size={13} /> WhatsApp
                          </button>

                          {lead.funnel_status === 'replied' ? (
                            <button
                              onClick={(e) => handleStatusChange(lead.id, 'booked', e)}
                              className="btn btn-sm btn-primary"
                              style={{ background: '#7c3aed' }}
                            >
                              <Calendar size={13} /> Agendado
                            </button>
                          ) : lead.funnel_status === 'booked' ? (
                            <button
                              onClick={(e) => handleStatusChange(lead.id, 'replied', e)}
                              className="btn btn-sm btn-secondary"
                            >
                              <RotateCcw size={13} /> Reverter
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleStatusChange(lead.id, 'replied', e)}
                              className="btn btn-sm btn-primary"
                              style={{ background: '#00d4ff', color: '#0a0a0f' }}
                            >
                              <CheckCircle2 size={13} /> Respondeu
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="btn-icon"
                            title="Ver detalhes completos"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Evolution WhatsApp Chat Drawer */}
      <WhatsAppChatDrawer
        isOpen={whatsAppDrawerOpen}
        onClose={() => {
          setWhatsAppDrawerOpen(false);
          setWhatsAppTargetLead(null);
        }}
        lead={whatsAppTargetLead}
        onMessageSent={() => {
          setLeads(mockDataStore.getLeadsSync());
        }}
      />

      {/* Complete Lead Detail Modal */}
      <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />

      {/* Export Toast Notification */}
      {toastMessage && (
        <div 
          className="animate-fade-in"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'rgba(15, 23, 42, 0.96)',
            border: '1px solid #00d4ff',
            boxShadow: '0 8px 32px rgba(0, 212, 255, 0.25)',
            backdropFilter: 'blur(12px)',
            borderRadius: '8px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#e2e8f0',
            fontSize: '0.88rem',
            zIndex: 9999
          }}
        >
          <CheckCircle2 size={18} color="#00d4ff" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
