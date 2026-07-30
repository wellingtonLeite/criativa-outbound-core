import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Megaphone, Plug, Users, LogOut, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="app-layout flex h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="sidebar w-64 glass-card border-r border-gray-800/50 flex flex-col z-10 bg-[#1a1a2e]/40 backdrop-blur-xl">
        <div className="p-6">
          <h1 className="sidebar-logo text-3xl font-bold tracking-wider flex items-center gap-1">
            CORE<span className="text-[#00d4ff] text-4xl leading-none">.</span>
          </h1>
        </div>

        <nav className="sidebar-nav flex-1 px-4 space-y-2 mt-4">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`
            }
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </NavLink>
          <NavLink
            to="/campaigns"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`
            }
          >
            <Megaphone size={20} />
            <span className="font-medium">Campanhas</span>
          </NavLink>
          <NavLink
            to="/prospector"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`
            }
          >
            <Search size={20} />
            <span className="font-medium">Prospecção Apollo</span>
          </NavLink>
          <NavLink
            to="/integrations"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`
            }
          >
            <Plug size={20} />
            <span className="font-medium">Integrações</span>
          </NavLink>
          <NavLink
            to="/crm"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`
            }
          >
            <Users size={20} />
            <span className="font-medium">CRM / Inbox</span>
          </NavLink>
        </nav>

        <div className="sidebar-user p-4 border-t border-gray-800/50 mt-auto bg-black/20">
          <div className="flex items-center justify-between px-2 min-w-0">
            <div className="flex-1 min-w-0 mr-2">
              <div className="truncate text-sm text-gray-400 font-medium">
                {user?.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-rose-500 transition-colors p-2 rounded-lg hover:bg-rose-500/10"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content flex-1 overflow-y-auto relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1a1a2e]/30 via-[#0a0a0f] to-[#0a0a0f]">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
