import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { callReoonProxy } from '../lib/reoonClient';
import { estimateApolloCredits } from '../lib/apolloClient';
import { Plus, Pencil, Trash2, Eye, EyeOff, Key, X } from 'lucide-react';

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

  useEffect(() => {
    if (user) fetchCredentials();
  }, [user]);

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
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Integrações</h1>
          <p className="page-subtitle">Conecte suas ferramentas de prospecção e envio de e-mails</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn btn-primary">
          <Plus size={18} /> Nova Integração
        </button>
      </div>

      {/* Empty State */}
      {credentials.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Key size={48} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
          <h3 style={{ marginBottom: '8px' }}>Nenhuma integração configurada</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Clique em "Nova Integração" para conectar sua primeira API</p>
        </div>
      ) : (
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
      )}

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
                  <option value="reoon">Reoon — Verificação de E-mails</option>
                  <option value="resend">Resend — Envio Transacional</option>
                  <option value="openrouter">OpenRouter — IA para personalização</option>
                  <option value="instantly">Instantly — Cold Email</option>
                  <option value="smartlead">Smartlead — Outbound</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Chave de API</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showApiKey ? 'text' : 'password'}
                    className="form-input"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    placeholder="Cole aqui sua chave de API"
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
    </div>
  );
}
