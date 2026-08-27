import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { callReoonProxy } from '../lib/reoonClient';
import { estimateApolloCredits } from '../lib/apolloClient';
import { getInstanceStatus, toggleInstanceConnection, setInstanceStatus } from '../lib/evolutionClient';
import WhatsAppModal from '../components/WhatsAppModal';
import WhatsAppQRModal from '../components/WhatsAppQRModal';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Eye, 
  EyeOff, 
  Key, 
  X, 
  MessageSquare, 
  CheckCircle2, 
  Activity, 
  Zap, 
  Wifi, 
  WifiOff,
  RefreshCw
} from 'lucide-react';

export default function IntegrationsPage() {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ service_name: 'apollo', api_key: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [reoonBalance, setReoonBalance] = useState(null);
  const [apolloEstimate, setApolloEstimate] = useState(null);
  const [calibratingApollo, setCalibratingApollo] = useState(false);
  const [calibrationForm, setCalibrationForm] = useState({ balance: '', renewsAt: '' });

  // Evolution API mock state
  const [evolutionStatus, setEvolutionStatus] = useState({
    status: 'CONNECTED',
    instanceName: 'Criativa-Core-Outbound',
    batteryLevel: 100,
    serverUrl: 'https://api.evolution-outbound.criativa.internal'
  });
  const [testingEvolution, setTestingEvolution] = useState(false);
  const [evolutionPingResult, setEvolutionPingResult] = useState(null);
  const [isWhatsAppTestModalOpen, setIsWhatsAppTestModalOpen] = useState(false);
  const [isWhatsAppQRModalOpen, setIsWhatsAppQRModalOpen] = useState(false);

  useEffect(() => {
    if (user) fetchCredentials();
    fetchEvolutionState();
    
    const savedStatus = localStorage.getItem('whatsapp_integration_status');
    if (savedStatus) {
      setEvolutionStatus(prev => ({ ...prev, status: savedStatus }));
    }
  }, [user]);

  const handleWhatsAppConnected = () => {
    setEvolutionStatus(prev => ({ ...prev, status: 'CONNECTED' }));
    localStorage.setItem('whatsapp_integration_status', 'CONNECTED');
    setIsWhatsAppQRModalOpen(false);
  };

  const fetchEvolutionState = async () => {
    try {
      const status = await getInstanceStatus();
      setEvolutionStatus(status);
    } catch (e) {
      console.warn('Erro ao carregar status da Evolution API:', e);
    }
  };

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('credentials')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCredentials(data || []);

      const hasActiveReoon = (data || []).some(c => c.service_name === 'reoon' && c.is_active);
      if (hasActiveReoon) {
        callReoonProxy('check_balance').then(setReoonBalance).catch(() => setReoonBalance(null));
      }

      const hasActiveApollo = (data || []).some(c => c.service_name === 'apollo' && c.is_active);
      if (hasActiveApollo) {
        estimateApolloCredits(user.id).then(setApolloEstimate).catch(() => setApolloEstimate(null));
      }
    } catch (error) {
      console.error('Error fetching credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEvolution = async () => {
    try {
      const updated = await toggleInstanceConnection();
      setEvolutionStatus(updated);
    } catch (e) {
      console.error('Erro ao alternar instância Evolution:', e);
    }
  };

  const handleTestEvolutionConnection = async () => {
    setTestingEvolution(true);
    setEvolutionPingResult(null);
    try {
      const start = Date.now();
      await new Promise(r => setTimeout(r, 120));
      const latency = Date.now() - start;
      setEvolutionPingResult({
        success: true,
        latency: `${latency}ms`,
        timestamp: new Date().toLocaleTimeString('pt-BR')
      });
    } catch (e) {
      setEvolutionPingResult({ success: false, error: e.message });
    } finally {
      setTestingEvolution(false);
      setTimeout(() => setEvolutionPingResult(null), 4000);
    }
  };

  const handleOpenModal = (credential = null) => {
    if (credential) {
      setEditingId(credential.id);
      setFormData({ service_name: credential.service_name, api_key: credential.api_key });
    } else {
      setEditingId(null);
      setFormData({ service_name: 'apollo', api_key: '' });
    }
    setShowApiKey(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ service_name: 'apollo', api_key: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.api_key) return;
    try {
      setIsSubmitting(true);
      if (editingId) {
        const { error } = await supabase.from('credentials').update({ api_key: formData.api_key }).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('credentials').insert({ service_name: formData.service_name, api_key: formData.api_key, user_id: user.id });
        if (error) throw error;
      }
      handleCloseModal();
      await fetchCredentials();
    } catch (error) {
      console.error('Error saving credential:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const { error } = await supabase.from('credentials').update({ is_active: !currentStatus }).eq('id', id);
      if (error) throw error;
      await fetchCredentials();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleOpenCalibration = (cred) => {
    setCalibratingApollo(cred.id);
    setCalibrationForm({
      balance: cred.credit_balance ?? '',
      renewsAt: cred.credit_renews_at ? cred.credit_renews_at.slice(0, 10) : '',
    });
  };

  const handleSaveCalibration = async (credId) => {
    try {
      const { error } = await supabase.from('credentials').update({
        credit_balance: calibrationForm.balance === '' ? null : Number(calibrationForm.balance),
        credit_balance_as_of: new Date().toISOString(),
        credit_renews_at: calibrationForm.renewsAt ? new Date(calibrationForm.renewsAt).toISOString() : null,
      }).eq('id', credId);
      if (error) throw error;
      setCalibratingApollo(false);
      await fetchCredentials();
    } catch (error) {
      console.error('Erro ao salvar calibração de créditos Apollo:', error);
      alert('Erro ao salvar: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta integração?')) {
      try {
        const { error } = await supabase.from('credentials').delete().eq('id', id);
        if (error) throw error;
        await fetchCredentials();
      } catch (error) {
        console.error('Error deleting credential:', error);
      }
    }
  };

  const maskApiKey = (key) => {
    if (!key || key.length < 8) return '••••••••';
    return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
  };

  const serviceLabels = {
    apollo: { name: 'Apollo.io', color: '#3b82f6', description: 'Prospecção e enriquecimento de leads' },
    reoon: { name: 'Reoon', color: '#10b981', description: 'Verificação de e-mails' },
    resend: { name: 'Resend', color: '#7c3aed', description: 'Envio de e-mails transacionais' },
    openrouter: { name: 'OpenRouter', color: '#00d4ff', description: 'IA para personalização dos e-mails (n8n)' },
    instantly: { name: 'Instantly', color: '#f59e0b', description: 'Cold email em escala' },
    smartlead: { name: 'Smartlead', color: '#f43f5e', description: 'Automação de outbound' },
    evolution: { name: 'Evolution API', color: '#10b981', description: 'Disparo de WhatsApp e Webhooks' }
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const isEvolutionConnected = evolutionStatus.status === 'CONNECTED';

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Integrações</h1>
          <p className="page-subtitle">Conecte suas ferramentas de prospecção, WhatsApp e envio de e-mails</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          <Plus size={18} /> Nova Integração
        </button>
      </div>

      {/* Evolution API Dedicated Instance Banner Card */}
      <div className="glass-card" style={{
        padding: '24px',
        marginBottom: '24px',
        borderLeft: `4px solid ${isEvolutionConnected ? '#10b981' : '#f59e0b'}`,
        background: isEvolutionConnected ? 'rgba(16, 185, 129, 0.04)' : 'rgba(245, 158, 11, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem'
            }}>
              <MessageSquare size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#fff' }}>Evolution API (WhatsApp Outbound)</h3>
                <span className="badge" style={{
                  background: isEvolutionConnected ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  color: isEvolutionConnected ? '#10b981' : '#f59e0b',
                  fontWeight: 700
                }}>
                  {isEvolutionConnected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
                Instância: <strong style={{ color: '#e2e8f0' }}>{evolutionStatus.instanceName}</strong> · Endpoint: {evolutionStatus.serverUrl}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setIsWhatsAppQRModalOpen(true)}
              className="btn btn-sm btn-primary"
              style={{ background: '#3b82f6', color: '#fff', fontWeight: 600 }}
            >
              Conectar WhatsApp
            </button>

            <button
              onClick={handleTestEvolutionConnection}
              disabled={testingEvolution}
              className="btn btn-sm btn-secondary"
              title="Testar latência e estabilidade da instância Evolution"
            >
              <RefreshCw size={14} className={testingEvolution ? 'animate-spin' : ''} />
              {testingEvolution ? 'Testando...' : 'Testar Conexão'}
            </button>

            <button
              onClick={() => setIsWhatsAppTestModalOpen(true)}
              className="btn btn-sm btn-primary"
              style={{ background: '#10b981', color: '#0a0a0f', fontWeight: 600 }}
            >
              <Zap size={14} /> Disparar Mensagem Teste
            </button>

            <button
              onClick={handleToggleEvolution}
              className={`toggle ${isEvolutionConnected ? 'active' : ''}`}
              title={isEvolutionConnected ? 'Desconectar Instância' : 'Conectar Instância'}
            />
          </div>
        </div>

        {/* Live Ping Feedback */}
        {evolutionPingResult && (
          <div className="animate-fade-in" style={{
            marginTop: '16px',
            padding: '10px 14px',
            borderRadius: '6px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.8rem',
            color: '#10b981'
          }}>
            <CheckCircle2 size={16} />
            <span>
              Conexão com Evolution API bem-sucedida! Latência: <strong>{evolutionPingResult.latency}</strong> (verificado às {evolutionPingResult.timestamp}).
            </span>
          </div>
        )}
      </div>

      {/* Grid of Credentials */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {credentials.map((cred) => {
          const service = serviceLabels[cred.service_name] || { name: cred.service_name, color: '#94a3b8', description: '' };
          return (
            <div key={cred.id} className="glass-card" style={{ padding: '28px' }}>
              {/* Service Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: `${service.color}15`, color: service.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', fontWeight: 700
                }}>
                  {service.name.charAt(0)}
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '2px' }}>{service.name}</h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{service.description}</p>
                </div>
              </div>

              {/* API Key */}
              <div style={{
                background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px 14px',
                fontFamily: "'Courier New', monospace", fontSize: '0.8rem', color: '#64748b',
                marginBottom: cred.service_name === 'reoon' && reoonBalance ? '12px' : '20px', letterSpacing: '0.5px'
              }}>
                {maskApiKey(cred.api_key)}
              </div>

              {cred.service_name === 'reoon' && reoonBalance && (
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '20px' }}>
                  Créditos restantes hoje: <strong style={{ color: '#10b981' }}>{reoonBalance.remaining_daily_credits}</strong>
                  {' · '}Instantâneos: <strong style={{ color: '#e2e8f0' }}>{reoonBalance.remaining_instant_credits}</strong>
                </p>
              )}

              {cred.service_name === 'apollo' && calibratingApollo === cred.id ? (
                <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '8px' }}>
                    Copie do painel da Apollo (Configurações → Créditos e atividade → Uso de créditos).
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="number"
                      min="0"
                      placeholder="Créditos disponíveis"
                      className="form-input"
                      style={{ fontSize: '0.8rem' }}
                      value={calibrationForm.balance}
                      onChange={(e) => setCalibrationForm({ ...calibrationForm, balance: e.target.value })}
                    />
                    <input
                      type="date"
                      className="form-input"
                      style={{ fontSize: '0.8rem' }}
                      value={calibrationForm.renewsAt}
                      onChange={(e) => setCalibrationForm({ ...calibrationForm, renewsAt: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleSaveCalibration(cred.id)} className="btn btn-sm btn-primary">Salvar</button>
                    <button onClick={() => setCalibratingApollo(false)} className="btn btn-sm btn-secondary">Cancelar</button>
                  </div>
                </div>
              ) : cred.service_name === 'apollo' && (
                <div style={{ marginBottom: '20px' }}>
                  {apolloEstimate ? (
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Estimado: <strong style={{ color: apolloEstimate.estimatedRemaining <= 10 ? '#f43f5e' : '#3b82f6' }}>
                        {apolloEstimate.estimatedRemaining}
                      </strong> de {apolloEstimate.calibratedBalance} restantes
                      {apolloEstimate.renewsAt && (
                        <>
                          {' · renova '}
                          {apolloEstimate.renewalPassed ? (
                            <span style={{ color: '#f59e0b' }}>já deveria ter renovado — recalibre</span>
                          ) : (
                            new Date(apolloEstimate.renewsAt).toLocaleDateString('pt-BR')
                          )}
                        </>
                      )}
                      {' · '}
                      <button onClick={() => handleOpenCalibration(cred)} style={{ background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>
                        recalibrar
                      </button>
                    </p>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Saldo não calibrado —{' '}
                      <button onClick={() => handleOpenCalibration(cred)} style={{ background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}>
                        informar saldo do painel Apollo
                      </button>
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <button
                  onClick={() => handleToggleActive(cred.id, cred.is_active)}
                  className={`toggle ${cred.is_active ? 'active' : ''}`}
                  title={cred.is_active ? 'Desativar' : 'Ativar'}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleOpenModal(cred)} className="btn-icon" title="Editar">
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(cred.id)}
                    className="btn-icon"
                    title="Excluir"
                    style={{ color: '#f43f5e' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingId ? 'Editar Integração' : 'Nova Integração'}</h2>
              <button onClick={handleCloseModal} className="btn-icon" style={{ border: 'none', background: 'transparent' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Serviço</label>
                <select 
                  className="form-select"
                  value={formData.service_name}
                  onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                  disabled={!!editingId}
                >
                  <option value="apollo">Apollo.io — Prospecção</option>
                  <option value="evolution">Evolution API — WhatsApp Outbound</option>
                  <option value="reoon">Reoon — Verificação de E-mails</option>
                  <option value="resend">Resend — Envio Transacional</option>
                  <option value="openrouter">OpenRouter — IA para personalização</option>
                  <option value="instantly">Instantly — Cold Email</option>
                  <option value="smartlead">Smartlead — Outbound</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Chave de API / Token</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showApiKey ? 'text' : 'password'}
                    className="form-input"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    placeholder="Cole aqui sua chave de API ou Token"
                    required
                    style={{ paddingRight: '44px' }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: '#64748b', cursor: 'pointer'
                    }}
                  >
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                  Encontre sua chave de API nas configurações do serviço selecionado.
                </p>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? 'Salvando...' : (editingId ? 'Atualizar' : 'Adicionar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test WhatsApp Modal */}
      <WhatsAppModal
        isOpen={isWhatsAppTestModalOpen}
        onClose={() => setIsWhatsAppTestModalOpen(false)}
        lead={{
          id: 'test-lead-01',
          first_name: 'Lead',
          last_name: 'Teste',
          company_name: 'Empresa Demonstração',
          phone: '+55 11 99999-8888',
          segment: 'Tecnologia'
        }}
      />

      <WhatsAppQRModal
        isOpen={isWhatsAppQRModalOpen}
        onClose={() => setIsWhatsAppQRModalOpen(false)}
        onConnected={handleWhatsAppConnected}
      />
    </div>
  );
}
