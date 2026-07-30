import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, ShieldCheck, Send, MessageSquare } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

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
            name: status,
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
      <div className="flex justify-center items-center h-64 animate-fade-in">
        <div className="spinner w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="page-title text-2xl font-bold">Dashboard</h1>
        <p className="page-subtitle text-gray-400">Visão operacional do seu outbound</p>
      </div>

      <div className="stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card metric-card cyan flex justify-between items-center p-4 rounded-xl border border-white/10 bg-white/5">
          <div>
            <div className="metric-value text-2xl font-bold">{metrics.total_leads}</div>
            <div className="metric-label text-sm text-gray-400">Leads Totais</div>
          </div>
          <div className="metric-icon text-cyan-400"><Users size={24} /></div>
        </div>
        
        <div className="glass-card metric-card emerald flex justify-between items-center p-4 rounded-xl border border-white/10 bg-white/5">
          <div>
            <div className="metric-value text-2xl font-bold">{metrics.validated_leads}</div>
            <div className="metric-label text-sm text-gray-400">Leads Validados</div>
          </div>
          <div className="metric-icon text-emerald-400"><ShieldCheck size={24} /></div>
        </div>
        
        <div className="glass-card metric-card violet flex justify-between items-center p-4 rounded-xl border border-white/10 bg-white/5">
          <div>
            <div className="metric-value text-2xl font-bold">{metrics.emails_sent_today}</div>
            <div className="metric-label text-sm text-gray-400">Enviados Hoje</div>
          </div>
          <div className="metric-icon text-violet-400"><Send size={24} /></div>
        </div>
        
        <div className="glass-card metric-card amber flex justify-between items-center p-4 rounded-xl border border-white/10 bg-white/5">
          <div>
            <div className="metric-value text-2xl font-bold">{metrics.replied_leads}</div>
            <div className="metric-label text-sm text-gray-400">Respostas</div>
          </div>
          <div className="metric-icon text-amber-400"><MessageSquare size={24} /></div>
        </div>
      </div>

      <div className="charts-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-4 rounded-xl border border-white/10 bg-white/5">
          <h3 className="text-lg font-semibold mb-4">Atividade (7 dias)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={activityData}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="sent" stroke="#00d4ff" fillOpacity={1} fill="url(#colorSent)" name="Enviados" />
              <Area type="monotone" dataKey="replied" stroke="#f59e0b" fillOpacity={1} fill="url(#colorReplied)" name="Respostas" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="glass-card p-4 rounded-xl border border-white/10 bg-white/5">
          <h3 className="text-lg font-semibold mb-4">Distribuição do Funil</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <Bar dataKey="count" fill="#8b5cf6" name="Leads" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="chart-header text-xl font-semibold mb-4">Atividade Recente</h3>
        <div className="glass-card rounded-xl overflow-hidden border border-white/10 bg-white/5">
          {recentLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table w-full text-left">
                <thead className="bg-white/5">
                  <tr>
                    <th className="p-4 font-medium text-sm text-gray-400">E-mail</th>
                    <th className="p-4 font-medium text-sm text-gray-400">Evento</th>
                    <th className="p-4 font-medium text-sm text-gray-400">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-sm">{log.leads?.email}</td>
                      <td className="p-4">
                        <span className={`badge badge-${log.event_type} text-xs px-2 py-1 rounded-full uppercase tracking-wider bg-white/10`}>
                          {log.event_type}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-400">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">
              Nenhuma atividade recente encontrada.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
