import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { callApolloProxy } from '../lib/apolloClient';
import { verifyEmailStatus, verifyEmailsBulk, callReoonProxy } from '../lib/reoonClient';
import LeadDetailModal from '../components/LeadDetailModal';
import CompanyAvatar from '../components/CompanyAvatar';
import ValidationStatusBadge from '../components/ValidationStatusBadge';
import FunnelStatusBadge from '../components/FunnelStatusBadge';
import { ArrowLeft, Plus, Trash2, Save, Play, Pause, X, Database, Mail, Users, Search, List, Download } from 'lucide-react';

// A Apollo às vezes devolve telefone como string, às vezes como
// { number, sanitized_number } — normaliza sempre para string.
const normalizePhone = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.sanitized_number || value.number || null;
  return null;
};

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
  const [leadsSubTab, setLeadsSubTab] = useState('import'); // 'import' | 'saved'
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [revalidatingPending, setRevalidatingPending] = useState(false);
  const [reoonProgress, setReoonProgress] = useState(null); // { status, total, checked, progress }

  const [searchResults, setSearchResults] = useState([]);
  const [searchingLeads, setSearchingLeads] = useState(false);
  const [searchErrorMsg, setSearchErrorMsg] = useState('');
  const [selectedSearchIds, setSelectedSearchIds] = useState(new Set());
  const [bulkAdding, setBulkAdding] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });

  const [apolloLists, setApolloLists] = useState([]);
  const [loadingApolloLists, setLoadingApolloLists] = useState(false);
  const [apolloListsError, setApolloListsError] = useState('');
  const [importingListId, setImportingListId] = useState(null);
  const [importMessage, setImportMessage] = useState('');

  const [selectedLead, setSelectedLead] = useState(null);
  const [scrapedTodayCount, setScrapedTodayCount] = useState(0);
  const [reoonBalance, setReoonBalance] = useState(null);

  useEffect(() => { fetchData(); }, [id]);
  useEffect(() => { fetchLeads(); }, [id]);
  useEffect(() => { fetchScrapedTodayCount(); }, [id]);
  useEffect(() => {
    callReoonProxy('check_balance').then(setReoonBalance).catch(() => setReoonBalance(null));
  }, []);

  const fetchScrapedTodayCount = async () => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count, error } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', id)
      .gte('created_at', startOfDay.toISOString());
    if (error) {
      console.error('Erro ao contar leads raspados hoje:', error);
      return;
    }
    setScrapedTodayCount(count || 0);
  };

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

  const saveSettings = async () => {
    const { error } = await supabase.from('campaigns').update({
      name, daily_send_limit: dailyLimit, daily_scraping_limit: dailyScrapingLimit, search_parameters: searchParams
    }).eq('id', id);
    if (error) throw error;
    setCampaign(prev => ({ ...prev, name, daily_send_limit: dailyLimit, daily_scraping_limit: dailyScrapingLimit, search_parameters: searchParams }));
  };

  const handleSaveAndSearch = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await saveSettings();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações');
      setIsSavingSettings(false);
      return;
    }
    setIsSavingSettings(false);
    await handleSearchLeads();
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

  const handleRevalidatePendingLeads = async () => {
    const pending = leads.filter(l => l.validation_status === 'pending');
    if (pending.length === 0) return;
    setRevalidatingPending(true);
    setReoonProgress({ status: 'creating', total: pending.length });
    try {
      const statusByEmail = await verifyEmailsBulk(pending.map(l => l.email), { maxWaitMs: 120000, onProgress: setReoonProgress });
      let resolved = 0;
      for (const lead of pending) {
        const newStatus = statusByEmail.get(lead.email) || 'pending';
        if (newStatus === 'pending') continue;
        resolved++;
        const update = { validation_status: newStatus };
        // Só avança para a sequência se ainda estava no início (nunca tinha sido validado antes)
        if (newStatus === 'valid' && lead.funnel_status === 'scraped') {
          update.funnel_status = 'in_sequence';
        }
        await supabase.from('leads').update(update).eq('id', lead.id);
      }
      showFeedback(`✓ ${resolved} de ${pending.length} leads pendentes foram validados.`);
      await fetchLeads();
    } catch (error) {
      console.error('Erro ao revalidar leads pendentes:', error);
      alert('Erro ao revalidar leads pendentes: ' + error.message);
    } finally {
      setRevalidatingPending(false);
      setReoonProgress(null);
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

  // Enriquece (revela e-mail, consome créditos Apollo) e grava um resultado de busca como lead
  const addLeadFromSearchResult = async (person) => {
    const enriched = await callApolloProxy('enrich_person', { id: person.id });
    const email = enriched.person?.email;
    if (!email) throw new Error('Não foi possível obter um e-mail verificado para este contato.');

    const p = enriched.person || {};
    const orgRaw = { ...(person.organization || {}), ...(p.organization || {}) };
    const org = { ...orgRaw, phone: normalizePhone(orgRaw.phone), primary_phone: normalizePhone(orgRaw.primary_phone) };
    // Valida o e-mail via Reoon automaticamente (fica 'pending' se falhar/sem credencial)
    const validation_status = await verifyEmailStatus(email);

    // Um lead novo com e-mail válido já entra pronto para a sequência de disparo
    // (get_send_queue só pega leads em 'in_sequence'). Leads que já existiam mantêm
    // o funnel_status atual — não retrocede quem já avançou (respondeu, agendou etc).
    const { data: alreadyExists } = await supabase
      .from('leads').select('id').eq('campaign_id', id).eq('email', email).maybeSingle();
    const funnelStatusUpdate = (!alreadyExists && validation_status === 'valid')
      ? { funnel_status: 'in_sequence' } : {};

    const { error } = await supabase.from('leads').upsert({
      campaign_id: id,
      email,
      first_name: p.first_name || person.first_name || null,
      last_name: p.last_name || person.last_name || null,
      company_name: org.name || null,
      revenue_estimated: org.annual_revenue_printed || null,
      phone: normalizePhone(p.sanitized_phone) || org.phone || org.primary_phone || null,
      company_info: Object.keys(org).length ? org : null,
      validation_status,
      ...funnelStatusUpdate,
      raw_data: enriched.person || null,
      person_info: {
        title: p.title || person.title || null,
        seniority: p.seniority || null,
        headline: p.headline || null,
        linkedin_url: p.linkedin_url || null,
        twitter_url: p.twitter_url || null,
        city: p.city || null,
        state: p.state || null,
        country: p.country || null,
        departments: p.departments || null,
        functions: p.functions || null,
      },
    }, { onConflict: 'campaign_id,email' });
    if (error) throw error;
  };

  const toggleSearchSelection = (personId) => {
    setSelectedSearchIds(prev => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId); else next.add(personId);
      return next;
    });
  };

  const toggleSelectAllSearchResults = () => {
    setSelectedSearchIds(prev =>
      prev.size === searchResults.length ? new Set() : new Set(searchResults.map(p => p.id))
    );
  };

  const handleAddSelectedLeads = async () => {
    const selected = searchResults.filter(p => selectedSearchIds.has(p.id));
    if (selected.length === 0) return;

    const remainingQuota = Math.max(0, dailyScrapingLimit - scrapedTodayCount);
    if (remainingQuota === 0) {
      alert(`Limite diário de raspagem (${dailyScrapingLimit}) já foi atingido para esta campanha hoje.`);
      return;
    }
    const toAdd = selected.slice(0, remainingQuota);
    const truncated = selected.length - toAdd.length;

    setBulkAdding(true);
    setBulkProgress({ done: 0, total: toAdd.length });
    let added = 0;
    for (const person of toAdd) {
      try {
        await addLeadFromSearchResult(person);
        added++;
      } catch (error) {
        console.error('Erro ao adicionar lead em lote:', person.id, error);
      }
      setBulkProgress(prev => ({ ...prev, done: prev.done + 1 }));
    }
    setBulkAdding(false);
    setSelectedSearchIds(new Set());
    showFeedback(
      truncated > 0
        ? `✓ ${added} de ${toAdd.length} adicionados — ${truncated} ficaram de fora pelo limite diário de raspagem (${dailyScrapingLimit}).`
        : `✓ ${added} de ${toAdd.length} leads adicionados!`
    );
    await fetchLeads();
    await fetchScrapedTodayCount();
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
      const allRows = contacts
        .filter(c => !!c.email)
        .map(c => {
          // organization = dados mestres da empresa (descrição, indústrias, keywords, funcionários...)
          // account = dados da conta Apollo do seu time sobre essa empresa (etapa, listas, origem...)
          const orgRaw = { ...(c.organization || {}), ...(c.account || {}) };
          const org = { ...orgRaw, phone: normalizePhone(orgRaw.phone), primary_phone: normalizePhone(orgRaw.primary_phone) };
          return {
            campaign_id: id,
            email: c.email,
            first_name: c.first_name || null,
            last_name: c.last_name || null,
            company_name: c.organization_name || org.name || null,
            revenue_estimated: org.annual_revenue_printed || null,
            phone: normalizePhone(c.sanitized_phone) || org.phone || org.primary_phone || null,
            company_info: Object.keys(org).length ? org : null,
            raw_data: c,
            person_info: {
              title: c.title || null,
              headline: c.headline || null,
              linkedin_url: c.linkedin_url || null,
              twitter_url: c.twitter_url || null,
              raw_address: c.present_raw_address || null,
              phone_numbers: (c.phone_numbers || []).map(normalizePhone).filter(Boolean),
              contact_stage_id: c.contact_stage_id || null,
              label_ids: c.label_ids || null,
              source: c.source_display_name || c.source || null,
            },
          };
        });

      // O limite diário de raspagem vale só para leads NOVOS — reimportar/atualizar
      // um lead que já existe nesta campanha não consome a cota.
      const { data: existing, error: existingError } = await supabase
        .from('leads').select('email, validation_status').eq('campaign_id', id);
      if (existingError) throw existingError;
      const existingStatusByEmail = new Map((existing || []).map(l => [l.email, l.validation_status]));

      // Leads já existentes mantêm a validação anterior (não gasta cota do Reoon de novo).
      const existingRows = allRows
        .filter(r => existingStatusByEmail.has(r.email))
        .map(r => ({ ...r, validation_status: existingStatusByEmail.get(r.email) }));
      const newRows = allRows.filter(r => !existingStatusByEmail.has(r.email));

      const remainingQuota = Math.max(0, dailyScrapingLimit - scrapedTodayCount);
      const newRowsToInsert = newRows.slice(0, remainingQuota);
      const truncated = newRows.length - newRowsToInsert.length;

      // Valida os e-mails dos leads novos em lote via Reoon (modo power — detecta catch-all
      // de verdade). Assíncrono na Reoon; ficam 'pending' se a tarefa falhar ou não completar a tempo.
      if (newRowsToInsert.length > 0) {
        setReoonProgress({ status: 'creating', total: newRowsToInsert.length });
        const statusByEmail = await verifyEmailsBulk(newRowsToInsert.map(r => r.email), { maxWaitMs: 120000, onProgress: setReoonProgress });
        for (const row of newRowsToInsert) {
          row.validation_status = statusByEmail.get(row.email) || 'pending';
          // Lead novo com e-mail válido já entra pronto para a sequência de disparo
          // (get_send_queue só pega leads em 'in_sequence').
          if (row.validation_status === 'valid') {
            row.funnel_status = 'in_sequence';
          }
        }
      }

      const rows = [...existingRows, ...newRowsToInsert];

      if (rows.length === 0) {
        setImportMessage(`Limite diário de raspagem (${dailyScrapingLimit}) já foi atingido para esta campanha hoje.`);
        return;
      }

      const { error } = await supabase.from('leads').upsert(rows, { onConflict: 'campaign_id,email' });
      if (error) throw error;
      setImportMessage(
        truncated > 0
          ? `✓ ${rows.length} contatos importados/atualizados de "${list.name}" — ${truncated} novos ficaram de fora pelo limite diário de raspagem (${dailyScrapingLimit}).`
          : `✓ ${rows.length} contatos importados/atualizados de "${list.name}"!`
      );
      await fetchLeads();
      await fetchScrapedTodayCount();
    } catch (error) {
      console.error('Erro ao importar lista:', error);
      setImportMessage('Erro ao importar: ' + error.message);
    } finally {
      setImportingListId(null);
      setReoonProgress(null);
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
      <form onSubmit={handleSaveAndSearch}>
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
              <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                {scrapedTodayCount}/{dailyScrapingLimit} usados hoje
              </p>
            </div>
            <button type="submit" disabled={isSavingSettings || searchingLeads} className="btn btn-primary">
              <Search size={16} /> {isSavingSettings ? 'Salvando...' : searchingLeads ? 'Buscando...' : 'Salvar e Buscar no Apollo'}
            </button>
          </div>

          {/* Resultados da busca — aparecem aqui mesmo, sem trocar de seção */}
          {(searchErrorMsg || searchResults.length > 0) && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px', marginTop: '20px' }}>
              {searchErrorMsg && (
                searchErrorMsg.toLowerCase().includes('not included in your') ? (
                  <div style={{ color: '#f43f5e', fontSize: '0.85rem', marginBottom: '12px' }}>
                    <p style={{ fontWeight: 600, marginBottom: '4px' }}>
                      Seu plano Apollo não inclui a busca direta de pessoas (People API Search).
                    </p>
                    <p style={{ color: '#94a3b8' }}>
                      É uma restrição do plano da sua conta Apollo, não um erro do sistema — nem uma Master Key libera esse endpoint em planos gratuitos.
                      Enquanto isso, use a aba <strong>"Importar Lista do Apollo"</strong> abaixo: ela usa um endpoint diferente, já
                      disponível no seu plano, e traz e-mail verificado sem custo extra de créditos.
                    </p>
                  </div>
                ) : (
                  <p style={{ color: '#f43f5e', fontSize: '0.85rem', marginBottom: '12px' }}>{searchErrorMsg}</p>
                )
              )}

              {searchResults.length > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      {searchResults.length} contatos encontrados — {selectedSearchIds.size} selecionados
                    </p>
                    <button
                      type="button"
                      onClick={handleAddSelectedLeads}
                      disabled={selectedSearchIds.size === 0 || bulkAdding}
                      className="btn btn-sm btn-primary"
                      style={{ background: '#10b981' }}
                      title="Consome créditos Apollo para revelar o e-mail de cada contato selecionado"
                    >
                      {bulkAdding
                        ? `Adicionando ${bulkProgress.done}/${bulkProgress.total}...`
                        : `Adicionar Selecionados (${selectedSearchIds.size})`}
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '32px' }}>
                            <input
                              type="checkbox"
                              checked={selectedSearchIds.size === searchResults.length}
                              onChange={toggleSelectAllSearchResults}
                            />
                          </th>
                          <th>Nome</th>
                          <th>Empresa</th>
                          <th>Localização</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchResults.map((person) => (
                          <tr key={person.id} onClick={() => toggleSearchSelection(person.id)} style={{ cursor: 'pointer' }}>
                            <td onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedSearchIds.has(person.id)}
                                onChange={() => toggleSearchSelection(person.id)}
                              />
                            </td>
                            <td style={{ color: '#e2e8f0' }}>
                              <div style={{ fontWeight: 500 }}>
                                {person.name || [person.first_name, person.last_name_obfuscated].filter(Boolean).join(' ') || '—'}
                              </div>
                              {person.title && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{person.title}</div>}
                            </td>
                            <td>{person.organization?.name || '—'}</td>
                            <td>{person.city ? `${person.city}, ${person.country || ''}` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
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

        {/* Créditos disponíveis — Reoon (verificação) e uso de raspagem do Apollo (interno) */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div className="glass-card" style={{ padding: '10px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#64748b' }}>Créditos Reoon:</span>
            {reoonBalance ? (
              <>
                <strong style={{ color: '#10b981' }}>{reoonBalance.remaining_daily_credits} diários</strong>
                <span style={{ color: '#64748b' }}>·</span>
                <strong style={{ color: '#e2e8f0' }}>{reoonBalance.remaining_instant_credits} instantâneos</strong>
              </>
            ) : (
              <span style={{ color: '#64748b' }}>não configurado</span>
            )}
          </div>
          <div className="glass-card" style={{ padding: '10px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#64748b' }}>Raspagem Apollo (uso interno hoje):</span>
            <strong style={{ color: scrapedTodayCount >= dailyScrapingLimit ? '#f43f5e' : '#e2e8f0' }}>
              {scrapedTodayCount}/{dailyScrapingLimit}
            </strong>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
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

        {/* Progresso da higienização de e-mails (Reoon) — visível em qualquer sub-aba */}
        {reoonProgress && (
          <div className="glass-card" style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', marginBottom: '20px',
            border: '1px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.07)'
          }}>
            <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', flexShrink: 0 }}></div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>
                Higienizando e-mails na Reoon{reoonProgress.total ? ` — ${reoonProgress.total} contato${reoonProgress.total > 1 ? 's' : ''}` : ''}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                {reoonProgress.status === 'creating' && 'Enviando e-mails para verificação...'}
                {(reoonProgress.status === 'waiting') && 'Na fila de processamento da Reoon...'}
                {reoonProgress.status === 'running' && (
                  `Verificando${reoonProgress.checked != null ? ` — ${reoonProgress.checked}/${reoonProgress.total} checados` : ''}${reoonProgress.progress != null ? ` (${Math.round(reoonProgress.progress)}%)` : ''}`
                )}
                {reoonProgress.status === 'completed' && 'Concluído — salvando resultados...'}
                {reoonProgress.status === 'failed' && 'Falha na verificação — os e-mails ficarão como "pendente" (pode revalidar depois).'}
                {reoonProgress.status === 'timeout' && 'Demorando mais que o esperado — os e-mails não confirmados ficarão "pendente" (revalide depois).'}
              </div>
            </div>
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
            <div>
              {leads.some(l => l.validation_status === 'pending') && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                  <button
                    onClick={handleRevalidatePendingLeads}
                    disabled={revalidatingPending}
                    className="btn btn-sm btn-secondary"
                  >
                    {revalidatingPending
                      ? 'Revalidando...'
                      : `Revalidar Pendentes (${leads.filter(l => l.validation_status === 'pending').length})`}
                  </button>
                </div>
              )}
              <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Empresa</th>
                    <th>Validação</th>
                    <th>Status no Funil</th>
                    <th>E-mail</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id} onClick={() => setSelectedLead(lead)} style={{ cursor: 'pointer' }}>
                      <td style={{ color: '#e2e8f0' }}>{[lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—'}</td>
                      <td>{lead.email}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CompanyAvatar name={lead.company_name} logoUrl={lead.company_info?.logo_url} size={24} />
                          {lead.company_name || '—'}
                        </div>
                      </td>
                      <td><ValidationStatusBadge status={lead.validation_status} /></td>
                      <td><FunnelStatusBadge status={lead.funnel_status} /></td>
                      <td>
                        {lead.current_step > 0 ? (
                          <span
                            className="badge badge-sent"
                            title={lead.last_contacted_at ? `Último envio: ${new Date(lead.last_contacted_at).toLocaleString('pt-BR')}` : undefined}
                          >
                            ✓ Enviado ({lead.current_step}){lead.last_contacted_at ? ` — ${new Date(lead.last_contacted_at).toLocaleDateString('pt-BR')}` : ''}
                          </span>
                        ) : (
                          <span className="badge badge-pending">Ainda não enviado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
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
