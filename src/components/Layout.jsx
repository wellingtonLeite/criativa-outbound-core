import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Sparkles, 
  ShieldCheck, 
  Contact,
  Megaphone, 
  MessageSquare, 
  Plug, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchInstanceDetails } from '../lib/evolutionClient';
import WhatsAppQRModal from './WhatsAppQRModal';

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [whatsAppInfo, setWhatsAppInfo] = useState({
    isConnected: false,
    status: 'close',
    profileName: null,
    formattedPhone: null,
    profilePicUrl: null,
    instanceName: 'Criativa-Core-Outbound'
  });
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const checkWhatsAppStatus = useCallback(async () => {
    try {
      const details = await fetchInstanceDetails('Criativa-Core-Outbound');
      setWhatsAppInfo(details);
    } catch (e) {
      console.warn('[Layout] Erro ao verificar status do WhatsApp:', e);
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkWhatsAppStatus();

    // Listen to real-time custom events
    const handleStatusChanged = (e) => {
      if (e?.detail) {
        setWhatsAppInfo(prev => ({
          ...prev,
          isConnected: e.detail.isConnected ?? prev.isConnected,
          status: e.detail.status ?? prev.status,
          profileName: e.detail.profileName ?? prev.profileName,
          formattedPhone: e.detail.formattedPhone ?? prev.formattedPhone,
          profilePicUrl: e.detail.profilePicUrl ?? prev.profilePicUrl
        }));
      }
      checkWhatsAppStatus();
    };

    const handleStorage = (e) => {
      if (e.key === 'whatsapp_integration_status' || e.key === 'whatsapp_connected_profile') {
        checkWhatsAppStatus();
      }
    };

    window.addEventListener('whatsapp-status-changed', handleStatusChanged);
    window.addEventListener('storage', handleStorage);

    // Smooth background polling every 15 seconds
    const interval = setInterval(checkWhatsAppStatus, 15000);

    return () => {
      window.removeEventListener('whatsapp-status-changed', handleStatusChanged);
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [checkWhatsAppStatus]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard Operacional', end: true },
    { to: '/prospector', icon: Sparkles, label: '1. Minerar Leads' },
    { to: '/diagnostico', icon: ShieldCheck, label: '2. Higienizar Lista' },
    { to: '/leads', icon: Contact, label: 'Base de Leads' },
    { to: '/campaigns', icon: Megaphone, label: '3. Campanhas & Disparos' },
    { to: '/crm', icon: MessageSquare, label: '4. CRM & Conversas' },
    { to: '/integrations', icon: Plug, label: 'Integrações' },
  ];

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          CORE<span style={{ color: '#00d4ff' }}>.</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <span className="sidebar-user-email">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="btn-icon"
            title="Sair"
            style={{ border: 'none', background: 'transparent', color: '#64748b' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Wrapper with Sticky Topbar */}
      <div className="app-main-wrapper">
        <header className="app-topbar">
          <div className="topbar-left">
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#00d4ff', fontWeight: 800 }}>CORE</span>
              <span style={{ color: '#64748b' }}>/</span>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Outbound Engine</span>
            </span>
          </div>

          <div className="topbar-right">
            {/* Global WhatsApp Status Indicator */}
            {whatsAppInfo.isConnected ? (
              <button
                onClick={() => navigate('/integrations')}
                className="whatsapp-topbar-badge connected"
                title="WhatsApp Conectado e Operacional. Clique para gerenciar em Integrações."
              >
                <span className="pulsing-dot-emerald" />
                <MessageSquare size={14} />
                <span>
                  WhatsApp: <strong style={{ color: '#e2e8f0' }}>{whatsAppInfo.profileName || whatsAppInfo.formattedPhone || 'Ativo & Operacional'}</strong>
                </span>
              </button>
            ) : (
              <div className="whatsapp-topbar-badge disconnected">
                <span className="dot-muted" />
                <span>WhatsApp Desconectado</span>
                <button
                  onClick={() => setIsQRModalOpen(true)}
                  className="btn btn-sm btn-primary"
                  style={{
                    padding: '3px 10px',
                    fontSize: '0.72rem',
                    height: '24px',
                    background: '#10b981',
                    color: '#0a0a0f',
                    fontWeight: 600,
                    borderRadius: '6px'
                  }}
                  title="Conectar WhatsApp agora"
                >
                  Conectar
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {/* WhatsApp QR Modal Shortcut */}
      <WhatsAppQRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        onConnected={() => {
          setIsQRModalOpen(false);
          checkWhatsAppStatus();
        }}
      />
    </div>
  );
}
