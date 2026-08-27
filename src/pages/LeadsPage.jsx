import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockDataStore } from '../lib/mockDataStore';
import { downloadCrmReportPdf } from '../lib/typstReportGenerator';
import LeadDetailModal from '../components/LeadDetailModal';
import WhatsAppModal from '../components/WhatsAppModal';
import WhatsAppChatDrawer from '../components/WhatsAppChatDrawer';
import CompanyAvatar from '../components/CompanyAvatar';
import ValidationStatusBadge from '../components/ValidationStatusBadge';
import FunnelStatusBadge from '../components/FunnelStatusBadge';
import { 
  Search, 
  Users, 
  RefreshCw, 
  Eye, 
  Sparkles, 
  Building2, 
  MessageSquare, 
  Send, 
  FileDown, 
  CheckCircle2,
  ShieldCheck,
  Clock,
  XCircle,
  ArrowRight,
  Trash2
} from 'lucide-react';

export default function LeadsPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Modals & Drawers state
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppTargetLead, setWhatsAppTargetLead] = useState(null);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [chatDrawerTargetLead, setChatDrawerTargetLead] = useState(null);

  // Selection state for bulk operations
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());

  // Filters State — Default Quality filter shows Valid and Pending leads
  const [searchText, setSearchText] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('Todas');
  const [funnelFilter, setFunnelFilter] = useState('Todos');
  const [validationFilter, setValidationFilter] = useState('valid_pending');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handlePurgeInvalidLeads = async () => {
    if (stats.invalid === 0) {
      showToast('Nenhum lead inválido na base para purgar.');
      return;
    }
    const count = await mockDataStore.purgeInvalidLeads();
    setSelectedLeadIds(new Set());
    showToast(`🗑️ ${count} leads inválidos foram removidos permanentemente da base.`);
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.size === 0) return;
    const count = selectedLeadIds.size;
    await mockDataStore.deleteLeadsBulk(Array.from(selectedLeadIds));
    setSelectedLeadIds(new Set());
    showToast(`🗑️ ${count} leads selecionados foram excluídos da base.`);
  };

  const handleExportReport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const exportSet = selectedLeadIds.size > 0 
        ? leads.filter(l => selectedLeadIds.has(l.id))
        : (filteredLeads.length > 0 ? filteredLeads : leads);

      await downloadCrmReportPdf('relatorio-core-crm.pdf', {
        title: 'Relatório Executivo de Leads - Criativa Outbound CORE',
        leads: exportSet,
        campaigns: campaigns
      });
      showToast('Relatório PDF exportado com sucesso via motor Typst!');
    } catch (err) {
      console.error('Erro ao exportar PDF de leads:', err);
      showToast('Erro ao exportar relatório PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [leadsData, campsData] = await Promise.all([
        mockDataStore.getMockLeads(),
        mockDataStore.getMockCampaigns()
      ]);
      setLeads(leadsData || []);
      setCampaigns(campsData || []);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
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

  // Base Stats Calculations
  const stats = useMemo(() => {
    const total = leads.length;
    const valid = leads.filter(l => l.validation_status === 'valid').length;
    const pending = leads.filter(l => l.validation_status === 'pending' || !l.validation_status).length;
    const invalid = leads.filter(l => l.validation_status === 'invalid').length;
    const catchAll = leads.filter(l => l.validation_status === 'catch_all').length;
    return { total, valid, pending, invalid, catchAll };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const q = searchText.toLowerCase().trim();
      const matchSearch = !q ||
        (lead.first_name || '').toLowerCase().includes(q) ||
        (lead.last_name || '').toLowerCase().includes(q) ||
        (lead.email || '').toLowerCase().includes(q) ||
        (lead.company_name || '').toLowerCase().includes(q) ||
        (lead.cnpj || '').toLowerCase().includes(q);

      const matchCampaign = campaignFilter === 'Todas' || lead.campaigns?.name === campaignFilter;
      const matchFunnel = funnelFilter === 'Todos' || lead.funnel_status === funnelFilter;
      
      let matchValidation = true;
      if (validationFilter === 'valid_pending') {
        matchValidation = lead.validation_status !== 'invalid';
      } else if (validationFilter === 'Todos') {
        matchValidation = true;
      } else {
        matchValidation = lead.validation_status === validationFilter;
      }

      return matchSearch && matchCampaign && matchFunnel && matchValidation;
    });
  }, [leads, searchText, campaignFilter, funnelFilter, validationFilter]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const handleToggleSelectLead = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedLeadsList = useMemo(() => {
    return leads.filter(l => selectedLeadIds.has(l.id));
  }, [leads, selectedLeadIds]);

  const handleOpenSingleWhatsApp = (lead, e) => {
    if (e) e.stopPropagation();
    setChatDrawerTargetLead(lead);
    setIsChatDrawerOpen(true);
  };

  const handleOpenBulkWhatsApp = () => {
    if (selectedLeadIds.size === 0) return;
    setWhatsAppTargetLead(null);
    setIsWhatsAppModalOpen(true);
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div className="spinner" />
      </div>
    );
  }

  const isAllSelected = filteredLeads.length > 0 && selectedLeadIds.size === filteredLeads.length;

  return (
    <div className="animate-fade-in dashboard-container">
      {/* 1. Header Executivo */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Base de Leads B2B</h1>
          <p className="page-subtitle">
            Contatos e empresas mineradas para prospecção ativa ({leads.length} contatos cadastrados)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportReport}
            disabled={isExporting}
            className="btn btn-secondary"
            title="Exportar base de leads em PDF via motor Typst"
            style={{ borderColor: 'rgba(0, 212, 255, 0.35)', color: '#00d4ff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {isExporting ? (
              <>
                <span className="spinner" style={{ width: '13px', height: '13px', borderWidth: '2px' }} />
                <span>Exportando...</span>
              </>
            ) : (
              <>
                <FileDown size={15} />
                <span>Exportar Relatório</span>
              </>
            )}
          </button>

          {/* Botão de Ação Rápida: Purgar Inválidos */}
          {stats.invalid > 0 && (
            <button
              onClick={handlePurgeInvalidLeads}
              className="btn btn-secondary"
              title="Remover permanentemente todos os leads inválidos da base"
              style={{
                borderColor: 'rgba(244, 63, 94, 0.4)',
                color: '#f43f5e',
                background: 'rgba(244, 63, 94, 0.08)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Trash2 size={15} />
              <span>🗑️ Purgar Inválidos ({stats.invalid})</span>
            </button>
          )}

          {/* Botão Primário: Minerar Novos Leads (Sem Jargões) */}
          <button
            onClick={() => navigate('/prospector')}
            className="btn btn-primary"
            style={{ background: '#00d4ff', color: '#0a0a0f', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            title="Ir para o módulo de Mineração de Decisores B2B"
          >
            <Sparkles size={16} />
            <span>+ Minerar Novos Leads</span>
          </button>
        </div>
      </div>

      {/* 2. Barra de Estatísticas da Base */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        {/* Total */}
        <div className="glass-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total de Leads</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff' }}>{stats.total}</div>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
            <Users size={18} />
          </div>
        </div>

        {/* Válidos */}
        <div className="glass-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '3px solid #10b981' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>🟢 Válidos Confirmados</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#10b981' }}>{stats.valid}</div>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
            <CheckCircle2 size={18} />
          </div>
        </div>

        {/* Pendentes */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '14px 18px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            borderLeft: '3px solid #f59e0b',
            cursor: stats.pending > 0 ? 'pointer' : 'default'
          }}
          onClick={stats.pending > 0 ? () => navigate('/diagnostico') : undefined}
          title={stats.pending > 0 ? 'Clique para ir para a tela de Higienização (Passo 2)' : undefined}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>🟡 Aguardando Validação</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f59e0b' }}>{stats.pending}</div>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
            <Clock size={18} />
          </div>
        </div>

        {/* Inválidos com Ação Rápida de Limpeza */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '14px 18px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            borderLeft: '3px solid #f43f5e',
            cursor: stats.invalid > 0 ? 'pointer' : 'default'
          }}
          onClick={stats.invalid > 0 ? handlePurgeInvalidLeads : undefined}
          title={stats.invalid > 0 ? 'Clique para purgar todos os leads inválidos da base' : undefined}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>🔴 Inválidos Descartados</span>
              {stats.invalid > 0 && <span style={{ fontSize: '0.68rem', color: '#f43f5e', textDecoration: 'underline' }}>(Purgar)</span>}
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f43f5e' }}>{stats.invalid}</div>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e' }}>
            <Trash2 size={18} />
          </div>
        </div>
      </div>

      {/* Floating / Top Bulk Action Bar */}
      {selectedLeadIds.size > 0 && (
        <div className="glass-card animate-fade-in" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          marginBottom: '16px',
          background: 'rgba(0, 212, 255, 0.08)',
          border: '1px solid rgba(0, 212, 255, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 600, color: '#00d4ff' }}>{selectedLeadIds.size}</span>
            <span style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>leads selecionados para ação em lote</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleOpenBulkWhatsApp}
              className="btn btn-sm btn-primary"
              style={{ background: '#10b981', color: '#0a0a0f', fontWeight: 600 }}
            >
              <Send size={14} /> Disparar WhatsApp ({selectedLeadIds.size})
            </button>
            <button
              onClick={handleBulkDelete}
              className="btn btn-sm btn-secondary"
              style={{ color: '#f43f5e', borderColor: 'rgba(244,63,94,0.3)' }}
            >
              <Trash2 size={14} /> Excluir ({selectedLeadIds.size})
            </button>
            <button
              onClick={() => setSelectedLeadIds(new Set())}
              className="btn btn-sm btn-secondary"
            >
              Limpar Seleção
            </button>
          </div>
        </div>
      )}

      {/* 3. Barra de Filtros Proporcional e Elegante */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, 1.4fr) minmax(160px, 1fr) minmax(170px, 1fr) minmax(190px, 1.2fr)',
          gap: '14px',
          alignItems: 'center'
        }}>
          {/* Busca por texto */}
          <div className="search-input-wrapper" style={{ minWidth: '0' }}>
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="Buscar por nome, email, empresa ou CNPJ..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="form-input"
            />
          </div>

          {/* Filtro de Campanha */}
          <div>
            <select className="form-select" value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)}>
              <option value="Todas">Todas as Campanhas</option>
              {campaigns.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          {/* Filtro de Funil */}
          <div>
            <select className="form-select" value={funnelFilter} onChange={e => setFunnelFilter(e.target.value)}>
              <option value="Todos">Todo o Funil</option>
              <option value="scraped">Coletado (Aguardando Envio)</option>
              <option value="in_sequence">Em Sequência (Disparado)</option>
              <option value="replied">Respondeu 🔥</option>
              <option value="booked">Reunião Agendada 🎯</option>
              <option value="bounced">Retornou (Bounce)</option>
              <option value="unsubscribed">Descadastrado</option>
            </select>
          </div>

          {/* Filtro de Validação — Default: Válidos & Pendentes */}
          <div>
            <select className="form-select" value={validationFilter} onChange={e => setValidationFilter(e.target.value)}>
              <option value="valid_pending">Qualidade: Válidos & Pendentes (Padrão)</option>
              <option value="Todos">Todos os Status (inclui Inválidos)</option>
              <option value="valid">🟢 Apenas Válidos</option>
              <option value="pending">🟡 Apenas Aguardando Validação</option>
              <option value="catch_all">🟡 Apenas Catch-all</option>
              <option value="invalid">🔴 Apenas Inválidos</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Tabela de Leads ou Empty State */}
      {filteredLeads.length === 0 ? (
        <div className="empty-state glass-card" style={{ padding: '56px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(0, 212, 255, 0.1)', color: '#00d4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={28} />
          </div>
          <div>
            <h3 style={{ color: '#e2e8f0', fontSize: '1.15rem', fontWeight: 600, marginBottom: '6px' }}>
              {leads.length === 0 ? 'Nenhum lead na base no momento' : 'Nenhum lead encontrado com os filtros'}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0, maxWidth: '480px', lineHeight: 1.5 }}>
              {leads.length === 0
                ? 'Sua base de contatos está pronta para receber novas prospecções. Inicie a mineração de decisores B2B agora mesmo!'
                : 'Ajuste os filtros de busca para visualizar os registros.'}
            </p>
          </div>
          {leads.length === 0 ? (
            <button
              onClick={() => navigate('/prospector')}
              className="btn btn-primary"
              style={{ background: '#00d4ff', color: '#0a0a0f', fontWeight: 700, padding: '10px 24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Sparkles size={16} />
              <span>+ Minerar Novos Leads</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setSearchText('');
                setCampaignFilter('Todas');
                setFunnelFilter('Todos');
                setValidationFilter('valid_pending');
              }}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.82rem' }}
            >
              Limpar Filtros
            </button>
          )}
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead style={{ background: 'rgba(0,0,0,0.3)' }}>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      style={{ cursor: 'pointer', accentColor: '#00d4ff' }}
                      title="Selecionar todos os leads filtrados"
                    />
                  </th>
                  <th>Nome & Cargo</th>
                  <th>E-mail</th>
                  <th>Empresa & CNPJ</th>
                  <th>Campanha</th>
                  <th>Validação</th>
                  <th>Status no Funil</th>
                  <th>Envios</th>
                  <th>Adicionado em</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => {
                  const isSelected = selectedLeadIds.has(lead.id);
                  return (
                    <tr 
                      key={lead.id} 
                      onClick={() => setSelectedLead(lead)} 
                      style={{ 
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(0, 212, 255, 0.04)' : undefined
                      }}
                    >
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelectLead(lead.id, e)}
                          style={{ cursor: 'pointer', accentColor: '#00d4ff' }}
                        />
                      </td>
                      <td style={{ color: '#e2e8f0', fontWeight: 500 }}>
                        <div>{[lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{lead.person_info?.title || 'Decisor'}</div>
                      </td>
                      <td>{lead.email}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CompanyAvatar name={lead.company_name} logoUrl={lead.company_info?.logo_url} size={24} />
                          <div>
                            <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{lead.company_name || '—'}</div>
                            {lead.cnpj && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{lead.cnpj}</div>}
                          </div>
                        </div>
                      </td>
                      <td title={lead.campaigns?.name} style={{ maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lead.campaigns?.name || '—'}
                      </td>
                      <td><ValidationStatusBadge status={lead.validation_status} /></td>
                      <td><FunnelStatusBadge status={lead.funnel_status} /></td>
                      <td>
                        {lead.current_step > 0 ? (
                          <span
                            className="badge badge-sent"
                            title={lead.last_contacted_at ? `Último envio: ${new Date(lead.last_contacted_at).toLocaleString('pt-BR')}` : undefined}
                          >
                            ✓ Step {lead.current_step}
                          </span>
                        ) : (
                          <span className="badge badge-pending">Na fila (Step 0)</span>
                        )}
                      </td>
                      <td>{new Date(lead.created_at).toLocaleDateString('pt-BR')}</td>
                      <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {/* Single WhatsApp Trigger Action Button */}
                          <button
                            onClick={(e) => handleOpenSingleWhatsApp(lead, e)}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#10b981', borderColor: 'rgba(16,185,129,0.2)' }}
                            title="Disparar WhatsApp via Evolution API"
                          >
                            <MessageSquare size={13} /> WhatsApp
                          </button>

                          <button 
                            onClick={() => setSelectedLead(lead)}
                            className="btn-icon"
                            title="Ver ficha completa do Lead"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Evolution WhatsApp Chat Drawer for Individual Lead */}
      <WhatsAppChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => {
          setIsChatDrawerOpen(false);
          setChatDrawerTargetLead(null);
        }}
        lead={chatDrawerTargetLead}
        onMessageSent={() => {
          setLeads(mockDataStore.getLeadsSync());
        }}
      />

      {/* Evolution WhatsApp Modal (Bulk Dispatches) */}
      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => {
          setIsWhatsAppModalOpen(false);
          setWhatsAppTargetLead(null);
        }}
        lead={whatsAppTargetLead}
        selectedLeads={whatsAppTargetLead ? [whatsAppTargetLead] : selectedLeadsList}
        onDispatchComplete={() => {
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
