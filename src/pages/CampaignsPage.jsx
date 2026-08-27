import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockDataStore } from '../lib/mockDataStore';
import { Plus, Pencil, Play, Pause, Trash2, X, Megaphone, Send, Globe, MessageSquare } from 'lucide-react';

const STATUS_LABELS = {
  draft: 'Rascunho',
  active: 'Ativa',
  paused: 'Pausada',
  completed: 'Concluída',
};

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newChannel, setNewChannel] = useState('email');
  const [newDailyLimit, setNewDailyLimit] = useState(100);
  const [newScrapingLimit, setNewScrapingLimit] = useState(150);
  const [creating, setCreating] = useState(false);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await mockDataStore.getMockCampaigns();
      setCampaigns(data || []);
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
    const unsubscribe = mockDataStore.subscribe(() => {
      setCampaigns(mockDataStore.getCampaignsSync());
    });
    return () => unsubscribe();
  }, []);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;
    setCreating(true);
    try {
      const created = await mockDataStore.createCampaign({
        name: newCampaignName.trim(),
        channel: newChannel,
        daily_send_limit: Number(newDailyLimit),
        daily_scraping_limit: Number(newScrapingLimit),
        status: 'draft'
      });

      setShowModal(false);
      setNewCampaignName('');
      navigate(`/campaigns/${created.id}`);
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
      await mockDataStore.updateCampaignStatus(id, newStatus);
      const updated = mockDataStore.getCampaignsSync();
      setCampaigns(updated);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta campanha?')) return;
    try {
      await mockDataStore.deleteCampaign(id);
      const updated = mockDataStore.getCampaignsSync();
      setCampaigns(updated);
    } catch (error) {
      console.error('Erro ao excluir campanha:', error);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Campanhas de Prospecção</h1>
          <p className="page-subtitle">Gerencie suas sequências automatizadas de Email e WhatsApp ({campaigns.length} ativas/cadastradas)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Nova Campanha
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="empty-state glass-card" style={{ padding: '56px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(0, 212, 255, 0.1)', color: '#00d4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Megaphone size={28} />
          </div>
          <div>
            <h3 style={{ color: '#e2e8f0', fontSize: '1.15rem', fontWeight: 600, marginBottom: '6px' }}>
              Nenhuma campanha criada ainda
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0, maxWidth: '460px', lineHeight: 1.5 }}>
              Crie sua primeira campanha para orquestrar disparos automatizados e fluxos de prospecção via Email e WhatsApp.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
            style={{ background: '#00d4ff', color: '#0a0a0f', fontWeight: 600, padding: '10px 22px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            <span>+ Criar Primeira Campanha</span>
          </button>
        </div>
      ) : (
        <div className="campaigns-grid">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '24px' }}>
              <div className="campaign-card-header">
                <div style={{ maxWidth: '70%' }}>
                  <h3 className="campaign-card-name" title={campaign.name} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {campaign.name}
                  </h3>
                  {campaign.description && (
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {campaign.description}
                    </p>
                  )}
                </div>
                <span className={`badge badge-${campaign.status}`}>
                  {STATUS_LABELS[campaign.status] || campaign.status}
                </span>
              </div>
              
              <div className="campaign-card-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', display: 'grid' }}>
                <div className="campaign-card-stat">
                  <span className="campaign-card-stat-label">Leads</span>
                  <span className="campaign-card-stat-value" style={{ color: '#00d4ff' }}>{campaign.leads?.[0]?.count || 0}</span>
                </div>
                <div className="campaign-card-stat">
                  <span className="campaign-card-stat-label">Limite/Dia</span>
                  <span className="campaign-card-stat-value">{campaign.daily_send_limit || 100}</span>
                </div>
                <div className="campaign-card-stat">
                  <span className="campaign-card-stat-label">Scrape/Dia</span>
                  <span className="campaign-card-stat-value">{campaign.daily_scraping_limit || 150}</span>
                </div>
                <div className="campaign-card-stat" style={{ gridColumn: 'span 3', marginTop: '8px' }}>
                  <span className="campaign-card-stat-label">Canal & Criada em</span>
                  <span className="campaign-card-stat-value" style={{ fontSize: '0.82rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {campaign.channel === 'whatsapp' ? <MessageSquare size={13} color="#10b981" /> : <Send size={13} color="#00d4ff" />}
                    <span style={{ textTransform: 'capitalize' }}>{campaign.channel || 'Email'}</span> · {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="campaign-card-actions" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', justifyContent: 'space-between', marginTop: 'auto' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link to={`/campaigns/${campaign.id}`} className="btn btn-sm btn-secondary">
                    <Pencil size={14} /> Configurar Sequência
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
                  title="Excluir Campanha"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar Campanha */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nova Campanha B2B</h2>
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
                  placeholder="Ex: Prospecção Indústrias Q3 - Região Sul"
                />
              </div>

              <div className="form-grid" style={{ marginBottom: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Canal de Disparo</label>
                  <select 
                    className="form-select"
                    value={newChannel}
                    onChange={e => setNewChannel(e.target.value)}
                  >
                    <option value="email">Email Outbound</option>
                    <option value="whatsapp">Evolution API WhatsApp</option>
                    <option value="omnichannel">Omnichannel (Email + WhatsApp)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Limite de Disparos/Dia</label>
                  <input
                    type="number"
                    value={newDailyLimit}
                    onChange={e => setNewDailyLimit(e.target.value)}
                    className="form-input"
                    min="10"
                    max="1000"
                  />
                </div>
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
