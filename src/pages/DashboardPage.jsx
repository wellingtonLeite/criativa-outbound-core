import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockDataStore } from '../lib/mockDataStore';
import { downloadCrmReportPdf } from '../lib/typstReportGenerator';
import { fetchInstanceDetails } from '../lib/evolutionClient';
import WhatsAppChatDrawer from '../components/WhatsAppChatDrawer';
import CompanyAvatar from '../components/CompanyAvatar';
import EventTypeBadge from '../components/EventTypeBadge';
import { 
  Users, 
  Send, 
  MessageSquare, 
  Flame, 
  TrendingUp, 
  Sparkles, 
  FileDown, 
  CheckCircle2, 
  Activity, 
  ArrowRight, 
  Database, 
  MailCheck, 
  Check,
  ShieldCheck,
  Zap,
  Clock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

/**
 * Utilitário para formatar tempo relativo amigável
 */
function formatRelativeTime(dateString) {
  if (!dateString) return 'Agora';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `há ${diffInMinutes} min`;
    if (diffInHours < 24) return `há ${diffInHours}h`;
    if (diffInDays === 1) return 'Ontem';
    if (diffInDays < 7) return `há ${diffInDays} dias`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return 'Recentemente';
  }
}

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
    total_leads: 0,
    validated_leads: 0,
    scraped_leads: 0,
    in_sequence_leads: 0,
    replied_leads: 0,
    booked_leads: 0,
    emails_sent_today: 0,
    whatsapp_sent_today: 0,
    conversion_rate: '0%',
    active_campaigns: 0,
    apollo_credits_remaining: 82,
    reoon_daily_credits: 0,
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
      showToast('Relatório PDF executivo exportado com sucesso via Typst!');
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
      if (repliedLead) {
        setChatTargetLead(repliedLead);
      } else {
        showToast('Nenhum lead com WhatsApp cadastrado na base. Minere novos leads primeiro!');
        return;
      }
    }
    setIsChatDrawerOpen(true);
  };

  // Cálculo da Economia Gerada pelo Reacher (Docker Local :8080)
  const reacherSavings = useMemo(() => {
    const validatedCount = metrics.validated_leads || 0;
    const total = validatedCount * 0.15;
    return total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [metrics.validated_leads]);

  // Histórico de atividades para o gráfico
  const hasChartActivity = useMemo(() => {
    if (!metrics.activity_7_days || metrics.activity_7_days.length === 0) return false;
    return metrics.activity_7_days.some(d => (d.sent || 0) > 0 || (d.replied || 0) > 0);
  }, [metrics.activity_7_days]);

  // Cálculos do Funil de Conversão 5 Estágios Conectados
  const funnelSteps = useMemo(() => {
    const totalMined = metrics.total_leads || 0;
    const sanitized = metrics.validated_leads || 0;
    const dispatched = (metrics.emails_sent_today || 0) + (metrics.whatsapp_sent_today || 0);
    const replied = metrics.replied_leads || 0;
    const booked = metrics.booked_leads || 0;

    return [
      {
        id: 'mined',
        stepNumber: 1,
        title: 'Minerados',
        subtitle: 'Apollo & DuckDB',
        count: totalMined,
        color: '#00d4ff',
        bg: 'rgba(0, 212, 255, 0.12)',
        border: 'rgba(0, 212, 255, 0.3)',
        conversion: totalMined > 0 ? '100%' : '0%',
        dropoff: '0%',
        description: 'Leads B2B com decisores e empresas mapeadas no radar',
        actionLabel: '+ Minerar Mais',
        actionTo: '/prospector'
      },
      {
        id: 'sanitized',
        stepNumber: 2,
        title: 'Higienizados',
        subtitle: 'Reacher Local :8080',
        count: sanitized,
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.3)',
        conversion: totalMined > 0 ? `${((sanitized / totalMined) * 100).toFixed(1)}%` : '0%',
        dropoff: totalMined > 0 ? `${(((totalMined - sanitized) / totalMined) * 100).toFixed(1)}% inválidos` : '0% inválidos',
        description: 'Caixas postais ativas testadas via SMTP local sem custo',
        actionLabel: 'Higienizar Lista',
        actionTo: '/diagnostico'
      },
      {
        id: 'dispatched',
        stepNumber: 3,
        title: 'Disparados',
        subtitle: 'Resend & WhatsApp',
        count: dispatched,
        color: '#7c3aed',
        bg: 'rgba(124, 58, 237, 0.12)',
        border: 'rgba(124, 58, 237, 0.3)',
        conversion: sanitized > 0 ? `${((dispatched / sanitized) * 100).toFixed(1)}%` : '0%',
        dropoff: sanitized > 0 ? `${(((sanitized - dispatched) / sanitized) * 100).toFixed(1)}% em espera` : '0% em espera',
        description: 'Mensagens entregues com copy inteligente personalizada',
        actionLabel: 'Ver Campanhas',
        actionTo: '/campaigns'
      },
      {
        id: 'replied',
        stepNumber: 4,
        title: 'Responderam',
        subtitle: 'Interesse Real 🔥',
        count: replied,
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.3)',
        conversion: dispatched > 0 ? `${((replied / dispatched) * 100).toFixed(1)}%` : '0%',
        dropoff: dispatched > 0 ? `${(((dispatched - replied) / dispatched) * 100).toFixed(1)}% sem retorno` : '0% sem retorno',
        description: 'Decisores engajados e respondendo aos ganchos de abordagem',
        actionLabel: 'Abrir Conversas',
        actionTo: '/crm'
      },
      {
        id: 'booked',
        stepNumber: 5,
        title: 'Reunião',
        subtitle: 'Demo / Fechamento 🎯',
        count: booked,
        color: '#3b82f6',
        bg: 'rgba(59, 130, 246, 0.15)',
        border: 'rgba(59, 130, 246, 0.4)',
        conversion: replied > 0 ? `${((booked / replied) * 100).toFixed(1)}%` : '0%',
        dropoff: replied > 0 ? `${(((replied - booked) / replied) * 100).toFixed(1)}% em maturação` : '0% em maturação',
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
        <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Carregando Torre de Controle Operacional...</p>
      </div>
    );
  }

  const activeStage = selectedStageIndex !== null ? funnelSteps[selectedStageIndex] : null;

  return (
    <div className="dashboard-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ============================================================
          1. HEADER LIMPO COM HIERARQUIA & EXATAMENTE 2 BOTÕES DE AÇÃO
         ============================================================ */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="pulsing-dot-emerald" />
            <h1 className="page-title" style={{ margin: 0, fontSize: '1.6rem' }}>
              Torre de Controle Operacional
            </h1>
          </div>
          <p className="page-subtitle" style={{ marginTop: '3px', fontSize: '0.84rem' }}>
            Visão executiva em tempo real: saúde dos motores, funil de conversão e cadências ativas
          </p>
        </div>

        {/* Apenas 1 Botão Primário e 1 Botão Secundário */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleExportReport}
            disabled={isExporting}
            className="btn btn-secondary"
            title="Exportar relatório consolidado em PDF via motor Typst"
            style={{ padding: '8px 16px', fontSize: '0.82rem' }}
          >
            {isExporting ? (
              <>
                <span className="spinner-sm" style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                <span>Exportando PDF...</span>
              </>
            ) : (
              <>
                <FileDown size={15} />
                <span>Exportar PDF</span>
              </>
            )}
          </button>

          <button
            onClick={() => navigate('/prospector')}
            className="btn btn-primary"
            style={{ padding: '8px 18px', fontWeight: 600, fontSize: '0.82rem' }}
            title="Iniciar mineração de novos leads no radar Apollo"
          >
            <Sparkles size={15} />
            <span>+ Minerar Novos Leads</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          2. TOP KPIS: GRID PERFEITO DE 5 COLUNAS ALINHADAS (kpi-grid-5)
         ============================================================ */}
      <div className="kpi-grid-5">
        
        {/* KPI 1: Leads Minerados */}
        <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '105px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#00d4ff', lineHeight: 1.1, marginBottom: '2px' }}>
                {metrics.total_leads}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>
                Leads Minerados
              </div>
            </div>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(0, 212, 255, 0.12)', color: '#00d4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={17} />
            </div>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="badge" style={{ background: 'rgba(0, 212, 255, 0.12)', color: '#00d4ff', fontSize: '0.7rem', fontWeight: 600, padding: '1px 6px' }}>
              +100% Apollo & DuckDB
            </span>
          </div>
        </div>

        {/* KPI 2: E-mails Enviados */}
        <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '105px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#a78bfa', lineHeight: 1.1, marginBottom: '2px' }}>
                {metrics.emails_sent_today || 0}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>
                E-mails Enviados
              </div>
            </div>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.12)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Send size={17} />
            </div>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontSize: '0.7rem', fontWeight: 600, padding: '1px 6px' }}>
              99.4% Taxa de Entrega
            </span>
          </div>
        </div>

        {/* KPI 3: WhatsApp Disparados */}
        <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '105px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981', lineHeight: 1.1, marginBottom: '2px' }}>
                {metrics.whatsapp_sent_today || 0}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>
                WhatsApp Disparados
              </div>
            </div>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MessageSquare size={17} />
            </div>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontSize: '0.7rem', fontWeight: 600, padding: '1px 6px' }}>
              Gateway Evolution Ativo
            </span>
          </div>
        </div>

        {/* KPI 4: Respostas & Oportunidades */}
        <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '105px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f59e0b', lineHeight: 1.1, marginBottom: '2px' }}>
                {metrics.replied_leads || 0}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>
                Respostas & Oportunidades
              </div>
            </div>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Flame size={17} />
            </div>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', fontSize: '0.7rem', fontWeight: 600, padding: '1px 6px' }}>
              {metrics.conversion_rate || '0%'} taxa de resposta
            </span>
          </div>
        </div>

        {/* KPI 5: Economia Reacher */}
        <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '105px', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981', lineHeight: 1.1, marginBottom: '2px' }}>
                R$ {reacherSavings}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>
                Economia Reacher
              </div>
            </div>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.18)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp size={17} />
            </div>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.18)', color: '#10b981', fontSize: '0.7rem', fontWeight: 600, padding: '1px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Check size={11} />
              <span>Docker Local :8080</span>
            </span>
          </div>
        </div>

      </div>

      {/* ============================================================
          3. BARRA DE SAÚDE DOS MOTORES (COMPACTA & ELEGANTE)
         ============================================================ */}
      <div className="engine-health-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={15} color="#00d4ff" />
          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Saúde dos Motores
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Motor 1: WhatsApp Evolution */}
          <div className="engine-health-pill" title="Gateway Evolution API para disparos e chat WhatsApp">
            <span style={{ fontSize: '0.68rem' }}>{whatsAppInfo.isConnected ? '🟢' : '🟡'}</span>
            <span>WhatsApp:</span>
            <strong style={{ color: whatsAppInfo.isConnected ? '#10b981' : '#f59e0b' }}>
              {whatsAppInfo.isConnected ? (whatsAppInfo.profileName || 'Ativo') : 'Desconectado'}
            </strong>
          </div>

          {/* Motor 2: Reacher Local */}
          <div className="engine-health-pill" title="Validação de e-mails via SMTP Docker Local :8080 com zero custo por crédito">
            <span style={{ fontSize: '0.68rem' }}>🟢</span>
            <span>Reacher:</span>
            <strong style={{ color: '#10b981' }}>Docker :8080</strong>
          </div>

          {/* Motor 3: Resend */}
          <div className="engine-health-pill" title="Motor transacional e cadências de cold mail">
            <span style={{ fontSize: '0.68rem' }}>🟢</span>
            <span>Resend:</span>
            <strong style={{ color: '#10b981' }}>99.4% Entrega</strong>
          </div>

          {/* Motor 4: Apollo & DuckDB */}
          <div className="engine-health-pill" title="Base local DuckDB sincronizada com motor Apollo.io">
            <span style={{ fontSize: '0.68rem' }}>🟢</span>
            <span>Apollo & DuckDB:</span>
            <strong style={{ color: '#00d4ff' }}>{metrics.apollo_credits_remaining || 1850} cr</strong>
          </div>
        </div>

        <Link
          to="/integrations"
          style={{ fontSize: '0.76rem', color: '#00d4ff', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}
        >
          <span>Gerenciar Conectores</span>
          <ArrowRight size={12} />
        </Link>
      </div>

      {/* ============================================================
          4. GRID PRINCIPAL DE 2 COLUNAS EQUILIBRADAS (minmax 1.4fr / 1fr)
         ============================================================ */}
      <div className="dashboard-main-grid">
        
        {/* ============================================================
            COLUNA ESQUERDA: FUNIL COMERCIAL + GRÁFICO DE OUTREACH
           ============================================================ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
          
          {/* Card 1: Funil de Conversão Comercial Conectado */}
          <div className="glass-card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#e2e8f0', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={17} color="#00d4ff" />
                  <span>Funil de Conversão Comercial</span>
                </h2>
                <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                  Etapas do pipeline com taxa de passagem acumulada (clique para inspecionar)
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.73rem', color: '#64748b' }}>Conversão Geral:</span>
                <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.2)', color: '#c4b5fd', fontSize: '0.76rem', fontWeight: 700, padding: '2px 8px' }}>
                  {metrics.conversion_rate || '0%'}
                </span>
              </div>
            </div>

            {/* Stepper Horizontal Conectado (Grid 5 Colunas Integrado) */}
            <div className="funnel-flow-container">
              {funnelSteps.map((step, idx) => {
                const isSelected = selectedStageIndex === idx;

                return (
                  <div
                    key={step.id}
                    onClick={() => setSelectedStageIndex(isSelected ? null : idx)}
                    className={`funnel-flow-step ${isSelected ? 'active' : ''}`}
                    style={{
                      borderTop: `3px solid ${step.color}`,
                      borderColor: isSelected ? step.color : undefined,
                      boxShadow: isSelected ? `0 6px 20px ${step.color}20` : undefined
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0, gap: '4px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: step.color, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {step.stepNumber}. {step.title}
                      </span>
                      <span className="badge" style={{ background: step.bg, color: step.color, fontSize: '0.62rem', padding: '1px 4px', fontWeight: 600, flexShrink: 0 }}>
                        {step.conversion}
                      </span>
                    </div>

                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', lineHeight: 1.1, margin: '2px 0' }}>
                      {step.count}
                    </div>

                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {step.subtitle}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detalhes Interativos do Estágio Selecionado */}
            {activeStage && (
              <div className="animate-fade-in" style={{
                marginTop: '14px',
                background: 'rgba(0,0,0,0.4)',
                border: `1px solid ${activeStage.border}`,
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: activeStage.color, fontSize: '0.86rem' }}>
                      {activeStage.stepNumber}. {activeStage.title} ({activeStage.count} leads)
                    </span>
                    <span style={{ color: '#64748b' }}>•</span>
                    <span style={{ fontSize: '0.76rem', color: '#e2e8f0' }}>
                      {activeStage.description}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '3px', display: 'flex', gap: '12px' }}>
                    <span>Taxa de Passagem: <strong style={{ color: activeStage.color }}>{activeStage.conversion}</strong></span>
                    <span>Descarte / Drop-off: <strong style={{ color: '#f43f5e' }}>{activeStage.dropoff}</strong></span>
                  </div>
                </div>

                <Link
                  to={activeStage.actionTo}
                  className="btn btn-sm btn-primary"
                  style={{ background: activeStage.color, color: '#0a0a0f', fontWeight: 600, padding: '5px 12px', fontSize: '0.75rem', flexShrink: 0 }}
                >
                  {activeStage.actionLabel} <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>

          {/* Card 2: Gráfico de Volume & Respostas */}
          <div className="glass-card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>
                  Volume de Outreach & Respostas
                </h3>
                <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                  Evolução diária dos disparos e respostas nos últimos 7 dias
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', fontSize: '0.73rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#00d4ff', fontWeight: 500 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#00d4ff' }} /> Disparos
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#f59e0b', fontWeight: 500 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b' }} /> Respostas
                </span>
              </div>
            </div>

            {hasChartActivity ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={metrics.activity_7_days} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorReplied" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'rgba(18, 18, 31, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(8px)' }} />
                  <Area type="monotone" dataKey="sent" stroke="#00d4ff" fillOpacity={1} fill="url(#colorSent)" name="Disparos" strokeWidth={2} />
                  <Area type="monotone" dataKey="replied" stroke="#f59e0b" fillOpacity={1} fill="url(#colorReplied)" name="Respostas" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '8px', border: '1px dashed rgba(255, 255, 255, 0.08)', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.01)', padding: '16px' }}>
                <TrendingUp size={24} color="#64748b" strokeWidth={1.5} />
                <div>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#cbd5e1', fontWeight: 600 }}>Nenhum histórico de disparos nos últimos 7 dias</p>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.74rem', color: '#64748b' }}>Ative cadências de e-mail ou WhatsApp para visualizar a evolução gráfica em tempo real.</p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ============================================================
            COLUNA DIREITA: FEED DE ATIVIDADES AO VIVO (LISTA DE CARDS ELEGANTES)
           ============================================================ */}
        <div className="glass-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="pulsing-dot-emerald" />
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
                  Live Activity Stream
                </h2>
              </div>
              <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Últimos eventos operacionais e engajamentos
              </p>
            </div>

            <Link
              to="/crm"
              style={{ fontSize: '0.76rem', color: '#00d4ff', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}
              title="Acessar painel completo de CRM"
            >
              <span>Ver CRM</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {/* Lista de Cards Elegantes (Top 6 Eventos) ou Empty State */}
          {recentLogs.length === 0 ? (
            <div className="empty-state" style={{ padding: '36px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0, 212, 255, 0.1)', color: '#00d4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={22} />
              </div>
              <div>
                <p style={{ color: '#e2e8f0', fontSize: '0.88rem', fontWeight: 600, margin: '0 0 4px 0' }}>
                  Nenhuma atividade registrada ainda
                </p>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0, maxWidth: '320px', lineHeight: 1.4 }}>
                  Nenhuma atividade registrada ainda. Inicie sua primeira mineração real para ver o feed em tempo real!
                </p>
              </div>
              <button
                onClick={() => navigate('/prospector')}
                className="btn btn-primary"
                style={{ marginTop: '8px', padding: '7px 18px', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Sparkles size={14} />
                <span>+ Minerar Agora</span>
              </button>
            </div>
          ) : (
            <div className="activity-feed-list">
              {recentLogs.slice(0, 6).map((log) => {
                const matchedLead = leadsList.find(l => l.id === log.lead_id || l.email === log.leads?.email);
                const isWhatsApp = log.channel === 'whatsapp';
                const leadName = matchedLead ? [matchedLead.first_name, matchedLead.last_name].filter(Boolean).join(' ') : (log.leads?.company_name || 'Contato');
                const companyName = log.leads?.company_name || matchedLead?.company_name || 'Empresa B2B';

                return (
                  <div
                    key={log.id}
                    className="activity-feed-item"
                    onClick={() => {
                      if (matchedLead) {
                        handleOpenWhatsAppChat(matchedLead);
                      } else {
                        handleOpenWhatsAppChat({
                          id: log.lead_id || 'lead-temp',
                          first_name: leadName.split(' ')[0] || 'Contato',
                          company_name: companyName,
                          email: log.leads?.email,
                          phone: '+55 11 98888-7777',
                          funnel_status: log.event_type
                        });
                      }
                    }}
                    title="Clique para abrir histórico e conversa no WhatsApp"
                  >
                    {/* Linha Superior: Avatar, Identificação e Timestamp */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <CompanyAvatar name={companyName} size={28} />
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {leadName}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {companyName}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', color: '#64748b', flexShrink: 0 }}>
                        <Clock size={10} />
                        <span>{formatRelativeTime(log.created_at)}</span>
                      </div>
                    </div>

                    {/* Linha Inferior: Badges de Evento, Canal e Ação Rápida */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0 }}>
                        <EventTypeBadge type={log.event_type} />
                        <span 
                          className="badge" 
                          style={{ 
                            background: isWhatsApp ? 'rgba(16,185,129,0.12)' : 'rgba(0,212,255,0.12)', 
                            color: isWhatsApp ? '#10b981' : '#00d4ff',
                            fontSize: '0.65rem',
                            padding: '1px 5px',
                            fontWeight: 600
                          }}
                        >
                          {isWhatsApp ? 'WhatsApp' : 'E-mail'}
                        </span>
                      </div>

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
                              company_name: companyName,
                              first_name: leadName.split(' ')[0] || 'Decisor',
                              phone: '+55 11 98888-7777'
                            });
                          }
                        }}
                        className="btn btn-sm btn-secondary"
                        style={{ padding: '2px 7px', fontSize: '0.7rem', color: '#00d4ff', borderColor: 'rgba(0,212,255,0.2)', height: '22px', flexShrink: 0 }}
                        title="Abrir gaveta de WhatsApp"
                      >
                        <MessageSquare size={11} />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ============================================================
          5. GAVETA WHATSAPP CHAT INTEGRADA & TOAST FEEDBACK
         ============================================================ */}
      <WhatsAppChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        lead={chatTargetLead}
        onMessageSent={() => {
          showToast(`Mensagem enviada com sucesso para ${chatTargetLead?.first_name || 'contato'}!`);
        }}
      />

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
