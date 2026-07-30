import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Plus, Trash2, Save, Play, Pause, X, Database, Mail } from 'lucide-react';

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

  useEffect(() => { fetchData(); }, [id]);

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
    </div>
  );
}
