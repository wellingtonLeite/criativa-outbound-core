import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const MOCK_USER = {
  id: 'usr-mock-admin-01',
  email: 'admin@criativaoutbound.com.br',
  user_metadata: {
    name: 'Admin Criativa Outbound',
    role: 'admin',
    company: 'Criativa Outbound'
  }
};

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  isMockMode: false,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => ({})
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      // Check if user previously signed out in mock mode
      const mockLoggedOut = localStorage.getItem('core_mock_logged_out');
      const savedMockUser = localStorage.getItem('core_mock_user');

      if (!isSupabaseConfigured) {
        if (mounted) {
          setIsMockMode(true);
          if (mockLoggedOut === 'true') {
            setUser(null);
            setSession(null);
          } else {
            const activeUser = savedMockUser ? JSON.parse(savedMockUser) : MOCK_USER;
            setUser(activeUser);
            setSession({ user: activeUser, access_token: 'mock-token' });
          }
          setLoading(false);
        }
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            setSession(session);
            setUser(session.user);
            setIsMockMode(false);
          } else if (mockLoggedOut !== 'true') {
            // Fallback to mock user for dev ease
            setIsMockMode(true);
            const activeUser = savedMockUser ? JSON.parse(savedMockUser) : MOCK_USER;
            setUser(activeUser);
            setSession({ user: activeUser, access_token: 'mock-token' });
          } else {
            setUser(null);
            setSession(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.warn('Supabase auth unavailable, falling back to mock session:', err);
        if (mounted) {
          setIsMockMode(true);
          if (mockLoggedOut !== 'true') {
            const activeUser = savedMockUser ? JSON.parse(savedMockUser) : MOCK_USER;
            setUser(activeUser);
            setSession({ user: activeUser, access_token: 'mock-token' });
          } else {
            setUser(null);
            setSession(null);
          }
          setLoading(false);
        }
      }
    }

    initAuth();

    let subscription = null;
    if (isSupabaseConfigured) {
      try {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (mounted) {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
          }
        });
        subscription = data?.subscription;
      } catch {
        // Ignore subscription error in offline mode
      }
    }

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    localStorage.removeItem('core_mock_logged_out');
    if (isSupabaseConfigured) {
      try {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.data?.user) {
          setUser(result.data.user);
          setSession(result.data.session);
          setIsMockMode(false);
          return result;
        }
      } catch (err) {
        console.warn('Real login failed, falling back to mock authentication:', err);
      }
    }

    // Mock Login fallback
    const mockUser = {
      id: `usr-mock-${Date.now()}`,
      email: email || 'admin@criativaoutbound.com.br',
      user_metadata: {
        name: email ? email.split('@')[0] : 'Admin Criativa',
        role: 'admin'
      }
    };
    localStorage.setItem('core_mock_user', JSON.stringify(mockUser));
    setUser(mockUser);
    setSession({ user: mockUser, access_token: 'mock-token' });
    setIsMockMode(true);
    return { data: { user: mockUser, session: { user: mockUser } }, error: null };
  };

  const signUp = async (email, password) => {
    localStorage.removeItem('core_mock_logged_out');
    if (isSupabaseConfigured) {
      try {
        const result = await supabase.auth.signUp({ email, password });
        if (result.data?.user) {
          setUser(result.data.user);
          setSession(result.data.session);
          return result;
        }
      } catch (err) {
        console.warn('Real signup failed, fallback to mock auth:', err);
      }
    }

    const mockUser = {
      id: `usr-mock-${Date.now()}`,
      email: email || 'novo@criativaoutbound.com.br',
      user_metadata: {
        name: email ? email.split('@')[0] : 'Novo Usuário',
        role: 'user'
      }
    };
    localStorage.setItem('core_mock_user', JSON.stringify(mockUser));
    setUser(mockUser);
    setSession({ user: mockUser, access_token: 'mock-token' });
    setIsMockMode(true);
    return { data: { user: mockUser, session: { user: mockUser } }, error: null };
  };

  const signOut = async () => {
    localStorage.setItem('core_mock_logged_out', 'true');
    localStorage.removeItem('core_mock_user');
    setUser(null);
    setSession(null);
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut notice:', e);
      }
    }
    return { error: null };
  };

  const value = {
    user,
    session,
    loading,
    isMockMode,
    signIn,
    signUp,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};

