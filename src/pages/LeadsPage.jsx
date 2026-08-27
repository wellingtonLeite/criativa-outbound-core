import React, { useState, useEffect, useMemo } from 'react';
import { mockDataStore } from '../lib/mockDataStore';
import { downloadCrmReportPdf } from '../lib/typstReportGenerator';
import LeadDetailModal from '../components/LeadDetailModal';
import MiningModal from '../components/MiningModal';
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
  CheckSquare, 
  Square,
  Bot,
  FileDown,
  CheckCircle2
} from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Modals state
  const [isMiningModalOpen, setIsMiningModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppTargetLead, setWhatsAppTargetLead] = useState(null);

  // WhatsApp Single Chat Drawer state
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [chatDrawerTargetLead, setChatDrawerTargetLead] = useState(null);

  // Selection state for bulk operations
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());

  const [searchText, setSearchText] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('Todas');
  const [funnelFilter, setFunnelFilter] = useState('Todos');
  const [validationFilter, setValidationFilter] = useState('Todos');

  const [revalidating, setRevalidating] = useState(false);
  const [reoonProgress, setReoonProgress] = useState(null);

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

  const pendingLeads = useMemo(() => leads.filter(l => l.validation_status === 'pending'), [leads]);

  const handleRevalidateAllPending = async () => {
    if (pendingLeads.length === 0) return;
    setRevalidating(true);
    setReoonProgress({ status: 'running', checked: 0, total: pendingLeads.length, progress: 20 });

    try {
      // Simulate stepped verification feedback
      await new Promise(r => setTimeout(r, 400));
      setReoonProgress({ status: 'running', checked: Math.floor(pendingLeads.length / 2), total: pendingLeads.length, progress: 60 });
      await new Promise(r => setTimeout(r, 400));
      setReoonProgress({ status: 'completed', checked: pendingLeads.length, total: pendingLeads.length, progress: 100 });

      for (const lead of pendingLeads) {
        await mockDataStore.updateLead(lead.id, {
          validation_status: 'valid',
          funnel_status: lead.funnel_status === 'scraped' ? 'in_sequence' : lead.funnel_status
        });
      }

      const updated = mockDataStore.getLeadsSync();
      setLeads(updated);
    } catch (error) {
      console.error('Erro ao revalidar leads pendentes:', error);
    } finally {
      setRevalidating(false);
      setTimeout(() => setReoonProgress(null), 1500);
    }
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

      const matchCampaign = campaignFilter === 'Todas' || lead.campaigns?.name === campaignFilter;
      const matchFunnel = funnelFilter === 'Todos' || lead.funnel_status === funnelFilter;
      const matchValidation = validationFilter === 'Todos' || lead.validation_status === validationFilter;

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
        <div className="spinner"></div>
      </div>
    );
  }

  const isAllSelected = filteredLeads.length > 0 && selectedLeadIds.size === filteredLeads.length;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Base de Leads B2B</h1>
          <p className="page-subtitle">Contatos e empresas mineradas para prospecção ativa ({leads.length} leads cadastrados)</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleExportReport}
            disabled={isExporting}
            className="btn btn-secondary"
            title="Exportar base de leads em PDF via motor Typst"
            style={{ borderColor: 'rgba(0, 212, 255, 0.35)', color: '#00d4ff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {isExporting ? (
              <>
                <span className="spinner-sm" style={{ width: '13px', height: '13px', border: '2px solid rgba(0,212,255,0.3)', borderTopColor: '#00d4ff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                <span>Exportando...</span>
              </>
            ) : (
              <>
                <FileDown size={15} />
                <span>Exportar Relatório</span>
              </>
            )}
          </button>

          {pendingLeads.length > 0 && (
            <button
              onClick={handleRevalidateAllPending}
              disabled={revalidating}
              className="btn btn-secondary"
            >
              <RefreshCw size={16} className={revalidating ? 'animate-spin' : ''} />
              {revalidating ? 'Higienizando...' : `Validar Pendentes (${pendingLeads.length})`}
            </button>
          )}

          {/* Crawlee Mining Trigger Button */}
          <button
            onClick={() => setIsMiningModalOpen(true)}
            className="btn btn-primary"
            style={{ background: '#00d4ff', color: '#0a0a0f', fontWeight: 600 }}
            title="Abrir gerador de mineração em massa com Crawlee e DuckDB"
          >
            <Sparkles size={16} /> Nova Mineração (Crawlee)
          </button>
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
              onClick={() => setSelectedLeadIds(new Set())}
              className="btn btn-sm btn-secondary"
            >
              Limpar Seleção
            </button>
          </div>
        </div>
      )}

      {/* Reoon verification status indicator */}
      {reoonProgress && (
        <div className="glass-card" style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', marginBottom: '20px',
          border: '1px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.07)'
        }}>
          <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', flexShrink: 0 }}></div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>
              Higienizando e-mails na Reoon — {reoonProgress.total} contato{reoonProgress.total > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              {reoonProgress.status === 'running' && `Processando lista... (${reoonProgress.progress}%)`}
              {reoonProgress.status === 'completed' && 'Concluído com sucesso — todos os contatos válidos foram atualizados!'}
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
            placeholder="Buscar por nome, email, empresa ou CNPJ..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="form-input"
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select className="form-select" value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)} style={{ minWidth: '180px' }}>
            <option value="Todas">Todas as Campanhas</option>
            {campaigns.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <select className="form-select" value={funnelFilter} onChange={e => setFunnelFilter(e.target.value)} style={{ minWidth: '160px' }}>
            <option value="Todos">Todo o Funil</option>
            <option value="scraped">Coletado</option>
            <option value="in_sequence">Em Sequência</option>
            <option value="replied">Respondeu</option>
            <option value="booked">Agendado</option>
            <option value="bounced">Retornou (Bounce)</option>
            <option value="unsubscribed">Descadastrado</option>
          </select>
          <select className="form-select" value={validationFilter} onChange={e => setValidationFilter(e.target.value)} style={{ minWidth: '160px' }}>
            <option value="Todos">Toda Validação</option>
            <option value="valid">Válido</option>
            <option value="catch_all">Catch-all</option>
            <option value="pending">Pendente</option>
            <option value="invalid">Inválido</option>
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
              ? 'Nenhum contato encontrado no repositório. Use o botão "Nova Mineração (Crawlee)" para gerar contatos.'
              : 'Ajuste os filtros de busca para visualizar os registros.'}
          </p>
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

      {/* Crawlee Mining Modal */}
      <MiningModal
        isOpen={isMiningModalOpen}
        onClose={() => setIsMiningModalOpen(false)}
        onMiningComplete={() => {
          setLeads(mockDataStore.getLeadsSync());
        }}
      />

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
