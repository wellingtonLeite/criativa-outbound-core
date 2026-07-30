import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { callApolloProxy } from '../lib/apolloClient';
import LeadDetailModal from '../components/LeadDetailModal';
import { ArrowLeft, Plus, Trash2, Save, Play, Pause, X, Database, Mail, Users, Search, List, Download } from 'lucide-react';

/* ============================================================
   TagInput — Componente reutilizável para adicionar tags via Enter
   ============================================================ */
const TagInput = ({ label, placeholder, tags = [], onChange }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = inputValue.trim();
      if (val && !tags.includes(val)) {
        onChange([...tags, val]);
      }
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label">{label}</label>
      <div className="tag-input-container">
        {tags.map((tag, idx) => (
          <span key={idx} className="tag">
            {tag}
            <button type="button" onClick={() => removeTag(tag)}>
              <X size={14} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
        />
      </div>
    </div>
  );
};

/* ============================================================
   CampaignBuilderPage — Página principal do construtor
   ============================================================ */
export default function CampaignBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [campaign, setCampaign] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState('');
  const [dailyLimit, setDailyLimit] = useState(40);
  const [dailyScrapingLimit, setDailyScrapingLimit] = useState(25);
  const [searchParams, setSearchParams] = useState({
    job_titles: [], locations: [], company_sizes: [], keywords: []
  });

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingSequence, setIsSavingSequence] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Leads da campanha
  const [leadsSubTab, setLeadsSubTab] = useState('search'); // 'search' | 'import' | 'saved'
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  const [searchResults, setSearchResults] = useState([]);
  const [searchingLeads, setSearchingLeads] = useState(false);
  const [searchErrorMsg, setSearchErrorMsg] = useState('');
  const [addingLeadId, setAddingLeadId] = useState(null);

  const [apolloLists, setApolloLists] = useState([]);
  const [loadingApolloLists, setLoadingApolloLists] = useState(false);
  const [apolloListsError, setApolloListsError] = useState('');
  const [importingListId, setImportingListId] = useState(null);
  const [importMessage, setImportMessage] = useState('');

  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => { fetchData(); }, [id]);
  useEffect(() => { fetchLeads(); }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns').select('*').eq('id', id).single();
      if (campaignError) throw campaignError;
      if (!campaignData) { navigate('/campaigns'); return; }

      setCampaign(campaignData);
      setName(campaignData.name || '');
      setDailyLimit(campaignData.daily_send_limit || 40);
      setDailyScrapingLimit(campaignData.daily_scraping_limit || 25);
      
      const savedParams = campaignData.search_parameters || {};
      setSearchParams({
        job_titles: savedParams.job_titles || [],
        locations: savedParams.locations || [],
        company_sizes: savedParams.company_sizes || [],
        keywords: savedParams.keywords || []
      });

      const { data: templatesData, error: templatesError } = await supabase
        .from('email_templates').select('*').eq('campaign_id', id).order('step_number');
      if (templatesError) throw templatesError;
      
      setSteps((templatesData || []).map(t => ({ ...t, isNew: false, isDeleted: false })));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const { error } = await supabase.from('campaigns').update({ 
        name, daily_send_limit: dailyLimit, daily_scraping_limit: dailyScrapingLimit, search_parameters: searchParams
      }).eq('id', id);
      if (error) throw error;
      setCampaign(prev => ({ ...prev, name, daily_send_limit: dailyLimit, daily_scraping_limit: dailyScrapingLimit, search_parameters: searchParams }));
      showFeedback('✓ Configurações salvas!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!campaign) return;
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    try {
      const { error } = await supabase.from('campaigns').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setCampaign(prev => ({ ...prev, status: newStatus }));
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  const handleAddStep = () => {
    const activeSteps = steps.filter(s => !s.isDeleted);
    const nextStepNumber = activeSteps.length > 0 ? Math.max(...activeSteps.map(s => s.step_number)) + 1 : 1;
    setSteps([...steps, {
      tempId: Date.now().toString(), campaign_id: id, step_number: nextStepNumber,
      subject: '', body_html: '', wait_days: activeSteps.length === 0 ? 0 : 2,
      isNew: true, isDeleted: false
    }]);
  };

  const handleRemoveStep = (index) => {
    const newSteps = [...steps];
    newSteps[index].isDeleted = true;
    setSteps(newSteps);
  };

  const handleStepChange = (index, field, value) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
  };

  const handleSaveSequence = async () => {
    setIsSavingSequence(true);
    try {
      const promises = steps.map(async (step) => {
        if (step.isDeleted && !step.isNew) {
          return supabase.from('email_templates').delete().eq('id', step.id);
        } else if (!step.isDeleted && step.isNew) {
          return supabase.from('email_templates').insert({
            campaign_id: step.campaign_id, step_number: step.step_number,
            subject: step.subject, body_html: step.body_html, wait_days: step.wait_days
          });
        } else if (!step.isDeleted && !step.isNew) {
          return supabase.from('email_templates').update({
            subject: step.subject, body_html: step.body_html, wait_days: step.wait_days
          }).eq('id', step.id);
        }
      });
      await Promise.all(promises);
      await fetchData();
      showFeedback('✓ Sequência salva!');
    } catch (error) {
      console.error('Erro ao salvar sequência:', error);
      alert('Erro ao salvar sequência.');
    } finally {
      setIsSavingSequence(false);
    }
  };

  const showFeedback = (msg) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  /* ── Leads da Campanha ── */

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleSearchLeads = async () => {
    setSearchingLeads(true);
    setSearchErrorMsg('');
    try {
      const payload = {};
      if (searchParams.job_titles.length) payload.person_titles = searchParams.job_titles;
      if (searchParams.locations.length) payload.person_locations = searchParams.locations;
      if (searchParams.keywords.length) payload.q_keywords = searchParams.keywords.join(' ');
      payload.per_page = dailyScrapingLimit || 25;

      const data = await callApolloProxy('search_people', payload);
      setSearchResults(data.people || []);
    } catch (error) {
      console.error('Erro ao buscar no Apollo:', error);
      setSearchErrorMsg(error.message);
    } finally {
      setSearchingLeads(false);
    }
  };

  const handleAddLeadFromSearch = async (person) => {
    setAddingLeadId(person.id);
    try {
      // A busca de pessoas não retorna e-mail — é preciso enriquecer (consome créditos Apollo)
      const enriched = await callApolloProxy('enrich_person', { id: person.id });
      const email = enriched.person?.email;
      if (!email) {
        alert('Não foi possível obter um e-mail verificado para este contato.');
        return;
      }
      const { error } = await supabase.from('leads').upsert({
        campaign_id: id,
        email,
        first_name: enriched.person?.first_name || person.first_name,
        company_name: enriched.person?.organization?.name || person.organization?.name,
        revenue_estimated: enriched.person?.organization?.annual_revenue_printed || null,
      }, { onConflict: 'campaign_id,email', ignoreDuplicates: true });
      if (error) throw error;
      showFeedback('✓ Lead adicionado!');
      await fetchLeads();
    } catch (error) {
      console.error('Erro ao adicionar lead:', error);
      alert('Erro ao adicionar lead: ' + error.message);
    } finally {
      setAddingLeadId(null);
    }
  };

  const fetchApolloListsForImport = async () => {
    setLoadingApolloLists(true);
    setApolloListsError('');
    try {
      const data = await callApolloProxy('get_lists');
      setApolloLists(Array.isArray(data) ? data : (data.contact_lists || data.labels || data.lists || []));
    } catch (error) {
      console.error('Erro ao buscar listas do Apollo:', error);
      setApolloListsError(error.message);
    } finally {
      setLoadingApolloLists(false);
    }
  };

  const handleImportList = async (list) => {
    setImportingListId(list.id);
    setImportMessage('');
    try {
      const data = await callApolloProxy('get_list_contacts', { contact_label_ids: [list.id], per_page: 100 });
      const contacts = data.contacts || [];
      if (contacts.length === 0) {
        setImportMessage('Nenhum contato encontrado nesta lista.');
        return;
      }
      const rows = contacts
        .filter(c => !!c.email)
        .map(c => ({
          campaign_id: id,
          email: c.email,
          first_name: c.first_name || null,
          company_name: c.organization_name || null,
          revenue_estimated: null,
        }));
      const { error } = await supabase.from('leads').upsert(rows, { onConflict: 'campaign_id,email', ignoreDuplicates: true });
      if (error) throw error;
      setImportMessage(`✓ ${rows.length} contatos importados de "${list.name}"!`);
      await fetchLeads();
    } catch (error) {
      console.error('Erro ao importar lista:', error);
      setImportMessage('Erro ao importar: ' + error.message);
    } finally {
      setImportingListId(null);
    }
  };

  useEffect(() => {
    if (leadsSubTab === 'import' && apolloLists.length === 0 && !loadingApolloLists) {
      fetchApolloListsForImport();
    }
  }, [leadsSubTab]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const activeSteps = steps.filter(s => !s.isDeleted);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '80px' }}>
      
      {/* ── Header ── */}
      <div style={{ marginBottom: '32px' }}>
        <Link to="/campaigns" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.875rem', marginBottom: '12px' }}>
          <ArrowLeft size={16} /> Voltar para Campanhas
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {campaign?.name}
            <span className={`badge badge-${campaign?.status}`}>{campaign?.status?.toUpperCase()}</span>
          </h1>
          {saveMessage && <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 500 }}>{saveMessage}</span>}
        </div>
      </div>

      {/* ── Seção 1: Configurações Gerais ── */}
      <form onSubmit={handleSaveSettings}>
        <div className="section-card">
          <div className="section-card-header">
            <h2 className="section-card-title">Configurações Gerais</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={handleToggleStatus} className="btn btn-secondary">
                {campaign?.status === 'active' ? <><Pause size={16} /> Pausar</> : <><Play size={16} /> Ativar</>}
              </button>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nome da Campanha</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="form-input" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Limite Diário de Envio (E-mails)</label>
              <input type="number" required min="1" value={dailyLimit} onChange={e => setDailyLimit(Number(e.target.value))} className="form-input" />
            </div>
          </div>
        </div>

        {/* ── Seção 2: Parâmetros de Extração ── */}
        <div className="section-card blue-accent">
          <div className="section-card-header">
            <h2 className="section-card-title">
              <Database size={20} style={{ color: '#3b82f6' }} />
              Parâmetros de Extração (Data Source)
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Lido pelo motor n8n + Apollo</span>
          </div>

          <div className="form-grid">
            <TagInput 
              label="Cargos Alvo (Job Titles)" 
              placeholder="Ex: CEO, Founder (Enter para adicionar)"
              tags={searchParams.job_titles}
              onChange={(newTags) => setSearchParams(prev => ({ ...prev, job_titles: newTags }))}
            />
            <TagInput 
              label="Localizações (Locations)" 
              placeholder="Ex: Brazil, São Paulo (Enter)"
              tags={searchParams.locations}
              onChange={(newTags) => setSearchParams(prev => ({ ...prev, locations: newTags }))}
            />
            <TagInput 
              label="Tamanho da Empresa (Company Sizes)" 
              placeholder="Ex: 11-20, 50-100 (Enter)"
              tags={searchParams.company_sizes}
              onChange={(newTags) => setSearchParams(prev => ({ ...prev, company_sizes: newTags }))}
            />
            <TagInput 
              label="Palavras-chave (Keywords)" 
              placeholder="Ex: SaaS, Tecnologia (Enter)"
              tags={searchParams.keywords}
              onChange={(newTags) => setSearchParams(prev => ({ ...prev, keywords: newTags }))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px', marginTop: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0, width: '200px' }}>
              <label className="form-label">Limite Diário de Raspagem</label>
              <input type="number" required min="1" value={dailyScrapingLimit} onChange={e => setDailyScrapingLimit(Number(e.target.value))} className="form-input" />
              <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>Máximo de contatos extraídos por dia</p>
            </div>
            <button type="submit" disabled={isSavingSettings} className="btn btn-primary">
              <Save size={16} /> {isSavingSettings ? 'Salvando...' : 'Salvar Campanha'}
            </button>
          </div>
        </div>
      </form>

      {/* ── Seção 2.5: Leads da Campanha ── */}
      <div className="section-card" style={{ borderTop: '3px solid #10b981' }}>
        <div className="section-card-header">
          <h2 className="section-card-title">
            <Users size={20} style={{ color: '#10b981' }} />
            Leads da Campanha
            <span className="badge" style={{ marginLeft: '8px', background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>{leads.length}</span>
          </h2>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            onClick={() => setLeadsSubTab('search')}
            className={leadsSubTab === 'search' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={leadsSubTab === 'search' ? { background: '#3b82f6' } : { border: 'none' }}
          >
            <Search size={16} /> Buscar no Apollo
          </button>
          <button
            onClick={() => setLeadsSubTab('import')}
            className={leadsSubTab === 'import' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={leadsSubTab === 'import' ? { background: '#7c3aed' } : { border: 'none' }}
          >
            <List size={16} /> Importar Lista do Apollo
          </button>
          <button
            onClick={() => setLeadsSubTab('saved')}
            className={leadsSubTab === 'saved' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={leadsSubTab === 'saved' ? { background: '#10b981' } : { border: 'none' }}
          >
            <Users size={16} /> Leads Adicionados
          </button>
        </div>

        {/* Sub-tab: Buscar no Apollo */}
        {leadsSubTab === 'search' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Busca usando os Cargos, Localizações e Palavras-chave definidos acima em "Parâmetros de Extração".
              </p>
              <button onClick={handleSearchLeads} disabled={searchingLeads} className="btn btn-primary" style={{ background: '#3b82f6', whiteSpace: 'nowrap' }}>
                {searchingLeads ? 'Buscando...' : <><Search size={16} /> Buscar</>}
              </button>
            </div>

            {searchErrorMsg && (
              <p style={{ color: '#f43f5e', fontSize: '0.85rem', marginBottom: '12px' }}>{searchErrorMsg}</p>
            )}

            {searchResults.length > 0 && (
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
                    {searchResults.map((person) => (
                      <tr key={person.id}>
                        <td style={{ color: '#e2e8f0' }}>
                          <div style={{ fontWeight: 500 }}>
                            {person.name || [person.first_name, person.last_name_obfuscated].filter(Boolean).join(' ') || '—'}
                          </div>
                          {person.title && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{person.title}</div>}
                        </td>
                        <td>{person.organization?.name || '—'}</td>
                        <td>{person.city ? `${person.city}, ${person.country || ''}` : '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleAddLeadFromSearch(person)}
                            disabled={addingLeadId === person.id}
                            className="btn btn-sm btn-secondary"
                            title="Consome créditos Apollo para revelar o e-mail"
                          >
                            {addingLeadId === person.id ? 'Adicionando...' : 'Adicionar aos Leads'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {searchResults.length === 0 && !searchingLeads && !searchErrorMsg && (
              <p style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '24px 0' }}>
                Clique em "Buscar" para trazer contatos do Apollo com os filtros desta campanha.
              </p>
            )}
          </div>
        )}

        {/* Sub-tab: Importar Lista do Apollo */}
        {leadsSubTab === 'import' && (
          <div>
            {importMessage && <p style={{ fontSize: '0.85rem', color: '#10b981', marginBottom: '12px' }}>{importMessage}</p>}

            {loadingApolloLists ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}><div className="spinner"></div></div>
            ) : apolloListsError ? (
              <p style={{ color: '#f43f5e', fontSize: '0.85rem' }}>{apolloListsError}</p>
            ) : apolloLists.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '24px 0' }}>
                Você não tem listas no Apollo. Crie uma na aba Prospecção.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {apolloLists.map(list => (
                  <div key={list.id} className="glass-card" style={{ padding: '18px' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>{list.name}</h4>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>
                      {list.modality === 'accounts' ? 'Empresas' : 'Contatos'}: <strong style={{ color: '#fff' }}>{list.cached_count || 0}</strong>
                    </p>
                    <button
                      onClick={() => handleImportList(list)}
                      disabled={importingListId === list.id}
                      className="btn btn-sm btn-primary"
                      style={{ background: '#7c3aed', width: '100%' }}
                    >
                      {importingListId === list.id ? 'Importando...' : <><Download size={14} /> Importar para esta Campanha</>}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sub-tab: Leads Adicionados */}
        {leadsSubTab === 'saved' && (
          loadingLeads ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}><div className="spinner"></div></div>
          ) : leads.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '24px 0' }}>
              Nenhum lead adicionado ainda. Busque no Apollo ou importe uma lista acima.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Empresa</th>
                    <th>Validação</th>
                    <th>Status no Funil</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id} onClick={() => setSelectedLead(lead)} style={{ cursor: 'pointer' }}>
                      <td style={{ color: '#e2e8f0' }}>{lead.first_name || '—'}</td>
                      <td>{lead.email}</td>
                      <td>{lead.company_name || '—'}</td>
                      <td><span className={`badge badge-${lead.validation_status}`}>{lead.validation_status}</span></td>
                      <td><span className={`badge badge-${lead.funnel_status}`}>{lead.funnel_status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ── Seção 3: Sequência de E-mails ── */}
      <div className="section-card purple-accent">
        <div className="section-card-header">
          <div>
            <h2 className="section-card-title">
              <Mail size={20} style={{ color: '#7c3aed' }} />
              Sequência de E-mails
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              Variáveis: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', color: '#93c5fd' }}>{'{{first_name}}'}</code> <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', color: '#93c5fd' }}>{'{{company_name}}'}</code>
            </p>
          </div>
          <button onClick={handleSaveSequence} disabled={isSavingSequence} className="btn btn-primary" style={{ background: '#7c3aed' }}>
            <Save size={16} /> {isSavingSequence ? 'Salvando...' : 'Salvar Sequência'}
          </button>
        </div>

        <div className="sequence-timeline">
          {activeSteps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.06)' }}>
              <Mail size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p>Nenhum step configurado. Adicione o primeiro e-mail da sequência.</p>
            </div>
          ) : (
            steps.map((step, index) => {
              if (step.isDeleted) return null;
              const activeIndex = activeSteps.findIndex(s => (s.id || s.tempId) === (step.id || step.tempId));
              const displayStepNumber = activeIndex + 1;

              return (
                <div key={step.id || step.tempId} className="sequence-step glass-card" style={{ padding: 0 }}>
                  <div className="step-header" style={{ background: 'rgba(0,0,0,0.3)', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="step-number" style={{ fontSize: '0.8rem' }}>STEP {displayStepNumber}</span>
                    <button onClick={() => handleRemoveStep(index)} className="btn-icon" style={{ border: 'none', background: 'transparent', color: '#f43f5e' }} title="Remover">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {displayStepNumber > 1 && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Aguardar (dias)</label>
                        <input type="number" min="0" value={step.wait_days} onChange={(e) => handleStepChange(index, 'wait_days', parseInt(e.target.value) || 0)} className="form-input" style={{ width: '120px' }} />
                      </div>
                    )}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Assunto do E-mail</label>
                      <input type="text" value={step.subject || ''} onChange={(e) => handleStepChange(index, 'subject', e.target.value)} placeholder="Ex: Oportunidade para {{company_name}}" className="form-input" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Corpo do E-mail (HTML)</label>
                      <textarea value={step.body_html || ''} onChange={(e) => handleStepChange(index, 'body_html', e.target.value)} rows={6} placeholder="Olá {{first_name}}, ..." className="form-input" style={{ minHeight: '120px', resize: 'vertical', fontFamily: "'Courier New', monospace", fontSize: '0.8rem' }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <button onClick={handleAddStep} className="btn btn-secondary" style={{ width: '100%', borderStyle: 'dashed', marginTop: '16px' }}>
            <Plus size={18} /> Adicionar Step
          </button>
        </div>
      </div>

      <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
    </div>
  );
}
