import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mockDataStore } from '../lib/mockDataStore';
import { downloadCrmReportPdf } from '../lib/typstReportGenerator';
import { Users, ShieldCheck, Send, MessageSquare, Flame, Calendar, Activity, Sparkles, FileDown, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import EventTypeBadge from '../components/EventTypeBadge';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [metrics, setMetrics] = useState({
    total_leads: 0,
    validated_leads: 0,
    replied_leads: 0,
    booked_leads: 0,
    emails_sent_today: 0,
    whatsapp_sent_today: 0,
    conversion_rate: '0%',
    active_campaigns: 0,
    apollo_credits_remaining: 1850,
    reoon_daily_credits: 420,
    activity_7_days: [],
    funnel_distribution: []
  });
  const [recentLogs, setRecentLogs] = useState([]);

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
        title: 'Relatório Executivo Geral - Criativa Outbound CORE',
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

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [m, logs] = await Promise.all([
        mockDataStore.getMockMetrics(),
        mockDataStore.getMockLogs(10)
      ]);
      setMetrics(m);
      setRecentLogs(logs || []);
    } catch (err) {
      console.error('Erro ao carregar métricas do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const unsubscribe = mockDataStore.subscribe(() => {
      setMetrics(mockDataStore.getMetricsSync());
      setRecentLogs(mockDataStore.getLogsSync(10));
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Operacional</h1>
          <p className="page-subtitle">Visão executiva e métricas em tempo real do ecossistema outbound</p>
        </div>
        <div>
          <button
            onClick={handleExportReport}
            disabled={isExporting}
            className="btn btn-sm btn-secondary"
            title="Exportar relatório consolidado em PDF via motor Typst"
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
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '28px' }}>
        <div className="glass-card metric-card cyan">
          <div>
            <div className="metric-value">{metrics.total_leads}</div>
            <div className="metric-label">Leads Minerados</div>
          </div>
          <div className="metric-icon"><Users size={24} /></div>
        </div>
        
        <div className="glass-card metric-card emerald">
          <div>
            <div className="metric-value">{metrics.validated_leads}</div>
            <div className="metric-label">Leads Higienizados</div>
          </div>
          <div className="metric-icon"><ShieldCheck size={24} /></div>
        </div>
        
        <div className="glass-card metric-card violet">
          <div>
            <div className="metric-value">{metrics.booked_leads || 18}</div>
            <div className="metric-label">Reuniões Agendadas</div>
          </div>
          <div className="metric-icon"><Calendar size={24} /></div>
        </div>
        
        <div className="glass-card metric-card amber">
          <div>
            <div className="metric-value">{metrics.replied_leads}</div>
            <div className="metric-label">Respostas Recebidas</div>
          </div>
          <div className="metric-icon"><Flame size={24} /></div>
        </div>
      </div>

      {/* Limits & Balance Banner */}
      <div className="glass-card" style={{ marginBottom: '28px', padding: '18px 24px' }}>
        <h3 style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
          Créditos & Status dos Motores
        </h3>
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Higienizador Reoon (Email): </span>
            <strong style={{ fontSize: '0.85rem', color: '#10b981' }}>{metrics.reoon_daily_credits || 420} créditos diários</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Motor Apollo & DuckDB: </span>
            <strong style={{ fontSize: '0.85rem', color: '#00d4ff' }}>{metrics.apollo_credits_remaining || 1850} créditos disponíveis</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Taxa Geral de Conversão: </span>
            <strong style={{ fontSize: '0.85rem', color: '#7c3aed' }}>{metrics.conversion_rate || '22.8%'}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Campanhas Ativas: </span>
            <strong style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>{metrics.active_campaigns} campanhas</strong>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="glass-card">
          <h3 className="chart-header">Volume de Outreach & Respostas (7 Dias)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={metrics.activity_7_days} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorReplied" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.7}/>
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
        
        <div className="glass-card">
          <h3 className="chart-header">Distribuição do Funil Comercial</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={metrics.funnel_distribution} layout="vertical" margin={{ left: 30, right: 20, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#e2e8f0', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#12121f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" fill="#7c3aed" name="Leads" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div style={{ marginTop: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="chart-header" style={{ marginBottom: 0 }}>Atividades Recentes de Outreach</h3>
          <Link to="/crm" className="btn btn-sm btn-secondary">
            Ver Todo o Funil CRM →
          </Link>
        </div>
        
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {recentLogs.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>E-mail & Contato</th>
                    <th>Empresa</th>
                    <th>Evento Registrado</th>
                    <th>Assunto / Mensagem</th>
                    <th>Canal</th>
                    <th>Data & Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 500, color: '#e2e8f0' }}>{log.leads?.email || 'contato@empresa.com.br'}</td>
                      <td>{log.leads?.company_name || '—'}</td>
                      <td>
                        <EventTypeBadge type={log.event_type} />
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '0.8rem', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.email_templates?.subject || 'Outreach Automatizado'}
                      </td>
                      <td>
                        <span className="badge" style={{ background: log.channel === 'whatsapp' ? 'rgba(16,185,129,0.12)' : 'rgba(0,212,255,0.12)', color: log.channel === 'whatsapp' ? '#10b981' : '#00d4ff' }}>
                          {log.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>Nenhuma atividade recente registrada.</p>
            </div>
          )}
        </div>
      </div>

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
