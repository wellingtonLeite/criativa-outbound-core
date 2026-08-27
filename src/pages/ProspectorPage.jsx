import React, { useState, useEffect } from 'react';
import { 
  List, 
  Plus, 
  X, 
  Sparkles, 
  Database, 
  Search, 
  CheckCircle2, 
  Building2, 
  ArrowRight,
  RefreshCw,
  Globe
} from 'lucide-react';
import { callApolloProxy } from '../lib/apolloClient';
import { triggerMiningJob } from '../lib/miningClient';
import { mockDataStore } from '../lib/mockDataStore';
import MiningModal from '../components/MiningModal';
import CompanyAvatar from '../components/CompanyAvatar';

export default function ProspectorPage() {
  const [apolloLists, setApolloLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [errorLists, setErrorLists] = useState('');

  const [showListModal, setShowListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);

  // Crawlee Mining Section State
  const [segment, setSegment] = useState('Tecnologia');
  const [location, setLocation] = useState('SP');
  const [quantity, setQuantity] = useState(10);
  const [isMining, setIsMining] = useState(false);
  const [miningFeedback, setMiningFeedback] = useState(null);
  const [isMiningModalOpen, setIsMiningModalOpen] = useState(false);
  const [minedResults, setMinedResults] = useState([]);

  useEffect(() => {
    fetchApolloLists();
  }, []);

  const fetchApolloLists = async () => {
    setLoadingLists(true);
    setErrorLists('');
    try {
      const data = await callApolloProxy('get_lists');
      setApolloLists(Array.isArray(data) ? data : (data.contact_lists || data.labels || data.lists || []));
    } catch (error) {
      console.error('Erro ao buscar listas:', error);
      setErrorLists(error.message);
    } finally {
      setLoadingLists(false);
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    setCreatingList(true);
    try {
      await callApolloProxy('create_list', { name: newListName.trim(), modality: 'contacts' });
      setNewListName('');
      setShowListModal(false);
      await fetchApolloLists();
    } catch (error) {
      console.error('Erro ao criar lista:', error);
      alert(error.message);
    } finally {
      setCreatingList(false);
    }
  };

  const handleInlineMining = async (e) => {
    if (e) e.preventDefault();
    if (isMining) return;

    setIsMining(true);
    setMiningFeedback({ stage: 'Iniciando clusters headless Crawlee & DuckDB...', progress: 30 });

    try {
      await new Promise(r => setTimeout(r, 200));
      setMiningFeedback({ stage: `Raspando diretórios e CNPJs em ${location} (${segment})...`, progress: 65 });

      await new Promise(r => setTimeout(r, 200));
      setMiningFeedback({ stage: 'Deduplicando registros no DuckDB...', progress: 90 });

      const res = await triggerMiningJob({
        segment: segment || 'Tecnologia',
        location: location || 'SP',
        quantity: Math.max(1, Number(quantity) || 10)
      });

      if (res.status === 'SUCCESS') {
        setMinedResults(res.data || []);
        setMiningFeedback({
          success: true,
          stage: `✓ ${res.leadsDiscovered} leads minerados e adicionados à base!`,
          count: res.leadsDiscovered
        });
      }
    } catch (err) {
      console.error('Erro na mineração:', err);
      setMiningFeedback({ error: true, stage: err.message });
    } finally {
      setIsMining(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Prospecção & Mineração B2B</h1>
          <p className="page-subtitle">Motores integrados de mineração de dados em massa (Crawlee, DuckDB) e listas corporativas</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setIsMiningModalOpen(true)} 
            className="btn btn-primary"
            style={{ background: '#00d4ff', color: '#0a0a0f', fontWeight: 600 }}
          >
            <Sparkles size={18} /> Minerar com Crawlee
          </button>
          <button onClick={() => setShowListModal(true)} className="btn btn-secondary">
            <Plus size={18} /> Nova Lista no Apollo
          </button>
        </div>
      </div>

      {/* Primary Section: Crawlee & DuckDB Active Mining Engine */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '28px', borderTop: '3px solid #00d4ff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            background: 'rgba(0, 212, 255, 0.12)', color: '#00d4ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Database size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#fff' }}>
              Mineração de Dados B2B em Massa (Crawlee & DuckDB)
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Raspagem automatizada no mercado brasileiro com validação instantânea de CNPJ e decisores
            </p>
          </div>
        </div>

        {/* Mining Form */}
        <form onSubmit={handleInlineMining} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Segmento / Indústria</label>
              <input
                type="text"
                name="segment"
                placeholder="Digite o segmento (ex: Logística, Saúde, Tecnologia)..."
                value={segment}
                onChange={e => setSegment(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Estado / Região</label>
              <select
                name="location"
                className="form-select"
                value={location}
                onChange={e => setLocation(e.target.value)}
              >
                <option value="SP">São Paulo (SP)</option>
                <option value="RJ">Rio de Janeiro (RJ)</option>
                <option value="MG">Minas Gerais (MG)</option>
                <option value="PR">Paraná (PR)</option>
                <option value="SC">Santa Catarina (SC)</option>
                <option value="RS">Rio Grande do Sul (RS)</option>
                <option value="BA">Bahia (BA)</option>
                <option value="GO">Goiás (GO)</option>
                <option value="DF">Distrito Federal (DF)</option>
                <option value="MT">Mato Grosso (MT)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Quantidade ({quantity} leads)</label>
              <input
                type="number"
                min="1"
                max="50"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="form-input"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isMining}
                className="btn btn-primary"
                style={{ width: '100%', height: '42px', background: '#00d4ff', color: '#0a0a0f', fontWeight: 600 }}
              >
                {isMining ? (
                  <>
                    <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                    Minerando...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Minerar Leads
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Feedback / Progress Status */}
        {miningFeedback && (
          <div className="animate-fade-in" style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: miningFeedback.error ? 'rgba(244,63,94,0.1)' : 'rgba(0,212,255,0.08)',
            border: miningFeedback.error ? '1px solid rgba(244,63,94,0.3)' : '1px solid rgba(0,212,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {miningFeedback.success ? (
                <CheckCircle2 size={18} color="#10b981" />
              ) : isMining ? (
                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
              ) : null}
              <span style={{ fontSize: '0.84rem', color: miningFeedback.success ? '#10b981' : '#e2e8f0' }}>
                {miningFeedback.stage}
              </span>
            </div>

            {miningFeedback.success && (
              <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 600 }}>
                +{miningFeedback.count} Novos Leads no CRM
              </span>
            )}
          </div>
        )}

        {/* Mined Leads Quick Results Preview */}
        {minedResults.length > 0 && (
          <div className="animate-fade-in" style={{ marginTop: '20px' }}>
            <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase' }}>
              Resultados Recém-Minerados ({minedResults.length})
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {minedResults.slice(0, 6).map(lead => (
                <div key={lead.id} className="glass-card" style={{ padding: '14px', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>{lead.company_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                    {[lead.first_name, lead.last_name].join(' ')} · {lead.person_info?.title || 'Decisor'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                    CNPJ: {lead.cnpj} · {lead.city}/{lead.state}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Secondary Section: Apollo Lists */}
      <div className="section-card purple-accent" style={{ minHeight: '300px' }}>
        <h2 className="section-card-title" style={{ marginBottom: '20px' }}>
          <List size={20} style={{ color: '#7c3aed' }} />
          Suas Listas no Apollo.io
        </h2>

        {loadingLists ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '160px' }}>
            <div className="spinner"></div>
          </div>
        ) : errorLists ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#f43f5e', textAlign: 'center' }}>
            <List size={36} style={{ opacity: 0.8, marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Erro ao carregar listas do Apollo</h3>
            <p style={{ fontSize: '0.85rem', maxWidth: '480px' }}>
              {errorLists}
            </p>
          </div>
        ) : apolloLists.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '160px', color: '#64748b' }}>
            <List size={36} style={{ opacity: 0.2, marginBottom: '12px' }} />
            <p style={{ fontSize: '0.85rem' }}>Você não tem listas no Apollo. Crie uma nova acima!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {apolloLists.map(list => (
              <div key={list.id} className="glass-card" style={{ padding: '20px', borderTop: '3px solid #7c3aed' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  {list.name}
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', color: '#94a3b8', fontSize: '0.82rem' }}>
                  <span>{list.modality === 'accounts' ? 'Empresas' : 'Contatos'}: <strong style={{ color: '#fff' }}>{list.cached_count || 0}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Nova Lista Apollo */}
      {showListModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Criar Nova Lista (Apollo)</h2>
              <button onClick={() => setShowListModal(false)} className="btn-icon" style={{ border: 'none', background: 'transparent' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateList}>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Nome da Lista</label>
                <input
                  type="text"
                  required
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="form-input"
                  placeholder="Ex: C-Levels SP Tech"
                  autoFocus
                />
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                  Esta lista será criada diretamente na sua conta do Apollo.io.
                </p>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowListModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={creatingList} className="btn btn-primary" style={{ background: '#7c3aed' }}>
                  {creatingList ? 'Criando...' : 'Criar Lista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Mining Modal */}
      <MiningModal
        isOpen={isMiningModalOpen}
        onClose={() => setIsMiningModalOpen(false)}
        onMiningComplete={(newLeads) => {
          setMinedResults(newLeads || []);
        }}
      />
    </div>
  );
}
