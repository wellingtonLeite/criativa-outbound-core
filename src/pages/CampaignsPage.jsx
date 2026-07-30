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
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta campanha?')) return;
    try {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;
      await fetchCampaigns();
    } catch (error) {
      console.error('Erro ao excluir campanha:', error);
    }
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
      <div className="page-header">
        <div>
          <h1 className="page-title">Campanhas</h1>
          <p className="page-subtitle">Gerencie suas campanhas de prospecção e envio</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Nova Campanha
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="empty-state glass-card">
          <Megaphone size={48} className="empty-state-icon" />
          <h3>Nenhuma campanha criada</h3>
          <p>Crie sua primeira campanha para começar a prospectar</p>
        </div>
      ) : (
        <div className="campaigns-grid">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '24px' }}>
              <div className="campaign-card-header">
                <h3 className="campaign-card-name" title={campaign.name} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
                  {campaign.name}
                </h3>
                <span className={`badge badge-${campaign.status}`}>
                  {campaign.status}
                </span>
              </div>
              
              <div className="campaign-card-stats">
                <div className="campaign-card-stat">
                  <span className="campaign-card-stat-label">Leads</span>
                  <span className="campaign-card-stat-value">{campaign.leads?.[0]?.count || 0}</span>
                </div>
                <div className="campaign-card-stat">
                  <span className="campaign-card-stat-label">Limite/Dia</span>
                  <span className="campaign-card-stat-value">{campaign.daily_send_limit}</span>
                </div>
                <div className="campaign-card-stat" style={{ gridColumn: 'span 2' }}>
                  <span className="campaign-card-stat-label">Criada em</span>
                  <span className="campaign-card-stat-value">
                    {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="campaign-card-actions" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link to={`/campaigns/${campaign.id}`} className="btn btn-sm btn-secondary">
                    <Pencil size={14} /> Editar
                  </Link>
                  <button 
                    onClick={() => handleToggleStatus(campaign.id, campaign.status)}
                    className="btn btn-sm btn-secondary"
                  >
                    {campaign.status === 'active' ? <><Pause size={14} /> Pausar</> : <><Play size={14} /> Ativar</>}
                  </button>
                </div>
                <button 
                  onClick={() => handleDelete(campaign.id)}
                  className="btn-icon"
                  style={{ color: '#f43f5e', border: 'none' }}
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Nova Campanha</h2>
              <button onClick={() => setShowModal(false)} className="btn-icon" style={{ border: 'none', background: 'transparent' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateCampaign}>
              <div className="form-group">
                <label className="form-label">Nome da Campanha</label>
                <input 
                  type="text"
                  required
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="form-input"
                  placeholder="Ex: Prospecção Q3"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '32px' }}>
                <label className="form-label">Limite Diário de Envio</label>
                <input 
                  type="number"
                  required
                  min="1"
                  value={newCampaignLimit}
                  onChange={(e) => setNewCampaignLimit(Number(e.target.value))}
                  className="form-input"
                />
              </div>
              
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={creating} className="btn btn-primary">
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
