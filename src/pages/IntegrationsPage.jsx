import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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

  useEffect(() => {
    if (user) {
      fetchCredentials();
    }
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
        const { error } = await supabase
          .from('credentials')
          .update({ api_key: formData.api_key })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('credentials')
          .insert({ 
            service_name: formData.service_name, 
            api_key: formData.api_key, 
            user_id: user.id 
          });
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
      // Prompt mentioned is_active, let's use is_active as standard boolean flag
      const { error } = await supabase
        .from('credentials')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      await fetchCredentials();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta integração?')) {
      try {
        const { error } = await supabase
          .from('credentials')
          .delete()
          .eq('id', id);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 animate-fade-in">
        <div className="spinner w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title text-2xl font-bold">Integrações</h1>
          <p className="page-subtitle text-gray-400">Gerencie suas chaves de API</p>
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="btn btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          Nova Integração
        </button>
      </div>

      {credentials.length === 0 ? (
        <div className="empty-state flex flex-col items-center justify-center p-12 glass-card rounded-xl border border-white/10 bg-white/5">
          <div className="empty-state-icon text-gray-500 mb-4">
            <Key size={48} />
          </div>
          <h3 className="text-xl font-semibold mb-2">Nenhuma integração configurada</h3>
          <p className="text-gray-400">Adicione suas chaves de API para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {credentials.map((cred) => (
            <div key={cred.id} className="glass-card credential-card p-6 rounded-xl border border-white/10 flex flex-col justify-between h-full bg-white/5">
              <div className="credential-info mb-6">
                <h3 className="credential-service text-lg font-semibold capitalize mb-2">{cred.service_name}</h3>
                <p className="credential-key text-gray-400 font-mono text-sm">{maskApiKey(cred.api_key)}</p>
              </div>
              
              <div className="credential-actions flex items-center justify-between pt-4 border-t border-white/10">
                <button 
                  onClick={() => handleToggleActive(cred.id, cred.is_active)}
                  className={`toggle w-12 h-6 rounded-full relative transition-colors ${cred.is_active ? 'bg-green-500 active' : 'bg-gray-600'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${cred.is_active ? 'translate-x-7 left-1' : 'translate-x-1 left-0'}`} />
                </button>
                
                <div className="flex gap-2">
                  <button onClick={() => handleOpenModal(cred)} className="btn-icon p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDelete(cred.id)} className="btn-icon p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-white/10 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="modal-content glass-card bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="modal-header flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{editingId ? 'Editar Integração' : 'Nova Integração'}</h2>
              <button onClick={handleCloseModal} className="btn-icon text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label block text-sm font-medium text-gray-300 mb-1">Serviço</label>
                  <select 
                    className="form-select w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
                    value={formData.service_name}
                    onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                    disabled={!!editingId}
                  >
                    <option value="apollo">Apollo</option>
                    <option value="reoon">Reoon</option>
                    <option value="resend">Resend</option>
                    <option value="instantly">Instantly</option>
                    <option value="smartlead">Smartlead</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label block text-sm font-medium text-gray-300 mb-1">Chave de API</label>
                  <div className="relative">
                    <input 
                      type={showApiKey ? 'text' : 'password'}
                      className="form-input w-full bg-white/5 border border-white/10 rounded-lg pl-4 pr-10 py-2 text-white outline-none focus:border-blue-500"
                      value={formData.api_key}
                      onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="btn btn-secondary px-4 py-2 rounded-lg hover:bg-white/5 transition-colors border border-white/10"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn btn-primary px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 text-white"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
