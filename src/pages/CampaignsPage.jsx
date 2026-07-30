import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Play, Pause, Trash2, X, Megaphone } from 'lucide-react';

export default function CampaignsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignLimit, setNewCampaignLimit] = useState(40);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [user]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, leads(count)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!newCampaignName.trim() || !user) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          name: newCampaignName.trim(),
          daily_send_limit: newCampaignLimit,
          user_id: user.id,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;
      
      setShowModal(false);
      navigate(`/campaigns/${data.id}`);
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      alert('Erro ao criar campanha');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      await fetchCampaigns();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao atualizar status da campanha');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta campanha? Isso apagará todos os dados associados a ela.')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchCampaigns();
    } catch (error) {
      console.error('Erro ao excluir campanha:', error);
      alert('Erro ao excluir campanha');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in p-6 max-w-7xl mx-auto">
      <div className="page-header flex justify-between items-center mb-8">
        <div>
          <h1 className="page-title text-3xl font-bold">Campanhas</h1>
          <p className="page-subtitle text-gray-400 mt-1">Gerencie suas campanhas de prospecção</p>
        </div>
        <button 
          className="btn btn-primary flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <Plus size={20} />
          Nova Campanha
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white/5 rounded-lg border border-white/10 text-center">
          <Megaphone size={48} className="text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">Nenhuma campanha criada</h3>
          <p className="text-gray-400">Crie sua primeira campanha para começar</p>
        </div>
      ) : (
        <div className="campaigns-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="glass-card p-6 rounded-xl border border-white/10 bg-white/5 flex flex-col h-full">
              <div className="campaign-card-header flex justify-between items-start mb-4">
                <h3 className="campaign-card-name font-semibold text-lg text-white truncate pr-4" title={campaign.name}>
                  {campaign.name}
                </h3>
                <span className={`badge badge-${campaign.status} px-2 py-1 rounded text-xs font-medium uppercase tracking-wider`}>
                  {campaign.status}
                </span>
              </div>
              
              <div className="campaign-card-stats grid grid-cols-2 gap-4 mb-6 flex-grow">
                <div className="stat-item bg-black/20 p-3 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Leads</p>
                  <p className="font-semibold text-white">
                    {campaign.leads?.[0]?.count || 0}
                  </p>
                </div>
                <div className="stat-item bg-black/20 p-3 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Limite diário</p>
                  <p className="font-semibold text-white">{campaign.daily_send_limit}</p>
                </div>
                <div className="stat-item bg-black/20 p-3 rounded-lg col-span-2">
                  <p className="text-xs text-gray-400 mb-1">Criada em</p>
                  <p className="font-semibold text-white">
                    {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="campaign-card-actions flex items-center justify-between mt-auto pt-4 border-t border-white/10">
                <div className="flex gap-2">
                  <Link 
                    to={`/campaigns/${campaign.id}`}
                    className="btn btn-secondary btn-sm flex items-center gap-1"
                  >
                    <Pencil size={16} />
                    Editar
                  </Link>
                  <button 
                    onClick={() => handleToggleStatus(campaign.id, campaign.status)}
                    className="btn btn-sm flex items-center gap-1 bg-white/10 hover:bg-white/20 transition-colors rounded px-3 py-1.5"
                  >
                    {campaign.status === 'active' ? (
                      <><Pause size={16} /> Pausar</>
                    ) : (
                      <><Play size={16} /> Ativar</>
                    )}
                  </button>
                </div>
                <button 
                  onClick={() => handleDelete(campaign.id)}
                  className="btn btn-danger btn-sm text-red-400 hover:text-red-300 p-2 rounded hover:bg-red-400/10 transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="modal-content bg-[#1a1b26] p-6 rounded-xl border border-white/10 w-full max-w-md shadow-2xl">
            <div className="modal-header flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Nova Campanha</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateCampaign}>
              <div className="form-group mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Nome da Campanha</label>
                <input 
                  type="text"
                  required
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="form-input w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white focus:border-primary focus:outline-none transition-colors"
                  placeholder="Ex: Prospecção Q3"
                />
              </div>
              <div className="form-group mb-8">
                <label className="block text-sm font-medium text-gray-300 mb-2">Limite Diário de Envio</label>
                <input 
                  type="number"
                  required
                  min="1"
                  value={newCampaignLimit}
                  onChange={(e) => setNewCampaignLimit(Number(e.target.value))}
                  className="form-input w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white focus:border-primary focus:outline-none transition-colors"
                />
              </div>
              
              <div className="modal-footer flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="btn btn-primary px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-white disabled:opacity-50"
                >
                  {creating ? 'Criando...' : 'Criar Campanha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
