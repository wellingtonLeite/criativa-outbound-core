import React, { useState } from 'react';
import { Search, Building, User, Filter, MapPin, Briefcase, Hash } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ProspectorPage() {
  const [activeTab, setActiveTab] = useState('people'); // 'people' or 'companies'
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  
  const [searchParams, setSearchParams] = useState({
    q_keywords: '',
    person_titles: '',
    person_locations: '',
    organization_num_employees_ranges: ''
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      // Convert comma separated strings to arrays for Apollo
      const payload = {};
      if (searchParams.q_keywords) payload.q_keywords = searchParams.q_keywords;
      if (searchParams.person_titles) payload.person_titles = searchParams.person_titles.split(',').map(s => s.trim());
      if (searchParams.person_locations) payload.person_locations = searchParams.person_locations.split(',').map(s => s.trim());
      
      const endpoint = activeTab === 'people' ? 'search_people' : 'search_companies';

      const response = await fetch('/.netlify/functions/apollo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: endpoint,
          payload
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar no Apollo');
      }

      setResults(activeTab === 'people' ? (data.people || []) : (data.organizations || []));
    } catch (error) {
      console.error('Busca falhou:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in p-6 max-w-7xl mx-auto">
      <div className="page-header mb-8">
        <h1 className="page-title text-3xl font-bold flex items-center gap-3">
          <Search className="text-blue-500" />
          Prospecção Avançada (Apollo)
        </h1>
        <p className="page-subtitle text-gray-400 mt-1">Busque leads e empresas em tempo real</p>
      </div>

      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => { setActiveTab('people'); setResults([]); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${activeTab === 'people' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
        >
          <User size={18} />
          Pessoas
        </button>
        <button 
          onClick={() => { setActiveTab('companies'); setResults([]); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${activeTab === 'companies' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
        >
          <Building size={18} />
          Empresas
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filtros */}
        <div className="lg:col-span-1 glass-card bg-white/5 border border-white/10 rounded-xl p-6 h-fit">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Filter size={18} /> Filtros de Busca
          </h2>
          
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                <Hash size={14} /> Palavras-chave
              </label>
              <input 
                type="text" 
                value={searchParams.q_keywords}
                onChange={e => setSearchParams({...searchParams, q_keywords: e.target.value})}
                placeholder="Ex: SaaS, Marketing"
                className="form-input w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white"
              />
            </div>

            {activeTab === 'people' && (
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                  <Briefcase size={14} /> Cargos (Separados por vírgula)
                </label>
                <input 
                  type="text" 
                  value={searchParams.person_titles}
                  onChange={e => setSearchParams({...searchParams, person_titles: e.target.value})}
                  placeholder="Ex: CEO, Founder, Diretor"
                  className="form-input w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white"
                />
              </div>
            )}

            <div className="form-group">
              <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                <MapPin size={14} /> Localização
              </label>
              <input 
                type="text" 
                value={searchParams.person_locations}
                onChange={e => setSearchParams({...searchParams, person_locations: e.target.value})}
                placeholder="Ex: Brazil, São Paulo"
                className="form-input w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg text-white font-medium transition-colors mt-6 disabled:opacity-50"
            >
              {loading ? (
                <div className="spinner w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <><Search size={18} /> Buscar no Apollo</>
              )}
            </button>
          </form>
        </div>

        {/* Resultados */}
        <div className="lg:col-span-3">
          <div className="glass-card bg-white/5 border border-white/10 rounded-xl p-6 min-h-[500px]">
            <h2 className="text-lg font-semibold text-white mb-6">Resultados da Busca</h2>
            
            {results.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Search size={48} className="mb-4 opacity-20" />
                <p>Nenhum resultado encontrado. Ajuste seus filtros e faça uma busca.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-sm text-gray-400">
                      <th className="pb-3 font-medium">Nome</th>
                      <th className="pb-3 font-medium">Empresa</th>
                      <th className="pb-3 font-medium">Localização</th>
                      <th className="pb-3 font-medium text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {results.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 text-white flex items-center gap-3">
                          {item.photo_url && <img src={item.photo_url} alt="" className="w-8 h-8 rounded-full" />}
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.title && <p className="text-xs text-gray-400">{item.title}</p>}
                          </div>
                        </td>
                        <td className="py-4 text-gray-300">
                          {activeTab === 'people' ? item.organization?.name : item.name}
                        </td>
                        <td className="py-4 text-gray-400 text-sm">
                          {item.city ? `${item.city}, ${item.country || ''}` : '—'}
                        </td>
                        <td className="py-4 text-right">
                          <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                            Salvar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
