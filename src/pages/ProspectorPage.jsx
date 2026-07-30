import React, { useState } from 'react';
import { Search, Building, User, MapPin, Briefcase, Hash, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ProspectorPage() {
  const [activeTab, setActiveTab] = useState('people');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  
  const [searchParams, setSearchParams] = useState({
    q_keywords: '',
    person_titles: '',
    person_locations: '',
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const payload = {};
      if (searchParams.q_keywords) payload.q_keywords = searchParams.q_keywords;
      if (searchParams.person_titles) payload.person_titles = searchParams.person_titles.split(',').map(s => s.trim());
      if (searchParams.person_locations) payload.person_locations = searchParams.person_locations.split(',').map(s => s.trim());
      
      const endpoint = activeTab === 'people' ? 'search_people' : 'search_companies';

      const response = await fetch('/.netlify/functions/apollo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: endpoint, payload })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao buscar no Apollo');
      setResults(activeTab === 'people' ? (data.people || []) : (data.organizations || []));
    } catch (error) {
      console.error('Busca falhou:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Prospecção</h1>
          <p className="page-subtitle">Busque leads e empresas em tempo real via Apollo.io</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button 
          onClick={() => { setActiveTab('people'); setResults([]); }}
          className={activeTab === 'people' ? 'btn btn-primary' : 'btn btn-secondary'}
          style={activeTab === 'people' ? { background: '#3b82f6' } : {}}
        >
          <User size={16} /> Pessoas
        </button>
        <button 
          onClick={() => { setActiveTab('companies'); setResults([]); }}
          className={activeTab === 'companies' ? 'btn btn-primary' : 'btn btn-secondary'}
          style={activeTab === 'companies' ? { background: '#3b82f6' } : {}}
        >
          <Building size={16} /> Empresas
        </button>
      </div>

      {/* Content Grid */}
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
          )}
        </div>
      </div>
    </div>
  );
}
