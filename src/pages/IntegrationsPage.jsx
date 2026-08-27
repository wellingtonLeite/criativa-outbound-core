import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { callReoonProxy } from '../lib/reoonClient';
import { estimateApolloCredits } from '../lib/apolloClient';
import { 
  fetchInstanceDetails, 
  deleteInstance, 
  logoutInstance, 
  toggleInstanceConnection 
} from '../lib/evolutionClient';
import WhatsAppChatDrawer from '../components/WhatsAppChatDrawer';
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
  AlertCircle,
  Activity, 
  Zap, 
  Wifi, 
  WifiOff,
  RefreshCw,
  LogOut,
  Smartphone,
  Sparkles,
  Target,
  MailCheck,
  Send,
  Building2,
  Flame,
  ShieldCheck,
  ExternalLink,
  Bot
} from 'lucide-react';

/**
 * Catálogo completo de serviços de integração suportados pelo CORE.
 * Todos os cards são SEMPRE renderizados no grid, independente de estarem salvos no banco.
 */
const SYSTEM_INTEGRATION_CATALOG = [
  {
    key: 'apollo',
    name: 'Apollo.io',
    category: 'Prospecção & Enriquecimento B2B',
    color: '#3b82f6',
    description: 'Busca avançada de decisores, filtros por faturamento, cargo e enriquecimento de contatos corporativos.',
    icon: Target,
    requiresApiKey: true,
    badgeText: 'Prospecção B2B'
  },
  {
    key: 'reacher',
    name: 'Reacher (Docker Local)',
    category: 'Higienização SMTP Gratuita',
    color: '#10b981',
    description: 'Validação SMTP direta em tempo real via container local. Testa caixas postais sem consumir créditos pagos.',
    icon: MailCheck,
    requiresApiKey: false,
    badgeText: 'Docker Local :8080'
  },
  {
    key: 'resend',
    name: 'Resend',
    category: 'Envio Transacional & Cadências',
    color: '#7c3aed',
    description: 'Disparo de sequências de cold e-mail, confirmações e notificações com alta entregabilidade.',
    icon: Send,
    requiresApiKey: true,
    badgeText: 'Cold Mail'
  },
  {
    key: 'openrouter',
    name: 'OpenRouter / IA',
    category: 'Inteligência Artificial Generativa',
    color: '#00d4ff',
    description: 'Conector para modelos GPT-4, Claude 3.5 e Llama para geração autônoma de copy e ganchos de abordagem.',
    icon: Sparkles,
    requiresApiKey: true,
    badgeText: 'IA Generativa'
  },
  {
    key: 'brasilapi',
    name: 'BrasilAPI / CNPJ',
    category: 'Dados Públicos & Quadro Societário',
    color: '#f59e0b',
    description: 'Consulta pública de CNPJs, Quadro Societário (QSA), CNAE principal/secundário e endereço sem custos.',
    icon: Building2,
    requiresApiKey: false,
    badgeText: 'API Pública Gratuita'
  },
  {
    key: 'reoon',
    name: 'Reoon Verifier',
    category: 'Verificação em Lote',
    color: '#06b6d4',
    description: 'Verificação profunda de e-mails em lote, detecção de domínios catch-all e proteção contra bounce.',
    icon: ShieldCheck,
    requiresApiKey: true,
    badgeText: 'Verificador'
  }
];

const DEFAULT_CREDENTIALS = [
  {
    id: 'cred-apollo-01',
    service_name: 'apollo',
    api_key: 'sk_apollo_live_9a8b7c6d5e4f3a2b1c',
    is_active: true,
    credit_balance: 5000,
    credit_balance_as_of: new Date().toISOString(),
    credit_renews_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    created_at: new Date().toISOString()
  },
  {
    id: 'cred-resend-01',
    service_name: 'resend',
    api_key: 're_123456789_abcdefghijklmnopqrstuvwxyz',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'cred-openrouter-01',
    service_name: 'openrouter',
    api_key: 'sk-or-v1-9876543210abcdef0123456789abcdef',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'cred-reoon-01',
    service_name: 'reoon',
    api_key: 'reoon_api_key_live_sec_8849204829',
    is_active: true,
    created_at: new Date().toISOString()
  }
];

