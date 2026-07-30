import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Database, X, Save } from 'lucide-react';

const TagInput = ({ label, placeholder, tags, setTags }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
        setInputValue('');
      }
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <Label className="text-gray-300">{label}</Label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, index) => (
          <span key={index} className="bg-blue-600 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-300">
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="bg-black/30 border-white/10 text-white"
      />
    </div>
  );
};

export function CampaignDataSourceForm({ campaign, onSave, loading }) {
  const initialParams = campaign?.search_parameters || {};
  
  const [jobTitles, setJobTitles] = useState(initialParams.job_titles || []);
  const [locations, setLocations] = useState(initialParams.locations || []);
  const [companySizes, setCompanySizes] = useState(initialParams.company_sizes || []);
  const [keywords, setKeywords] = useState(initialParams.keywords || []);
  const [scrapingLimit, setScrapingLimit] = useState(campaign?.daily_scraping_limit || 25);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      search_parameters: {
        job_titles: jobTitles,
        locations,
        company_sizes: companySizes,
        keywords
      },
      daily_scraping_limit: parseInt(scrapingLimit, 10)
    });
  };

  return (
    <Card className="bg-white/5 border-white/10 mb-6 border-t-4 border-t-blue-500">
      <CardHeader>
        <CardTitle className="text-xl text-white flex items-center gap-2">
          <Database size={20} className="text-blue-500" /> 
          Parâmetros de Extração (Data Source)
          <span className="text-xs font-normal text-gray-400 ml-2">Lido pelo motor n8n + Apollo</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <TagInput 
              label="Cargos Alvo (Job Titles)" 
              placeholder="Ex: CEO, Founder (Enter para adicionar)" 
              tags={jobTitles} setTags={setJobTitles} 
            />
            <TagInput 
              label="Localizações (Locations)" 
              placeholder="Ex: Brazil, São Paulo (Enter)" 
              tags={locations} setTags={setLocations} 
            />
            <TagInput 
              label="Tamanho da Empresa (Company Sizes)" 
              placeholder="Ex: 11-20, 50-100 (Enter)" 
              tags={companySizes} setTags={setCompanySizes} 
            />
            <TagInput 
              label="Palavras-chave (Keywords)" 
              placeholder="Ex: SaaS, Tecnologia (Enter)" 
              tags={keywords} setTags={setKeywords} 
            />
          </div>

          <div className="flex flex-col md:flex-row items-end gap-6">
            <div className="w-full md:w-1/3 space-y-2">
              <Label className="text-gray-300">Limite Diário de Raspagem</Label>
              <Input 
                type="number"
                value={scrapingLimit}
                onChange={(e) => setScrapingLimit(e.target.value)}
                className="bg-black/30 border-white/10 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Limite diário de contatos a extrair</p>
            </div>
            
            <div className="w-full md:w-auto ml-auto">
              <Button type="submit" disabled={loading} className="w-full bg-[#00d4ff] text-black hover:bg-[#00b0d4]">
                <Save className="mr-2 h-4 w-4" /> Salvar Fonte de Dados
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
