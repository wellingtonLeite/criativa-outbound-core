import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockDataStore } from '../lib/mockDataStore';
import { downloadCrmReportPdf } from '../lib/typstReportGenerator';
import { fetchInstanceDetails } from '../lib/evolutionClient';
import WhatsAppChatDrawer from '../components/WhatsAppChatDrawer';
import EventTypeBadge from '../components/EventTypeBadge';
import { 
  Users, 
  ShieldCheck, 
  Send, 
  MessageSquare, 
  Flame, 
  Calendar, 
  Activity, 
  Sparkles, 
  FileDown, 
  CheckCircle2,
  TrendingUp,
  Megaphone,
  ArrowRight,
  ChevronRight,
  Database,
  MailCheck,
  Check
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar 
} from 'recharts';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  
  // WhatsApp & Drawer State
  const [whatsAppInfo, setWhatsAppInfo] = useState({
    isConnected: false,
    status: 'close',
    profileName: null,
    formattedPhone: null,
    instanceName: 'Criativa-Core-Outbound'
  });
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [chatTargetLead, setChatTargetLead] = useState(null);

  // Selected stage in interactive funnel
  const [selectedStageIndex, setSelectedStageIndex] = useState(null);

  const [metrics, setMetrics] = useState({
    total_leads: 175,
    validated_leads: 148,
    replied_leads: 34,
    booked_leads: 18,
    emails_sent_today: 87,
    whatsapp_sent_today: 42,
    conversion_rate: '22.8%',
    active_campaigns: 3,
    apollo_credits_remaining: 1850,
    reoon_daily_credits: 420,
    activity_7_days: [],
    funnel_distribution: []
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [leadsList, setLeadsList] = useState([]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const checkWhatsAppStatus = useCallback(async () => {
    try {
      const details = await fetchInstanceDetails('Criativa-Core-Outbound');
      setWhatsAppInfo(details);
    } catch (e) {
      console.warn('[DashboardPage] Erro ao verificar status do WhatsApp:', e);
    }
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [m, logs, leads] = await Promise.all([
        mockDataStore.getMockMetrics(),
        mockDataStore.getMockLogs(12),
        mockDataStore.getMockLeads()
      ]);
      setMetrics(m);
      setRecentLogs(logs || []);
      setLeadsList(leads || []);
      await checkWhatsAppStatus();
    } catch (err) {
      console.error('Erro ao carregar dados da Torre de Controle:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const handleSync = () => {
      setMetrics(mockDataStore.getMetricsSync());
      setRecentLogs(mockDataStore.getLogsSync(12));
      setLeadsList(mockDataStore.getLeadsSync());
      checkWhatsAppStatus();
    };

    const unsubscribe = mockDataStore.subscribe(handleSync);
    window.addEventListener('whatsapp-status-changed', handleSync);
    window.addEventListener('storage', handleSync);

    const interval = setInterval(() => {
      checkWhatsAppStatus();
    }, 15000);

    return () => {
      unsubscribe();
      window.removeEventListener('whatsapp-status-changed', handleSync);
      window.removeEventListener('storage', handleSync);
      clearInterval(interval);
    };
  }, [checkWhatsAppStatus]);

  const handleExportReport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await downloadCrmReportPdf('relatorio-operacional-core.pdf', {
        title: 'Torre de Controle Operacional - Relatório Executivo CORE',
        metrics: metrics
      });
      showToast('Relatório PDF exportado com sucesso via motor Typst!');
    } catch (err) {
      console.error('Erro ao exportar PDF do Dashboard:', err);
      showToast('Erro ao exportar relatório PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  // Abrir Drawer com lead selecionado ou primeiro lead ativo
  const handleOpenWhatsAppChat = (lead = null) => {
    if (lead) {
      setChatTargetLead(lead);
    } else {
      const repliedLead = leadsList.find(l => l.funnel_status === 'replied' || l.funnel_status === 'responded') || leadsList[0];
      setChatTargetLead(repliedLead || {
        id: 'lead-br-001',
        first_name: 'Carlos',
        last_name: 'Silveira',
        company_name: 'TechLog Brasil Logística',
        phone: whatsAppInfo.formattedPhone || '+55 (11) 98765-4321',
        segment: 'Logística & Supply Chain',
        funnel_status: 'replied',
        qualification_status: 'hot'
      });
    }
    setIsChatDrawerOpen(true);
  };

  // Cálculo da Economia Gerada pelo Reacher (Docker Local :8080)
  const reacherSavings = useMemo(() => {
    const validatedCount = metrics.validated_leads || 148;
    const baseSavings = validatedCount * 0.18;
    const historicalAccumulated = 485.60;
    const total = baseSavings + historicalAccumulated;
    return total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [metrics.validated_leads]);

  // Cálculos do Funil de Conversão 5 Estágios
  const funnelSteps = useMemo(() => {
    const totalMined = metrics.total_leads || 175;
    const sanitized = metrics.validated_leads || 148;
    const dispatched = (metrics.emails_sent_today || 87) + (metrics.whatsapp_sent_today || 42);
    const replied = metrics.replied_leads || 34;
    const booked = metrics.booked_leads || 18;

    return [
      {
        id: 'mined',
        title: '1. Minerados',
        subtitle: 'Apollo & DuckDB',
        count: totalMined,
        color: '#00d4ff',
        bg: 'rgba(0, 212, 255, 0.12)',
        border: 'rgba(0, 212, 255, 0.3)',
        conversion: '100%',
        dropoff: '0%',
        description: 'Leads B2B com decisores e empresas mapeadas no radar',
        actionLabel: '+ Minerar Mais',
        actionTo: '/prospector'
      },
      {
        id: 'sanitized',
        title: '2. Higienizados',
        subtitle: 'Reacher Local :8080',
        count: sanitized,
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.3)',
        conversion: `${((sanitized / totalMined) * 100).toFixed(1)}%`,
        dropoff: `${(((totalMined - sanitized) / totalMined) * 100).toFixed(1)}% inválidos`,
        description: 'Caixas postais ativas testadas via SMTP sem custo por crédito',
        actionLabel: 'Higienizar Lista',
        actionTo: '/diagnostico'
      },
      {
        id: 'dispatched',
        title: '3. Disparados',
        subtitle: 'Resend & WhatsApp',
        count: dispatched,
        color: '#7c3aed',
        bg: 'rgba(124, 58, 237, 0.12)',
        border: 'rgba(124, 58, 237, 0.3)',
        conversion: `${((dispatched / sanitized) * 100).toFixed(1)}%`,
        dropoff: `${(((sanitized - dispatched) / sanitized) * 100).toFixed(1)}% em espera`,
        description: 'Mensagens entregues com copy inteligente personalizada',
        actionLabel: 'Ver Campanhas',
        actionTo: '/campaigns'
      },
      {
        id: 'replied',
        title: '4. Responderam',
        subtitle: 'Interesse Real 🔥',
        count: replied,
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.3)',
        conversion: `${((replied / dispatched) * 100).toFixed(1)}%`,
        dropoff: `${(((dispatched - replied) / dispatched) * 100).toFixed(1)}% sem retorno`,
        description: 'Decisores engajados e respondendo aos ganchos de abordagem',
        actionLabel: 'Abrir Conversas',
        actionTo: '/crm'
      },
      {
        id: 'booked',
        title: '5. Reunião Agendada',
        subtitle: 'Demo / Fechamento 🎯',
        count: booked,
        color: '#3b82f6',
        bg: 'rgba(59, 130, 246, 0.15)',
        border: 'rgba(59, 130, 246, 0.4)',
        conversion: `${((booked / replied) * 100).toFixed(1)}%`,
        dropoff: `${(((replied - booked) / replied) * 100).toFixed(1)}% em maturação`,
        description: 'Reuniões executivas confirmadas com diretores e decisores',
        actionLabel: 'Ver Funil CRM',
        actionTo: '/crm'
      }
    ];
  }, [metrics]);

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '420px', gap: '16px' }}>
        <div className="spinner"></div>
        <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Carregando dados da Torre de Controle Operacional...</p>
      </div>
    );
  }

  const activeStage = selectedStageIndex !== null ? funnelSteps[selectedStageIndex] : null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* ============================================================
          HEADER: TÍTULO, SUBTÍTULO E ATALHOS RÁPIDOS DE AÇÃO
         ============================================================ */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 10px #10b981',
              display: 'inline-block'
            }} />
            <h1 className="page-title" style={{ margin: 0, fontSize: '1.85rem' }}>
              Torre de Controle Operacional
            </h1>
          </div>
          <p className="page-subtitle" style={{ marginTop: '4px' }}>
            Painel executivo em tempo real com saúde dos motores, funil de conversão e cadências ativas
          </p>
        </div>

        {/* Atalhos Rápidos no Header */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/prospector')}
            className="btn btn-sm btn-primary"
            style={{ padding: '8px 14px', fontWeight: 600, fontSize: '0.82rem' }}
            title="Ir para o módulo 1: Minerar Leads"
          >
            <Sparkles size={15} /> Minerar Leads
          </button>

          <button
            onClick={() => navigate('/diagnostico')}
            className="btn btn-sm btn-secondary"
            style={{ padding: '8px 14px', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#10b981' }}
            title="Ir para o módulo 2: Higienizar E-mails via Reacher"
          >
            <ShieldCheck size={15} /> Higienizar
          </button>

          <button
            onClick={() => navigate('/campaigns')}
            className="btn btn-sm btn-secondary"
            style={{ padding: '8px 14px', borderColor: 'rgba(124, 58, 237, 0.3)', color: '#a78bfa' }}
            title="Ir para o módulo 3: Campanhas & Disparos"
          >
            <Megaphone size={15} /> Nova Campanha
          </button>

          <button
            onClick={() => handleOpenWhatsAppChat()}
            className="btn btn-sm btn-secondary"
            style={{ padding: '8px 14px', borderColor: 'rgba(0, 212, 255, 0.3)', color: '#00d4ff' }}
            title="Abrir gaveta WhatsApp Chat Drawer"
          >
            <MessageSquare size={15} /> Abrir WhatsApp
          </button>

          <button
            onClick={handleExportReport}
            disabled={isExporting}
            className="btn btn-sm btn-secondary"
            title="Exportar relatório consolidado em PDF via motor Typst"
            style={{ padding: '8px 12px' }}
          >
            {isExporting ? (
              <>
                <span className="spinner-sm" style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                <span>Exportando...</span>
              </>
            ) : (
              <>
                <FileDown size={15} />
                <span>PDF Typst</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ============================================================
          BLOCO 1: TOP KPIS (5 CARDS DARK GLASS)
         ============================================================ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px'
      }}>
        {/* KPI 1: Leads Minerados */}
        <div className="glass-card metric-card cyan" style={{ padding: '20px', position: 'relative' }}>
          <div>
            <div className="metric-value">{metrics.total_leads}</div>
            <div className="metric-label">Total Leads Minerados</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
              Base DuckDB + Apollo.io
            </div>
          </div>
          <div className="metric-icon"><Users size={22} /></div>
        </div>

        {/* KPI 2: E-mails Enviados (Resend) */}
        <div className="glass-card metric-card violet" style={{ padding: '20px' }}>
          <div>
            <div className="metric-value">{metrics.emails_sent_today || 87}</div>
            <div className="metric-label">E-mails Enviados</div>
            <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '4px', fontWeight: 500 }}>
              Motor Resend (99.4% entrega)
            </div>
          </div>
          <div className="metric-icon"><Send size={22} /></div>
        </div>

        {/* KPI 3: WhatsApp Disparados (Evolution API) */}
        <div className="glass-card metric-card emerald" style={{ padding: '20px' }}>
          <div>
            <div className="metric-value">{metrics.whatsapp_sent_today || 42}</div>
            <div className="metric-label">WhatsApp Disparados</div>
            <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '4px', fontWeight: 500 }}>
              Evolution API Gateway
            </div>
          </div>
          <div className="metric-icon"><MessageSquare size={22} /></div>
        </div>

        {/* KPI 4: Respostas Recebidas 🔥 */}
        <div className="glass-card metric-card amber" style={{ padding: '20px' }}>
          <div>
            <div className="metric-value">{metrics.replied_leads}</div>
            <div className="metric-label">Respostas Recebidas 🔥</div>
            <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '4px', fontWeight: 500 }}>
              {metrics.conversion_rate || '22.8%'} taxa de resposta
            </div>
          </div>
          <div className="metric-icon"><Flame size={22} /></div>
        </div>

        {/* KPI 5: Economia Reacher (R$) */}
        <div className="glass-card" style={{
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)'
        }}>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981', lineHeight: '1.2', marginBottom: '4px' }}>
              R$ {reacherSavings}
            </div>
            <div className="metric-label" style={{ color: '#e2e8f0', fontWeight: 600 }}>
              Economia Reacher (R$)
            </div>
            <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Check size={12} />
              <span>100% Grátis Local :8080</span>
            </div>
          </div>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.18)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <TrendingUp size={22} />
          </div>
        </div>
      </div>

      {/* ============================================================
          BLOCO 4: SAÚDE DOS MOTORES (STATUS EM TEMPO REAL)
         ============================================================ */}
      <div className="glass-card" style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="#00d4ff" />
            <h3 style={{ fontSize: '0.88rem', color: '#e2e8f0', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Saúde dos Motores Operacionais (Infraestrutura)
            </h3>
          </div>
          <Link to="/integrations" style={{ fontSize: '0.75rem', color: '#00d4ff', display: 'flex', alignItems: 'center', gap: '4px' }}>
            Gerenciar Conectores <ArrowRight size={12} />
          </Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '12px'
        }}>
          {/* Motor 1: WhatsApp Evolution */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            padding: '12px 14px',
            border: `1px solid ${whatsAppInfo.isConnected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: whatsAppInfo.isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: whatsAppInfo.isConnected ? '#10b981' : '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MessageSquare size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>WhatsApp (Evolution)</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  {whatsAppInfo.isConnected ? (whatsAppInfo.profileName || 'Ativo & Operacional') : 'Desconectado'}
                </div>
              </div>
            </div>
            <span className="badge" style={{
              background: whatsAppInfo.isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.12)',
              color: whatsAppInfo.isConnected ? '#10b981' : '#f59e0b',
              fontSize: '0.7rem',
              fontWeight: 600
            }}>
              {whatsAppInfo.isConnected ? '🟢 Online' : '🟡 Desconectado'}
            </span>
          </div>

          {/* Motor 2: Reacher Docker Local */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            padding: '12px 14px',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MailCheck size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>Reacher SMTP Local</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Docker :8080 (0 custo)</div>
              </div>
            </div>
            <span className="badge" style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              fontSize: '0.7rem',
              fontWeight: 600
            }}>
              🟢 :8080 Ativo
            </span>
          </div>

          {/* Motor 3: Resend Cold Email */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            padding: '12px 14px',
            border: '1px solid rgba(124, 58, 237, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(124, 58, 237, 0.15)',
                color: '#a78bfa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Send size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>Resend (Cold Email)</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Cadências & Transacional</div>
              </div>
            </div>
            <span className="badge" style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              fontSize: '0.7rem',
              fontWeight: 600
            }}>
              🟢 Ativo
            </span>
          </div>

          {/* Motor 4: Apollo & DuckDB */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            padding: '12px 14px',
            border: '1px solid rgba(0, 212, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(0, 212, 255, 0.15)',
                color: '#00d4ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Database size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>Apollo.io & DuckDB</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Prospecção & Cache</div>
              </div>
            </div>
            <span className="badge" style={{
              background: 'rgba(0, 212, 255, 0.15)',
              color: '#00d4ff',
              fontSize: '0.7rem',
              fontWeight: 600
            }}>
              🟢 {metrics.apollo_credits_remaining || 1850} créditos
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================
          BLOCO 2: FUNIL DE CONVERSÃO INTERATIVO (5 ETAPAS)
         ============================================================ */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="#00d4ff" />
              Funil de Conversão Comercial Interativo (1-2-3-4-5)
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '3px 0 0 0' }}>
              Clique em qualquer estágio para inspecionar métricas detalhadas, taxas de passagem e atalhos de ação
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Taxa Geral de Conversão:</span>
            <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.2)', color: '#c4b5fd', fontSize: '0.82rem', fontWeight: 700, padding: '4px 10px' }}>
              {metrics.conversion_rate || '22.8%'}
            </span>
          </div>
        </div>

        {/* Stepper Grid do Funil */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {funnelSteps.map((step, idx) => {
            const isSelected = selectedStageIndex === idx;
            return (
              <div
                key={step.id}
                onClick={() => setSelectedStageIndex(isSelected ? null : idx)}
                style={{
                  background: isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isSelected ? step.color : 'rgba(255,255,255,0.06)'}`,
                  borderTop: `3px solid ${step.color}`,
                  borderRadius: '10px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                  boxShadow: isSelected ? `0 8px 24px ${step.color}25` : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: step.color, textTransform: 'uppercase' }}>
                    {step.title}
                  </span>
                  <span className="badge" style={{ background: step.bg, color: step.color, fontSize: '0.68rem', padding: '1px 6px' }}>
                    {step.conversion}
                  </span>
                </div>

                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: '4px' }}>
                  {step.count}
                </div>

                <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: '1.3' }}>
                  {step.subtitle}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detalhes do Estágio Selecionado (Interativo) */}
        {activeStage && (
          <div className="animate-fade-in" style={{
            background: 'rgba(0,0,0,0.4)',
            border: `1px solid ${activeStage.border}`,
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: activeStage.color, fontSize: '0.95rem' }}>
                  {activeStage.title} ({activeStage.count} leads)
                </span>
                <span style={{ color: '#64748b' }}>•</span>
                <span style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
                  {activeStage.description}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'flex', gap: '16px' }}>
                <span>Taxa de Passagem: <strong style={{ color: activeStage.color }}>{activeStage.conversion}</strong></span>
                <span>Descarte / Drop-off: <strong style={{ color: '#f43f5e' }}>{activeStage.dropoff}</strong></span>
              </div>
            </div>

            <Link
              to={activeStage.actionTo}
              className="btn btn-sm btn-primary"
              style={{ background: activeStage.color, color: '#0a0a0f', fontWeight: 600, padding: '6px 14px' }}
            >
              {activeStage.actionLabel} <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>

      {/* ============================================================
          GRÁFICOS DE ACOMPANHAMENTO: ÁREA (OUTREACH) & BARRAS (FUNIL)
         ============================================================ */}
      <div className="charts-grid" style={{ marginTop: 0 }}>
        {/* Gráfico 1: Volume de Outreach & Respostas (7 Dias) */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="chart-header" style={{ margin: 0 }}>Volume de Outreach & Respostas (7 Dias)</h3>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#00d4ff' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#00d4ff' }} /> Disparos
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#f59e0b' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b' }} /> Respostas
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={metrics.activity_7_days} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorReplied" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#12121f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="sent" stroke="#00d4ff" fillOpacity={1} fill="url(#colorSent)" name="Enviados" strokeWidth={2} />
              <Area type="monotone" dataKey="replied" stroke="#f59e0b" fillOpacity={1} fill="url(#colorReplied)" name="Respostas" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Gráfico 2: Distribuição dos Estágios no CRM */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="chart-header" style={{ margin: 0 }}>Distribuição de Leads no Pipeline</h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{metrics.total_leads} leads ativos</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={metrics.funnel_distribution} layout="vertical" margin={{ left: 30, right: 20, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#e2e8f0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#12121f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" fill="#7c3aed" name="Leads" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ============================================================
          BLOCO 3: LIVE ACTIVITY STREAM (ÚLTIMOS EVENTOS OPERACIONAIS)
         ============================================================ */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#00d4ff" />
              Live Activity Stream (Eventos Operacionais em Tempo Real)
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Cliques nos contatos abrem diretamente a gaveta de chat do WhatsApp ou histórico do lead
            </p>
          </div>
          <Link to="/crm" className="btn btn-sm btn-secondary" style={{ fontSize: '0.8rem' }}>
            Abrir Inbox CRM Completo →
          </Link>
        </div>
        
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {recentLogs.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lead & Contato</th>
                    <th>Empresa</th>
                    <th>Evento Operacional</th>
                    <th>Assunto / Mensagem</th>
                    <th>Canal</th>
                    <th>Data & Hora</th>
                    <th style={{ textAlign: 'right' }}>Ação Rápida</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => {
                    const matchedLead = leadsList.find(l => l.id === log.lead_id || l.email === log.leads?.email);
                    const isWhatsApp = log.channel === 'whatsapp';

                    return (
                      <tr 
                        key={log.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          if (matchedLead) {
                            handleOpenWhatsAppChat(matchedLead);
                          }
                        }}
                      >
                        <td style={{ fontWeight: 600, color: '#e2e8f0' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span>{log.leads?.email || 'contato@empresa.com.br'}</span>
                            {matchedLead && (
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                {[matchedLead.first_name, matchedLead.last_name].filter(Boolean).join(' ')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{log.leads?.company_name || '—'}</td>
                        <td>
                          <EventTypeBadge type={log.event_type} />
                        </td>
                        <td style={{ color: '#94a3b8', fontSize: '0.8rem', maxWidth: '260px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.email_templates?.subject || 'Outreach Automatizado'}
                        </td>
                        <td>
                          <span 
                            className="badge" 
                            style={{ 
                              background: isWhatsApp ? 'rgba(16,185,129,0.12)' : 'rgba(0,212,255,0.12)', 
                              color: isWhatsApp ? '#10b981' : '#00d4ff',
                              fontWeight: 600
                            }}
                          >
                            {isWhatsApp ? 'WhatsApp' : 'E-mail'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {new Date(log.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (matchedLead) {
                                handleOpenWhatsAppChat(matchedLead);
                              } else {
                                handleOpenWhatsAppChat({
                                  id: log.lead_id || 'lead-log-temp',
                                  email: log.leads?.email,
                                  company_name: log.leads?.company_name,
                                  first_name: 'Decisor',
                                  phone: '+55 11 98888-7777'
                                });
                              }
                            }}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.72rem', color: '#00d4ff' }}
                            title="Abrir chat no WhatsApp"
                          >
                            <MessageSquare size={13} /> Chat
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>Nenhuma atividade operacional recente registrada.</p>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          GAVETA WHATSAPP CHAT DRAWER INTEGRADA
         ============================================================ */}
      <WhatsAppChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        lead={chatTargetLead}
        onMessageSent={(res) => {
          showToast(`Mensagem enviada com sucesso para ${chatTargetLead?.first_name || 'contato'}!`);
        }}
      />

      {/* ============================================================
          TOAST FEEDBACK FLUTUANTE
         ============================================================ */}
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