export default function IntegrationsPage() {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modais de Credencial
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ service_name: 'apollo', api_key: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Calibração e Saldos
  const [reoonBalance, setReoonBalance] = useState(null);
  const [apolloEstimate, setApolloEstimate] = useState(null);
  const [calibratingApollo, setCalibratingApollo] = useState(false);
  const [calibrationForm, setCalibrationForm] = useState({ balance: '', renewsAt: '' });

  // Estados locais para serviços sem chave no banco (Reacher, BrasilAPI)
  const [localServicesActive, setLocalServicesActive] = useState(() => {
    try {
      const saved = localStorage.getItem('core_local_services_active');
      return saved ? JSON.parse(saved) : { reacher: true, brasilapi: true };
    } catch {
      return { reacher: true, brasilapi: true };
    }
  });

  // Evolution API WhatsApp State
  const [whatsAppDetails, setWhatsAppDetails] = useState({
    isConnected: false,
    status: 'close',
    profileName: null,
    profilePicUrl: null,
    ownerJid: null,
    formattedPhone: null,
    number: null,
    instanceName: 'Criativa-Core-Outbound',
    serverUrl: 'http://127.0.0.1:8081'
  });
  const [loadingWhatsAppAction, setLoadingWhatsAppAction] = useState(false);
  const [whatsAppActionMsg, setWhatsAppActionMsg] = useState('');
  const [testingPing, setTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState(null);
  
  // Modais de WhatsApp
  const [isWhatsAppDrawerOpen, setIsWhatsAppDrawerOpen] = useState(false);
  const [isWhatsAppQRModalOpen, setIsWhatsAppQRModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const loadWhatsAppStatus = useCallback(async () => {
    try {
      const details = await fetchInstanceDetails('Criativa-Core-Outbound');
      setWhatsAppDetails(details);
    } catch (e) {
      console.warn('Erro ao carregar status do WhatsApp:', e);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
    loadWhatsAppStatus();

    const handleStatusChanged = () => {
      loadWhatsAppStatus();
    };

    window.addEventListener('whatsapp-status-changed', handleStatusChanged);
    window.addEventListener('storage', handleStatusChanged);

    // Polling a cada 10 segundos na tela de integrações para atualização em tempo real
    const interval = setInterval(loadWhatsAppStatus, 10000);

    return () => {
      window.removeEventListener('whatsapp-status-changed', handleStatusChanged);
      window.removeEventListener('storage', handleStatusChanged);
      clearInterval(interval);
    };
  }, [user, loadWhatsAppStatus]);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      let fetchedCredentials = null;

      // 1. Tentar buscar via endpoint REST /api/credentials
      try {
        const res = await fetch('/api/credentials');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.credentials) && data.credentials.length > 0) {
            fetchedCredentials = data.credentials;
            setCredentials(data.credentials);
          }
        }
      } catch (apiErr) {
        console.warn('Endpoint /api/credentials indisponível, acionando fallback Supabase:', apiErr);
      }

      // 2. Fallback para Supabase
      if (!fetchedCredentials) {
        try {
          let { data, error } = await supabase
            .from('credentials')
            .select('*')
            .order('created_at', { ascending: false });

          if (user?.id) {
            const userSpecific = (data || []).filter(c => c.user_id === user.id);
            if (userSpecific.length > 0) {
              data = userSpecific;
            }
          }

          if (!error && data && data.length > 0) {
            fetchedCredentials = data;
            setCredentials(data);
          }
        } catch (dbErr) {
          console.warn('Fallback Supabase indisponível:', dbErr);
        }
      }

      // 3. Fallback de persistência local / mock
      if (!fetchedCredentials || fetchedCredentials.length === 0) {
        try {
          const stored = localStorage.getItem('core_credentials');
          if (stored) {
            const parsed = JSON.parse(stored);
            fetchedCredentials = parsed;
            setCredentials(parsed);
          } else {
            fetchedCredentials = DEFAULT_CREDENTIALS;
            setCredentials(DEFAULT_CREDENTIALS);
            localStorage.setItem('core_credentials', JSON.stringify(DEFAULT_CREDENTIALS));
          }
        } catch {
          fetchedCredentials = DEFAULT_CREDENTIALS;
          setCredentials(DEFAULT_CREDENTIALS);
        }
      }

      const activeList = fetchedCredentials || [];
      const hasActiveReoon = activeList.some(c => (c.service_name || '').toLowerCase() === 'reoon' && c.is_active);
      if (hasActiveReoon) {
        callReoonProxy('check_balance').then(setReoonBalance).catch(() => setReoonBalance(null));
      }

      const hasActiveApollo = activeList.some(c => (c.service_name || '').toLowerCase() === 'apollo' && c.is_active);
      if (hasActiveApollo) {
        estimateApolloCredits(user?.id).then(setApolloEstimate).catch(() => setApolloEstimate(null));
      }
    } catch (error) {
      console.error('Error fetching credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  // Desconectar / Deslogar WhatsApp
  const handleLogoutWhatsApp = async () => {
    try {
      setLoadingWhatsAppAction(true);
      setWhatsAppActionMsg('Desconectando WhatsApp...');
      await logoutInstance('Criativa-Core-Outbound');
      await loadWhatsAppStatus();
    } catch (e) {
      console.error('Erro ao desconectar WhatsApp:', e);
      alert('Erro ao desconectar WhatsApp: ' + e.message);
    } finally {
      setLoadingWhatsAppAction(false);
      setWhatsAppActionMsg('');
    }
  };

  // Deletar Instância WhatsApp
  const handleDeleteWhatsAppInstance = async () => {
    try {
      setLoadingWhatsAppAction(true);
      setWhatsAppActionMsg('Deletando instância na Evolution API...');
      setDeleteConfirmOpen(false);
      await deleteInstance('Criativa-Core-Outbound');
      await loadWhatsAppStatus();
    } catch (e) {
      console.error('Erro ao deletar instância:', e);
      alert('Erro ao deletar instância: ' + e.message);
    } finally {
      setLoadingWhatsAppAction(false);
      setWhatsAppActionMsg('');
    }
  };

  // Testar Conexão / Ping Evolution API
  const handleTestWhatsAppPing = async () => {
    setTestingPing(true);
    setPingResult(null);
    try {
      const start = Date.now();
      const res = await fetch('/api/evolution/instance/connectionState/Criativa-Core-Outbound', {
        headers: { 'apikey': 'criativa-local-dev-key' }
      });
      const data = await res.json();
      const latency = Date.now() - start;
      const state = data.instance?.state || data.state || (whatsAppDetails.isConnected ? 'open' : 'close');

      setPingResult({
        success: true,
        state,
        latency: `${latency}ms`,
        timestamp: new Date().toLocaleTimeString('pt-BR')
      });
    } catch (e) {
      setPingResult({
        success: false,
        error: e.message || 'Container Evolution API indisponível',
        timestamp: new Date().toLocaleTimeString('pt-BR')
      });
    } finally {
      setTestingPing(false);
      setTimeout(() => setPingResult(null), 5000);
    }
  };

  const handleWhatsAppConnected = () => {
    loadWhatsAppStatus();
    setIsWhatsAppQRModalOpen(false);
  };

  // Abertura de Modal de Credencial
  const handleOpenModal = (serviceKey = 'apollo', existingCred = null) => {
    if (existingCred) {
      setEditingId(existingCred.id);
      setFormData({ service_name: existingCred.service_name, api_key: existingCred.api_key });
    } else {
      setEditingId(null);
      setFormData({ service_name: serviceKey, api_key: '' });
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

      // 1. Chamar POST /api/credentials/save
      try {
        await fetch('/api/credentials/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            service_name: formData.service_name,
            api_key: formData.api_key,
            user_id: user?.id
          })
        });
      } catch (apiErr) {
        console.warn('Endpoint /api/credentials/save indisponível:', apiErr);
      }

      // 2. Persistir no Supabase
      try {
        if (editingId) {
          const { error } = await supabase
            .from('credentials')
            .update({ api_key: formData.api_key })
            .eq('id', editingId);
          if (error) console.warn('Supabase update warning:', error);
        } else {
          const { error } = await supabase
            .from('credentials')
            .insert({ 
              service_name: formData.service_name, 
              api_key: formData.api_key, 
              user_id: user?.id,
              is_active: true
            });
          if (error) console.warn('Supabase insert warning:', error);
        }
      } catch (dbErr) {
        console.warn('Erro ao salvar no Supabase:', dbErr);
      }

      // 3. Atualizar no localStorage
      try {
        const stored = localStorage.getItem('core_credentials');
        let list = stored ? JSON.parse(stored) : [...DEFAULT_CREDENTIALS];
        if (editingId) {
          list = list.map(c => c.id === editingId ? { ...c, api_key: formData.api_key } : c);
        } else {
          const existingIdx = list.findIndex(c => (c.service_name || '').toLowerCase() === formData.service_name.toLowerCase());
          if (existingIdx !== -1) {
            list[existingIdx] = { ...list[existingIdx], api_key: formData.api_key, is_active: true };
          } else {
            list.push({
              id: `cred-${formData.service_name}-${Date.now()}`,
              service_name: formData.service_name,
              api_key: formData.api_key,
              is_active: true,
              created_at: new Date().toISOString()
            });
          }
        }
        localStorage.setItem('core_credentials', JSON.stringify(list));
      } catch (storageErr) {
        console.warn('Erro ao salvar no localStorage:', storageErr);
      }

      handleCloseModal();
      await fetchCredentials();
    } catch (error) {
      console.error('Error saving credential:', error);
      alert('Erro ao salvar credencial: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (serviceKey, existingCred) => {
    // Se for serviço local (reacher, brasilapi)
    if (!existingCred && (serviceKey === 'reacher' || serviceKey === 'brasilapi')) {
      const current = !!localServicesActive[serviceKey];
      const updated = { ...localServicesActive, [serviceKey]: !current };
      setLocalServicesActive(updated);
      try {
        localStorage.setItem('core_local_services_active', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return;
    }

    // Se tem credencial
    if (existingCred) {
      const newActiveState = !existingCred.is_active;

      // 1. Chamar POST /api/credentials/toggle passando id e novo is_active
      try {
        await fetch('/api/credentials/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: existingCred.id,
            is_active: newActiveState
          })
        });
      } catch (apiErr) {
        console.warn('Endpoint /api/credentials/toggle indisponível:', apiErr);
      }

      // 2. Atualizar no Supabase
      try {
        const { error } = await supabase
          .from('credentials')
          .update({ is_active: newActiveState })
          .eq('id', existingCred.id);
        if (error) console.warn('Supabase toggle warning:', error);
      } catch (dbErr) {
        console.warn('Erro ao atualizar toggle no Supabase:', dbErr);
      }

      // 3. Atualizar no localStorage
      try {
        const stored = localStorage.getItem('core_credentials');
        if (stored) {
          const list = JSON.parse(stored);
          const idx = list.findIndex(c => c.id === existingCred.id || (c.service_name || '').toLowerCase() === serviceKey.toLowerCase());
          if (idx !== -1) {
            list[idx].is_active = newActiveState;
            localStorage.setItem('core_credentials', JSON.stringify(list));
          }
        }
      } catch (storageErr) {
        console.warn('Erro ao salvar toggle no localStorage:', storageErr);
      }

      await fetchCredentials();
    } else {
      // Se não tem credencial salva, convida a cadastrar
      handleOpenModal(serviceKey);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta chave de integração?')) {
      try {
        try {
          const { error } = await supabase.from('credentials').delete().eq('id', id);
          if (error) console.warn('Supabase delete warning:', error);
        } catch (dbErr) {
          console.warn('Erro ao deletar no Supabase:', dbErr);
        }

        try {
          const stored = localStorage.getItem('core_credentials');
          if (stored) {
            const list = JSON.parse(stored).filter(c => c.id !== id);
            localStorage.setItem('core_credentials', JSON.stringify(list));
          }
        } catch (storageErr) {
          console.warn('Erro ao salvar exclusão no localStorage:', storageErr);
        }

        await fetchCredentials();
      } catch (error) {
        console.error('Error deleting credential:', error);
      }
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

  const maskApiKey = (key) => {
    if (!key || key.length < 8) return '••••••••';
    return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '350px', gap: '16px' }}>
        <div className="spinner"></div>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Carregando integrações do ecossistema CORE...</p>
      </div>
    );
  }

  const isConnected = whatsAppDetails.isConnected;

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Integrações & Conectores</h1>
          <p className="page-subtitle">Gerencie WhatsApp Outbound, motores de busca, IA e provedores de envio em um único painel central</p>
        </div>
        <button onClick={() => handleOpenModal('apollo')} className="btn btn-primary">
          <Plus size={18} /> Adicionar Chave de API
        </button>
      </div>

      {/* ============================================================
          1. WHATSAPP OUTBOUND (EVOLUTION API) - CARD DEDICADO DARK GLASS
         ============================================================ */}
      <div 
        className="glass-card" 
        style={{
          padding: '24px 28px',
          marginBottom: '32px',
          borderLeft: `4px solid ${isConnected ? '#10b981' : '#f59e0b'}`,
          background: isConnected 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)' 
            : 'linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          
          {/* Lado Esquerdo: Avatar, Foto, Nome, Número e Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', minWidth: '280px' }}>
            {/* Foto de Perfil ou Avatar Estilizado */}
            <div style={{ position: 'relative' }}>
              {isConnected && whatsAppDetails.profilePicUrl ? (
                <img 
                  src={whatsAppDetails.profilePicUrl} 
                  alt="WhatsApp Profile" 
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    objectFit: 'cover',
                    border: '2px solid rgba(16, 185, 129, 0.5)',
                    boxShadow: '0 0 16px rgba(16, 185, 129, 0.25)'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.12)',
                  color: isConnected ? '#10b981' : '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isConnected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.2)',
                  boxShadow: isConnected ? '0 0 16px rgba(16, 185, 129, 0.2)' : 'none'
                }}>
                  <MessageSquare size={28} />
                </div>
              )}

              {/* Dot Indicador */}
              <span 
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: isConnected ? '#10b981' : '#64748b',
                  border: '2px solid #0e0e17',
                  boxShadow: isConnected ? '0 0 8px #10b981' : 'none'
                }}
              />
            </div>

            {/* Informações da Conexão */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Evolution API — WhatsApp Outbound
                </h3>
                {isConnected ? (
                  <span 
                    className="badge" 
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      fontWeight: 600,
                      padding: '4px 10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span className="pulsing-dot-emerald" style={{ width: '6px', height: '6px' }} />
                    Conexão Ativa & Operacional
                  </span>
                ) : (
                  <span 
                    className="badge" 
                    style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      color: '#f59e0b',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      fontWeight: 600,
                      padding: '4px 10px'
                    }}
                  >
                    Desconectado / Aguardando Conexão
                  </span>
                )}
              </div>

              {/* Dados do perfil conectado */}
              {isConnected ? (
                <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.84rem' }}>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                    {whatsAppDetails.profileName || 'WhatsApp Conectado'}
                  </span>
                  <span style={{ color: '#64748b' }}>•</span>
                  <span style={{ color: '#10b981', fontFamily: 'monospace', fontWeight: 600 }}>
                    {whatsAppDetails.formattedPhone || whatsAppDetails.ownerJid || '+55 (11) 92561-1381'}
                  </span>
                  <span style={{ color: '#64748b' }}>•</span>
                  <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                    Instância: <strong style={{ color: '#cbd5e1' }}>{whatsAppDetails.instanceName}</strong>
                  </span>
                </div>
              ) : (
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>
                  Nenhum WhatsApp conectado no momento. Conecte sua instância para disparos B2B e atendimento CRM.
                </p>
              )}
            </div>
          </div>

          {/* Lado Direito: Ações Rápidas */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {isConnected ? (
              <>
                {/* Botão Testar Envio */}
                <button
                  onClick={() => setIsWhatsAppDrawerOpen(true)}
                  className="btn btn-sm btn-primary"
                  style={{ background: '#10b981', color: '#0a0a0f', fontWeight: 600, padding: '8px 14px' }}
                  title="Abrir WhatsApp Chat Drawer com lead de teste via Evolution API"
                >
                  <Zap size={15} /> Testar Envio
                </button>

                {/* Botão Testar Ping / Latência */}
                <button
                  onClick={handleTestWhatsAppPing}
                  disabled={testingPing}
                  className="btn btn-sm btn-secondary"
                  style={{ padding: '8px 12px' }}
                  title="Testar latência com o container Evolution API"
                >
                  <RefreshCw size={14} className={testingPing ? 'animate-spin' : ''} />
                  {testingPing ? 'Testando...' : 'Testar Conexão'}
                </button>

                {/* Botão Desconectar / Deslogar */}
                <button
                  onClick={handleLogoutWhatsApp}
                  disabled={loadingWhatsAppAction}
                  className="btn btn-sm btn-secondary"
                  style={{ padding: '8px 12px', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.2)' }}
                  title="Desconectar sessão sem apagar as configurações"
                >
                  <LogOut size={14} />
                  {loadingWhatsAppAction ? 'Desconectando...' : 'Desconectar'}
                </button>

                {/* Botão Deletar Instância */}
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={loadingWhatsAppAction}
                  className="btn btn-sm btn-danger"
                  style={{ padding: '8px 12px' }}
                  title="Deletar instância atual para abrir espaço a um novo QR Code"
                >
                  <Trash2 size={14} /> Deletar Instância
                </button>
              </>
            ) : (
              <>
                {/* Botão Conectar WhatsApp (QR Code) destacado */}
                <button
                  onClick={() => setIsWhatsAppQRModalOpen(true)}
                  className="btn btn-sm btn-primary"
                  style={{ 
                    background: 'linear-gradient(135deg, #10b981 0%, #00d4ff 100%)', 
                    color: '#0a0a0f', 
                    fontWeight: 700, 
                    padding: '8px 18px',
                    boxShadow: '0 0 20px rgba(16,185,129,0.3)'
                  }}
                >
                  <Smartphone size={16} /> Conectar WhatsApp (QR Code)
                </button>

                {/* Botão Testar Ping */}
                <button
                  onClick={handleTestWhatsAppPing}
                  disabled={testingPing}
                  className="btn btn-sm btn-secondary"
                  style={{ padding: '8px 12px' }}
                >
                  <RefreshCw size={14} className={testingPing ? 'animate-spin' : ''} />
                  {testingPing ? 'Testando...' : 'Testar Servidor'}
                </button>

                {/* Botão Limpar / Deletar Sessão Antiga */}
                <button
                  onClick={handleDeleteWhatsAppInstance}
                  disabled={loadingWhatsAppAction}
                  className="btn btn-sm btn-secondary"
                  style={{ padding: '8px 12px', color: '#94a3b8' }}
                  title="Limpar qualquer instância travada na Evolution API"
                >
                  <Trash2 size={14} /> Limpar Sessão
                </button>
              </>
            )}
          </div>
        </div>

        {/* Feedback visual de loading em ações */}
        {loadingWhatsAppAction && (
          <div className="animate-fade-in" style={{
            marginTop: '16px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(0, 212, 255, 0.1)',
            border: '1px solid rgba(0, 212, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.82rem',
            color: '#00d4ff'
          }}>
            <RefreshCw size={15} className="animate-spin" />
            <span>{whatsAppActionMsg || 'Processando comando na Evolution API...'}</span>
          </div>
        )}

        {/* Live Ping Feedback */}
        {pingResult && (
          <div className="animate-fade-in" style={{
            marginTop: '16px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: pingResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
            border: pingResult.success ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.82rem',
            color: pingResult.success ? '#10b981' : '#f43f5e'
          }}>
            {pingResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>
              {pingResult.success 
                ? `Container Evolution API operacional! Estado: ${pingResult.state.toUpperCase()} · Latência: ${pingResult.latency} (verificado às ${pingResult.timestamp}).`
                : `Falha ao pingar Evolution API: ${pingResult.error} (${pingResult.timestamp}).`
              }
            </span>
          </div>
        )}
      </div>

      {/* ============================================================
          2. GRID DE INTEGRAÇÕES DO SISTEMA (TODOS SEMPRE VISÍVEIS)
         ============================================================ */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', margin: 0 }}>
            Serviços & Conectores de Dados
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
            Todos os módulos essenciais da arquitetura CORE configuráveis via chave de API ou container Docker
          </p>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          {SYSTEM_INTEGRATION_CATALOG.length} serviços no catálogo
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {SYSTEM_INTEGRATION_CATALOG.map((service) => {
          const ServiceIcon = service.icon;
          const cred = credentials.find(c => (c.service_name || '').toLowerCase() === service.key.toLowerCase());
          const isDockerOrPublic = !service.requiresApiKey;
          const isConfigured = !!cred || isDockerOrPublic;
          
          let isActive = false;
          if (cred) {
            isActive = cred.is_active !== false && cred.is_active !== 0;
          } else if (isDockerOrPublic) {
            isActive = !!localServicesActive[service.key];
          }

          return (
            <div 
              key={service.key} 
              className="glass-card" 
              style={{ 
                padding: '24px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                borderTop: `3px solid ${service.color}`
              }}
            >
              {/* Topo do Card: Ícone, Nome, Categoria e Status */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '42px', 
                      height: '42px', 
                      borderRadius: '12px',
                      background: `${service.color}15`, 
                      color: service.color,
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: `1px solid ${service.color}30`
                    }}>
                      <ServiceIcon size={22} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', margin: 0 }}>
                        {service.name}
                      </h3>
                      <span style={{ fontSize: '0.72rem', color: service.color, fontWeight: 500 }}>
                        {service.badgeText}
                      </span>
                    </div>
                  </div>

                  {/* Badge de Status */}
                  <span 
                    className="badge" 
                    style={{
                      background: isActive 
                        ? 'rgba(16, 185, 129, 0.12)' 
                        : (isConfigured ? 'rgba(245, 158, 11, 0.12)' : 'rgba(148, 163, 184, 0.1)'),
                      color: isActive 
                        ? '#10b981' 
                        : (isConfigured ? '#f59e0b' : '#64748b'),
                      fontSize: '0.7rem',
                      fontWeight: 600
                    }}
                  >
                    {isActive ? 'Ativo' : (isConfigured ? 'Inativo' : 'Não Configurado')}
                  </span>
                </div>

                <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.45', marginBottom: '16px' }}>
                  {service.description}
                </p>

                {/* API Key ou Indicador de Docker */}
                {cred ? (
                  <div style={{
                    background: 'rgba(0,0,0,0.35)', 
                    borderRadius: '8px', 
                    padding: '8px 12px',
                    fontFamily: "'Courier New', monospace", 
                    fontSize: '0.78rem', 
                    color: '#94a3b8',
                    marginBottom: '14px', 
                    letterSpacing: '0.5px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <span>{maskApiKey(cred.api_key)}</span>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Chave Registrada</span>
                  </div>
                ) : isDockerOrPublic ? (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.05)', 
                    borderRadius: '8px', 
                    padding: '8px 12px',
                    fontSize: '0.75rem', 
                    color: '#10b981',
                    marginBottom: '14px',
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <CheckCircle2 size={13} />
                    <span>{service.key === 'reacher' ? 'Docker SMTP Local :8080 Conectado' : 'API Pública BrasilAPI Sem Chave'}</span>
                  </div>
                ) : (
                  <div style={{ marginBottom: '14px' }}>
                    <button
                      onClick={() => handleOpenModal(service.key)}
                      className="btn btn-sm btn-secondary"
                      style={{ 
                        width: '100%', 
                        fontSize: '0.76rem', 
                        padding: '6px 10px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px dashed rgba(255,255,255,0.15)',
                        color: '#94a3b8'
                      }}
                    >
                      <Plus size={13} /> Configurar Chave de API
                    </button>
                  </div>
                )}

                {/* Detalhes específicos de saldo do Apollo */}
                {service.key === 'apollo' && (
                  <div style={{ marginBottom: '14px' }}>
                    {cred && calibratingApollo === cred.id ? (
                      <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '8px' }}>
                          Copie do painel Apollo (Configurações → Créditos):
                        </p>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                          <input
                            type="number"
                            min="0"
                            placeholder="Saldo disponível"
                            className="form-input"
                            style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                            value={calibrationForm.balance}
                            onChange={(e) => setCalibrationForm({ ...calibrationForm, balance: e.target.value })}
                          />
                          <input
                            type="date"
                            className="form-input"
                            style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                            value={calibrationForm.renewsAt}
                            onChange={(e) => setCalibrationForm({ ...calibrationForm, renewsAt: e.target.value })}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleSaveCalibration(cred.id)} className="btn btn-sm btn-primary" style={{ padding: '4px 10px', fontSize: '0.72rem' }}>Salvar</button>
                          <button onClick={() => setCalibratingApollo(false)} className="btn btn-sm btn-secondary" style={{ padding: '4px 8px', fontSize: '0.72rem' }}>Cancelar</button>
                        </div>
                      </div>
                    ) : cred ? (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {apolloEstimate ? (
                          <span>
                            Estimado: <strong style={{ color: apolloEstimate.estimatedRemaining <= 10 ? '#f43f5e' : '#3b82f6' }}>{apolloEstimate.estimatedRemaining}</strong> de {apolloEstimate.calibratedBalance} créditos
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>Saldo Apollo não calibrado</span>
                        )}
                        <button 
                          onClick={() => handleOpenCalibration(cred)} 
                          style={{ background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline' }}
                        >
                          recalibrar
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Detalhes de saldo do Reoon */}
                {service.key === 'reoon' && reoonBalance && (
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '14px' }}>
                    Créditos restantes hoje: <strong style={{ color: '#10b981' }}>{reoonBalance.remaining_daily_credits}</strong>
                    {' · '}Instantâneos: <strong style={{ color: '#e2e8f0' }}>{reoonBalance.remaining_instant_credits}</strong>
                  </p>
                )}
              </div>

              {/* Rodapé do Card: Switcher Toggle e Ações */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px', marginTop: '6px' }}>
                <button
                  onClick={() => handleToggleActive(service.key, cred)}
                  className={`toggle ${isActive ? 'active' : ''}`}
                  title={isActive ? 'Desativar este conector' : 'Ativar este conector'}
                />

                <div style={{ display: 'flex', gap: '8px' }}>
                  {cred ? (
                    <>
                      <button 
                        onClick={() => handleOpenModal(service.key, cred)} 
                        className="btn-icon" 
                        title="Editar Chave"
                        style={{ width: '32px', height: '32px' }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(cred.id)}
                        className="btn-icon"
                        title="Excluir Chave"
                        style={{ width: '32px', height: '32px', color: '#f43f5e' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : service.requiresApiKey ? (
                    <button
                      onClick={() => handleOpenModal(service.key)}
                      className="btn btn-sm btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                    >
                      <Plus size={12} /> Inserir Chave
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Conector Nativo</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================
          3. MODAL ADICIONAR / EDITAR CREDENCIAL DE API
         ============================================================ */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar Chave de Integração' : 'Nova Integração de Serviço'}</h2>
              <button onClick={handleCloseModal} className="btn-icon" style={{ border: 'none', background: 'transparent' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Serviço de Destino</label>
                <select 
                  className="form-select"
                  value={formData.service_name}
                  onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                  disabled={!!editingId}
                >
                  {SYSTEM_INTEGRATION_CATALOG.filter(s => s.requiresApiKey).map(s => (
                    <option key={s.key} value={s.key}>
                      {s.name} — {s.category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Chave de API / Token Secreto</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showApiKey ? 'text' : 'password'}
                    className="form-input"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    placeholder="Cole aqui sua API Key ou Token..."
                    required
                    style={{ paddingRight: '44px', fontFamily: showApiKey ? 'monospace' : 'inherit' }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{
                      position: 'absolute', 
                      right: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      background: 'none', 
                      border: 'none', 
                      color: '#64748b', 
                      cursor: 'pointer'
                    }}
                  >
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                  A chave é armazenada de forma segura e criptografada via Supabase Row Level Security.
                </p>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting || !formData.api_key.trim()} className="btn btn-primary">
                  {isSubmitting ? 'Salvando...' : (editingId ? 'Atualizar Chave' : 'Salvar Integração')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          4. MODAL DE CONFIRMAÇÃO PARA DELETAR INSTÂNCIA WHATSAPP
         ============================================================ */}
      {deleteConfirmOpen && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2 style={{ color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} /> Deletar Instância WhatsApp?
              </h2>
              <button onClick={() => setDeleteConfirmOpen(false)} className="btn-icon" style={{ border: 'none', background: 'transparent' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '20px' }}>
              Esta ação removerá completamente a sessão <strong style={{ color: '#fff' }}>Criativa-Core-Outbound</strong> do servidor Evolution API.
              O espaço será liberado imediatamente para que você gere um novo QR Code e faça um novo teste de conexão.
            </p>

            <div className="modal-footer">
              <button 
                type="button" 
                onClick={() => setDeleteConfirmOpen(false)} 
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleDeleteWhatsAppInstance} 
                className="btn btn-danger"
                style={{ background: '#f43f5e', color: '#fff', fontWeight: 600 }}
              >
                Sim, Deletar Instância
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gaveta de Chat Teste WhatsApp (Evolution API) */}
      <WhatsAppChatDrawer
        isOpen={isWhatsAppDrawerOpen}
        onClose={() => setIsWhatsAppDrawerOpen(false)}
        lead={{
          id: 'test-lead-01',
          first_name: 'Carlos',
          last_name: 'Eduardo (Demonstração)',
          name: 'Carlos Eduardo (Demonstração)',
          company_name: 'TechLog Brasil Logística Inteligente',
          phone: whatsAppDetails.formattedPhone || whatsAppDetails.number || '+55 (11) 98765-4321',
          email: 'carlos.silveira@techlogbrasil.com.br',
          segment: 'Logística & Supply Chain',
          qualification_status: 'hot',
          validation_status: 'valid',
          funnel_status: 'replied',
          current_step: 2
        }}
      />

      {/* Modal de QR Code WhatsApp */}
      <WhatsAppQRModal
        isOpen={isWhatsAppQRModalOpen}
        onClose={() => setIsWhatsAppQRModalOpen(false)}
        onConnected={handleWhatsAppConnected}
      />
    </div>
  );
}
