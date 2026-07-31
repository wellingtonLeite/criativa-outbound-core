import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, ShieldCheck, Send, MessageSquare } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import EventTypeBadge from '../components/EventTypeBadge';

const FUNNEL_STATUS_LABELS = {
  scraped: 'Coletado',
  in_sequence: 'Em Sequência',
  replied: 'Respondeu',
  bounced: 'Retornou (Bounce)',
  booked: 'Agendado',
  unsubscribed: 'Descadastrado',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total_leads: 0,
    validated_leads: 0,
    replied_leads: 0,
    emails_sent_today: 0
  });
  const [activityData, setActivityData] = useState([]);
  const [funnelData, setFunnelData] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    if (!user) return;
    
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        const { data: metricsData } = await supabase
          .from('dashboard_metrics')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        const { data: sentTodayData } = await supabase
          .rpc('get_emails_sent_today', { p_user_id: user.id });
          
        if (metricsData || sentTodayData !== null) {
          setMetrics({
            total_leads: metricsData?.total_leads || 0,
            validated_leads: metricsData?.validated_leads || 0,
            replied_leads: metricsData?.replied_leads || 0,
            emails_sent_today: sentTodayData || 0
          });
        }
        
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: logsData } = await supabase
          .from('outreach_logs')
          .select('*, leads!inner(campaign_id, campaigns!inner(user_id))')
          .gte('created_at', sevenDaysAgo.toISOString())
          .eq('leads.campaigns.user_id', user.id)
          .order('created_at', { ascending: true });
          
        if (logsData) {
          const groupedByDay = {};
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            groupedByDay[dateStr] = { date: dateStr, sent: 0, replied: 0 };
          }
          
          logsData.forEach(log => {
            const dateStr = log.created_at.split('T')[0];
            if (groupedByDay[dateStr]) {
              if (log.event_type === 'sent') groupedByDay[dateStr].sent++;
              if (log.event_type === 'replied') groupedByDay[dateStr].replied++;
            }
          });
          
          setActivityData(Object.values(groupedByDay));
        }

        const { data: leadsData } = await supabase
          .from('leads')
          .select('funnel_status, campaign_id, campaigns!inner(user_id)')
          .eq('campaigns.user_id', user.id);
          
        if (leadsData) {
          const funnelCounts = leadsData.reduce((acc, lead) => {
            const status = lead.funnel_status || 'unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {});
          
          const formattedFunnel = Object.keys(funnelCounts).map(status => ({
            name: FUNNEL_STATUS_LABELS[status] || status,
            count: funnelCounts[status]
          }));
          
          setFunnelData(formattedFunnel);
        }

        const { data: recentLogsData } = await supabase
          .from('outreach_logs')
          .select('*, leads!inner(email, campaign_id, campaigns!inner(user_id))')
          .eq('leads.campaigns.user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (recentLogsData) {
          setRecentLogs(recentLogsData);
        }
        
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

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
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão operacional do seu outbound</p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        <div className="glass-card metric-card cyan">
          <div>
            <div className="metric-value">{metrics.total_leads}</div>
            <div className="metric-label">Leads Totais</div>
          </div>
          <div className="metric-icon"><Users size={24} /></div>
        </div>
        
        <div className="glass-card metric-card emerald">
          <div>
            <div className="metric-value">{metrics.validated_leads}</div>
            <div className="metric-label">Leads Validados</div>
          </div>
          <div className="metric-icon"><ShieldCheck size={24} /></div>
        </div>
        
        <div className="glass-card metric-card violet">
          <div>
            <div className="metric-value">{metrics.emails_sent_today}</div>
            <div className="metric-label">Enviados Hoje</div>
          </div>
          <div className="metric-icon"><Send size={24} /></div>
        </div>
        
        <div className="glass-card metric-card amber">
          <div>
            <div className="metric-value">{metrics.replied_leads}</div>
            <div className="metric-label">Respostas</div>
          </div>
          <div className="metric-icon"><MessageSquare size={24} /></div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="glass-card">
          <h3 className="chart-header">Atividade (7 dias)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={activityData} margin={{ left: -20, right: 10 }}>
              <defs>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorReplied" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#12121f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="sent" stroke="#00d4ff" fillOpacity={1} fill="url(#colorSent)" name="Enviados" strokeWidth={2} />
              <Area type="monotone" dataKey="replied" stroke="#f59e0b" fillOpacity={1} fill="url(#colorReplied)" name="Respostas" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="glass-card">
          <h3 className="chart-header">Distribuição do Funil</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#e2e8f0', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#12121f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" fill="#7c3aed" name="Leads" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ marginTop: '32px' }}>
        <h3 className="chart-header">Atividade Recente</h3>
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {recentLogs.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>E-mail</th>
                    <th>Evento</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 500 }}>{log.leads?.email}</td>
                      <td>
                        <EventTypeBadge type={log.event_type} />
                      </td>
                      <td>
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>Nenhuma atividade recente encontrada.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
