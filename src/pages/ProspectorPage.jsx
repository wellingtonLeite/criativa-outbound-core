import React, { useState, useEffect } from 'react';
import { List, Plus, X } from 'lucide-react';
import { callApolloProxy } from '../lib/apolloClient';

export default function ProspectorPage() {
  const [apolloLists, setApolloLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [errorLists, setErrorLists] = useState('');

  const [showListModal, setShowListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);

  useEffect(() => {
    fetchApolloLists();
  }, []);

  const fetchApolloLists = async () => {
    setLoadingLists(true);
    setErrorLists('');
    try {
      const data = await callApolloProxy('get_lists');
      // GET /v1/labels devolve o array diretamente na raiz (sem wrapper "labels"/"contact_lists")
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

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Prospecção</h1>
          <p className="page-subtitle">Gerencie suas listas do Apollo.io — a busca e importação de contatos ficam dentro de cada campanha</p>
        </div>
        <button onClick={() => setShowListModal(true)} className="btn btn-primary">
          <Plus size={18} /> Nova Lista no Apollo
        </button>
      </div>

      {/* Listas */}
      <div className="section-card purple-accent" style={{ minHeight: '400px' }}>
        <h2 className="section-card-title" style={{ marginBottom: '20px' }}>
          <List size={20} style={{ color: '#7c3aed' }} />
          Suas Listas no Apollo
        </h2>

        {loadingLists ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <div className="spinner"></div>
          </div>
        ) : errorLists ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '250px', color: '#f43f5e', textAlign: 'center' }}>
            <List size={40} style={{ opacity: 0.8, marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Erro ao carregar listas do Apollo</h3>
            <p style={{ fontSize: '0.9rem', maxWidth: '500px' }}>
              O Apollo bloqueou o acesso: <strong>{errorLists}</strong>
            </p>
            <p style={{ fontSize: '0.85rem', maxWidth: '500px', marginTop: '12px', color: '#94a3b8' }}>
              Nota: Para acessar e criar listas de contato, a API Key configurada na página de "Integrações"
              precisa ser uma <strong>Master API Key</strong> do Apollo.io. Verifique suas permissões no Apollo.
            </p>
          </div>
        ) : apolloLists.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#64748b' }}>
            <List size={40} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p style={{ fontSize: '0.9rem' }}>Você não tem listas no Apollo. Crie uma nova acima!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {apolloLists.map(list => (
              <div key={list.id} className="glass-card" style={{ padding: '24px', borderTop: '3px solid #7c3aed' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>
                  {list.name}
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', color: '#94a3b8', fontSize: '0.85rem' }}>
                  <span>{list.modality === 'accounts' ? 'Empresas' : 'Contatos'}: <strong style={{ color: '#fff' }}>{list.cached_count || 0}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Nova Lista */}
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
    </div>
  );
}
