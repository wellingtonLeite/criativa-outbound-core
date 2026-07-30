import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else {
        const { error } = await signUp(email, password);
        if (error) throw error;
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-background min-h-screen flex items-center justify-center p-4 bg-[#0a0a0f] relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#7c3aed] rounded-full blur-[120px] opacity-20"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00d4ff] rounded-full blur-[120px] opacity-20"></div>

      <div className="login-card glass-card w-full max-w-md p-8 rounded-2xl shadow-2xl relative z-10 bg-[#1a1a2e]/40 backdrop-blur-xl border border-white/10">
        <div className="text-center mb-8">
          <h1 className="login-logo text-4xl font-bold text-white mb-2 tracking-wider flex items-center justify-center gap-2">
            CORE<span className="text-[#00d4ff] text-5xl leading-none">.</span>
          </h1>
          <p className="login-subtitle text-gray-400 text-sm">Criativa Outbound Real-time Engine</p>
        </div>

        <div className="login-tabs flex mb-6 border-b border-gray-700">
          <button
            type="button"
            className={`login-tab flex-1 pb-3 text-sm font-medium transition-colors relative ${isLogin ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => setIsLogin(true)}
          >
            Entrar
            {isLogin && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#00d4ff]"></div>}
          </button>
          <button
            type="button"
            className={`login-tab flex-1 pb-3 text-sm font-medium transition-colors relative ${!isLogin ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => setIsLogin(false)}
          >
            Criar conta
            {!isLogin && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#00d4ff]"></div>}
          </button>
        </div>

        {error && (
          <div className="login-error bg-rose-500/10 border border-rose-500/50 text-rose-500 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="form-group">
            <label className="form-label block text-sm font-medium text-gray-300 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input w-full bg-[#1a1a2e]/60 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] transition-all"
              placeholder="seu@email.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label block text-sm font-medium text-gray-300 mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input w-full bg-[#1a1a2e]/60 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] transition-all"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full bg-gradient-to-r from-[#7c3aed] to-[#00d4ff] hover:from-[#6d28d9] hover:to-[#00b3d6] text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center h-[44px] shadow-lg shadow-[#7c3aed]/25"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              isLogin ? 'Entrar' : 'Criar conta'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
