import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Megaphone, Plug, Users, LogOut, List, Contact } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/campaigns', icon: Megaphone, label: 'Campanhas' },
    { to: '/leads', icon: Contact, label: 'Leads' },
    { to: '/prospector', icon: List, label: 'Listas Apollo' },
    { to: '/integrations', icon: Plug, label: 'Integrações' },
    { to: '/crm', icon: Users, label: 'CRM / Inbox' },
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

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
