import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Plus, Trash2, Save, Play, Pause } from 'lucide-react';

export default function CampaignBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [campaign, setCampaign] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Settings form state
  const [name, setName] = useState('');
  const [dailyLimit, setDailyLimit] = useState(40);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingSequence, setIsSavingSequence] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (campaignError) throw campaignError;
      if (!campaignData) {
        navigate('/campaigns');
        return;
      }

      setCampaign(campaignData);
      setName(campaignData.name);
      setDailyLimit(campaignData.daily_send_limit);

      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('campaign_id', id)
        .order('step_number');

      if (templatesError) throw templatesError;
      
      const formattedSteps = (templatesData || []).map(t => ({
        ...t,
        isNew: false,
        isDeleted: false
      }));
      setSteps(formattedSteps);

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
      const { error } = await supabase
        .from('campaigns')
        .update({ name, daily_send_limit: dailyLimit })
        .eq('id', id);

      if (error) throw error;
      setCampaign(prev => ({ ...prev, name, daily_send_limit: dailyLimit }));
      
      showFeedback('Configurações salvas!');
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
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      setCampaign(prev => ({ ...prev, status: newStatus }));
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao atualizar status');
    }
  };

  const handleAddStep = () => {
    const activeSteps = steps.filter(s => !s.isDeleted);
    const nextStepNumber = activeSteps.length > 0 ? Math.max(...activeSteps.map(s => s.step_number)) + 1 : 1;
    
    setSteps([
      ...steps,
      {
        tempId: Date.now().toString(),
        campaign_id: id,
        step_number: nextStepNumber,
        subject: '',
        body_html: '',
        wait_days: activeSteps.length === 0 ? 0 : 2,
        isNew: true,
        isDeleted: false
      }
    ]);
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
          // Delete from DB
          return supabase.from('email_templates').delete().eq('id', step.id);
        } else if (!step.isDeleted && step.isNew) {
          // Insert into DB
          return supabase.from('email_templates').insert({
            campaign_id: step.campaign_id,
            step_number: step.step_number,
            subject: step.subject,
            body_html: step.body_html,
            wait_days: step.wait_days
          });
        } else if (!step.isDeleted && !step.isNew) {
          // Update in DB
          return supabase.from('email_templates').update({
            subject: step.subject,
            body_html: step.body_html,
            wait_days: step.wait_days
          }).eq('id', step.id);
        }
      });

      await Promise.all(promises);
      await fetchData(); // Refetch to get actual IDs and clean state
      showFeedback('Sequência salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar sequência:', error);
      alert('Erro ao salvar sequência. Verifique os dados.');
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
      <div className="flex justify-center items-center h-full">
        <div className="spinner"></div>
      </div>
    );
  }

  const activeSteps = steps.filter(s => !s.isDeleted);

  return (
    <div className="animate-fade-in p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="page-header mb-8 flex flex-col gap-4">
        <Link to="/campaigns" className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors w-fit">
          <ArrowLeft size={20} />
          <span>Voltar para Campanhas</span>
        </Link>
        <div className="flex justify-between items-center">
          <h1 className="page-title text-3xl font-bold flex items-center gap-4">
            {campaign?.name}
            <span className={`badge badge-${campaign?.status} px-2 py-1 rounded text-xs font-medium uppercase tracking-wider text-sm`}>
              {campaign?.status}
            </span>
          </h1>
        </div>
      </div>

      {/* Campaign Settings */}
      <div className="glass-card bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
        <form onSubmit={handleSaveSettings} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="form-group flex-1 w-full">
            <label className="block text-sm font-medium text-gray-300 mb-2">Nome da Campanha</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="form-input w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white"
            />
          </div>
          <div className="form-group flex-1 w-full">
            <label className="block text-sm font-medium text-gray-300 mb-2">Limite Diário</label>
            <input 
              type="number" 
              required
              min="1"
              value={dailyLimit}
              onChange={e => setDailyLimit(Number(e.target.value))}
              className="form-input w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-white"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
            <button 
              type="button"
              onClick={handleToggleStatus}
              className="btn btn-secondary flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10 flex-1 md:flex-none"
            >
              {campaign?.status === 'active' ? (
                <><Pause size={18} /> Pausar</>
              ) : (
                <><Play size={18} /> Ativar</>
              )}
            </button>
            <button 
              type="submit"
              disabled={isSavingSettings}
              className="btn btn-primary btn-sm flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 flex-1 md:flex-none"
            >
              {isSavingSettings ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      </div>

      {/* Sequence Builder */}
      <div className="sequence-section">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="chart-header text-2xl font-semibold">Sequência de E-mails</h2>
            <p className="text-gray-400 mt-1 text-sm">
              Use variáveis: <code className="bg-black/30 px-1.5 py-0.5 rounded text-blue-300">{'{{first_name}}'}</code>, <code className="bg-black/30 px-1.5 py-0.5 rounded text-blue-300">{'{{company_name}}'}</code>, <code className="bg-black/30 px-1.5 py-0.5 rounded text-blue-300">{'{{revenue_estimated}}'}</code>
            </p>
          </div>
          <div className="flex items-center gap-4">
            {saveMessage && <span className="text-green-400 text-sm animate-pulse">{saveMessage}</span>}
            <button 
              onClick={handleSaveSequence}
              disabled={isSavingSequence}
              className="btn btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {isSavingSequence ? 'Salvando...' : 'Salvar Sequência'}
            </button>
          </div>
        </div>

        <div className="sequence-timeline space-y-6">
          {activeSteps.length === 0 ? (
            <div className="text-center p-12 glass-card bg-white/5 border border-white/10 rounded-xl">
              <p className="text-gray-400">Nenhum step configurado. Adicione o primeiro e-mail da sequência.</p>
            </div>
          ) : (
            steps.map((step, index) => {
              if (step.isDeleted) return null;
              
              // Determine display step number based on active steps
              const activeIndex = activeSteps.findIndex(s => (s.id || s.tempId) === (step.id || step.tempId));
              const displayStepNumber = activeIndex + 1;

              return (
                <div key={step.id || step.tempId} className="sequence-step glass-card bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-lg relative">
                  <div className="step-header bg-black/40 px-6 py-4 flex justify-between items-center border-b border-white/5">
                    <h3 className="step-number font-bold text-lg text-blue-400">STEP {displayStepNumber}</h3>
                    <button 
                      onClick={() => handleRemoveStep(index)}
                      className="btn-icon text-gray-500 hover:text-red-400 transition-colors p-2"
                      title="Remover Step"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-5">
                    {displayStepNumber > 1 && (
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Aguardar (dias)</label>
                        <input 
                          type="number"
                          min="0"
                          value={step.wait_days}
                          onChange={(e) => handleStepChange(index, 'wait_days', parseInt(e.target.value) || 0)}
                          className="form-input bg-black/30 border border-white/10 rounded-lg p-2.5 text-white w-32"
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Assunto</label>
                      <input 
                        type="text"
                        value={step.subject || ''}
                        onChange={(e) => handleStepChange(index, 'subject', e.target.value)}
                        placeholder="Ex: Oportunidade para {{company_name}}"
                        className="form-input bg-black/30 border border-white/10 rounded-lg p-2.5 text-white w-full"
                      />
                    </div>

                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Corpo do E-mail (HTML)</label>
                      <textarea 
                        value={step.body_html || ''}
                        onChange={(e) => handleStepChange(index, 'body_html', e.target.value)}
                        rows={8}
                        placeholder="Olá {{first_name}}, ..."
                        className="form-textarea bg-black/30 border border-white/10 rounded-lg p-3 text-white w-full font-mono text-sm resize-y"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div className="pt-4 flex justify-center">
            <button 
              onClick={handleAddStep}
              className="btn btn-secondary flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10 border-dashed hover:border-white/30 w-full justify-center text-gray-300 hover:text-white"
            >
              <Plus size={20} />
              Adicionar Step
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
