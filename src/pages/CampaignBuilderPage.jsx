import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CampaignHeader } from '../features/campaigns/components/CampaignHeader';
import { CampaignSettingsForm } from '../features/campaigns/components/CampaignSettingsForm';
import { CampaignDataSourceForm } from '../features/campaigns/components/CampaignDataSourceForm';
import { CampaignSequenceBuilder } from '../features/campaigns/components/CampaignSequenceBuilder';

export default function CampaignBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
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
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCampaign = async (updates) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      setCampaign(prev => ({ ...prev, ...updates }));
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!campaign) return;
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    await handleUpdateCampaign({ status: newStatus });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-20">
      <CampaignHeader 
        campaign={campaign} 
      />
      
      <CampaignSettingsForm 
        campaign={campaign} 
        onSave={handleUpdateCampaign}
        onToggleStatus={handleToggleStatus}
        loading={isSaving}
      />
      
      <CampaignDataSourceForm 
        campaign={campaign}
        onSave={handleUpdateCampaign}
        loading={isSaving}
      />

      <CampaignSequenceBuilder 
        campaign={campaign}
        onSave={() => {}}
        loading={false}
      />
    </div>
  );
}
