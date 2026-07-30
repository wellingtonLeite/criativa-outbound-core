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
    <div className="login-background" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: '#0a0a0f', position: 'relative', overflow: 'hidden' }}>
      {/* Background gradients */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: '#7c3aed', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.2 }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', background: '#00d4ff', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.2 }}></div>

      <div className="login-card glass-card" style={{ width: '100%', maxWidth: '400px', padding: '32px', position: 'relative', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 className="login-logo" style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fff', marginBottom: '8px', letterSpacing: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            CORE<span style={{ color: '#00d4ff', fontSize: '3rem', lineHeight: 1 }}>.</span>
          </h1>
          <p className="login-subtitle" style={{ color: '#64748b', fontSize: '0.875rem' }}>Criativa Outbound Real-time Engine</p>
        </div>

        <div className="login-tabs" style={{ display: 'flex', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            type="button"
            style={{ 
              flex: 1, paddingBottom: '12px', fontSize: '0.875rem', fontWeight: 500, position: 'relative',
              color: isLogin ? '#fff' : '#64748b', background: 'transparent', border: 'none', cursor: 'pointer' 
            }}
            onClick={() => setIsLogin(true)}
          >
            Entrar
            {isLogin && <div style={{ position: 'absolute', bottom: '-1px', left: 0, width: '100%', height: '2px', background: '#00d4ff' }}></div>}
          </button>
          <button
            type="button"
            style={{ 
              flex: 1, paddingBottom: '12px', fontSize: '0.875rem', fontWeight: 500, position: 'relative',
              color: !isLogin ? '#fff' : '#64748b', background: 'transparent', border: 'none', cursor: 'pointer' 
            }}
            onClick={() => setIsLogin(false)}
          >
            Criar conta
            {!isLogin && <div style={{ position: 'absolute', bottom: '-1px', left: 0, width: '100%', height: '2px', background: '#00d4ff' }}></div>}
          </button>
        </div>

        {error && (
          <div className="login-error" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.5)', color: '#f43f5e', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="seu@email.com"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', height: '44px', background: 'linear-gradient(90deg, #7c3aed 0%, #00d4ff 100%)', border: 'none', marginTop: '8px' }}
          >
            {loading ? (
              <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
            ) : (
              isLogin ? 'Entrar' : 'Criar conta'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
