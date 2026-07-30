import React, { useState, useEffect } from 'react';
import { Search, Building, User, MapPin, Briefcase, Hash, Filter, List, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ProspectorPage() {
  const [activeTab, setActiveTab] = useState('people');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  
  // Apollo Lists State
  const [apolloLists, setApolloLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);
  
  // Modal Nova Lista
  const [showListModal, setShowListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  
  const [searchParams, setSearchParams] = useState({
    q_keywords: '',
    person_titles: '',
    person_locations: '',
  });

  const [errorLists, setErrorLists] = useState('');

  // Carrega as listas sempre que a aba mudar para 'lists'
  useEffect(() => {
    if (activeTab === 'lists') {
      fetchApolloLists();
    }
  }, [activeTab]);

  const callApolloProxy = async (action, payload = {}, method = 'POST') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Não autenticado');

    const response = await fetch('/.netlify/functions/apollo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ action, payload })
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || `Erro do Apollo: ${response.status}`);
    }
    return data;
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {};
      if (searchParams.q_keywords) payload.q_keywords = searchParams.q_keywords;
      if (searchParams.person_titles) payload.person_titles = searchParams.person_titles.split(',').map(s => s.trim());
      if (searchParams.person_locations) payload.person_locations = searchParams.person_locations.split(',').map(s => s.trim());
      
      const endpoint = activeTab === 'people' ? 'search_people' : 'search_companies';
      const data = await callApolloProxy(endpoint, payload);
      setResults(activeTab === 'people' ? (data.people || []) : (data.organizations || []));
    } catch (error) {
      console.error('Busca falhou:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

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
          <p className="page-subtitle">Busque leads, empresas e gerencie suas listas do Apollo.io</p>
        </div>
        
        {activeTab === 'lists' && (
          <button onClick={() => setShowListModal(true)} className="btn btn-primary">
            <Plus size={18} /> Nova Lista no Apollo
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
        <button 
          onClick={() => { setActiveTab('people'); setResults([]); }}
          className={activeTab === 'people' ? 'btn btn-primary' : 'btn btn-secondary'}
          style={activeTab === 'people' ? { background: '#3b82f6' } : { border: 'none' }}
        >
          <User size={16} /> Pessoas
        </button>
        <button 
          onClick={() => { setActiveTab('companies'); setResults([]); }}
          className={activeTab === 'companies' ? 'btn btn-primary' : 'btn btn-secondary'}
          style={activeTab === 'companies' ? { background: '#3b82f6' } : { border: 'none' }}
        >
          <Building size={16} /> Empresas
        </button>
        <button 
          onClick={() => { setActiveTab('lists'); setResults([]); }}
          className={activeTab === 'lists' ? 'btn btn-primary' : 'btn btn-secondary'}
          style={activeTab === 'lists' ? { background: '#7c3aed' } : { border: 'none' }}
        >
          <List size={16} /> Minhas Listas (Apollo)
        </button>
      </div>

      {/* Content Grid (Busca) */}
      {activeTab !== 'lists' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
          {/* Filters Sidebar */}
          <div className="section-card" style={{ height: 'fit-content' }}>
            <h2 className="section-card-title" style={{ marginBottom: '20px' }}>
              <Filter size={18} /> Filtros de Busca
            </h2>
            
            <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  <Hash size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Palavras-chave
                </label>
                <input 
                  type="text" 
                  value={searchParams.q_keywords}
                  onChange={e => setSearchParams({...searchParams, q_keywords: e.target.value})}
                  placeholder="Ex: SaaS, Marketing"
                  className="form-input"
                />
              </div>

              {activeTab === 'people' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    <Briefcase size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    Cargos
                  </label>
                  <input 
                    type="text" 
                    value={searchParams.person_titles}
                    onChange={e => setSearchParams({...searchParams, person_titles: e.target.value})}
                    placeholder="Ex: CEO, Founder, Diretor"
                    className="form-input"
                  />
                  <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>Separe por vírgula</p>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Localização
                </label>
                <input 
                  type="text" 
                  value={searchParams.person_locations}
                  onChange={e => setSearchParams({...searchParams, person_locations: e.target.value})}
                  placeholder="Ex: Brazil, São Paulo"
                  className="form-input"
                />
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', background: '#3b82f6', marginTop: '8px' }}>
                {loading ? (
                  <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                ) : (
                  <><Search size={16} /> Buscar no Apollo</>
                )}
              </button>
            </form>
          </div>

          {/* Results Area */}
          <div className="section-card" style={{ minHeight: '400px' }}>
            <h2 className="section-card-title" style={{ marginBottom: '20px' }}>
              Resultados da Busca
              {results.length > 0 && <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#64748b', marginLeft: '8px' }}>({results.length} encontrados)</span>}
            </h2>
            
            {results.length === 0 && !loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#64748b' }}>
                <Search size={40} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <p style={{ fontSize: '0.9rem' }}>Use os filtros ao lado e clique em "Buscar no Apollo"</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Empresa</th>
                      <th>Localização</th>
                      <th style={{ textAlign: 'right' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td style={{ color: '#e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {item.photo_url && <img src={item.photo_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                            <div>
                              <div style={{ fontWeight: 500 }}>{item.name}</div>
                              {item.title && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.title}</div>}
                            </div>
                          </div>
                        </td>
                        <td>{activeTab === 'people' ? item.organization?.name : item.name}</td>
                        <td>{item.city ? `${item.city}, ${item.country || ''}` : '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-sm btn-secondary">Salvar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Content Area (Listas) */
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
      )}

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
