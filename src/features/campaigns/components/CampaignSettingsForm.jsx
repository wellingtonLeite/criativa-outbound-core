import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Play } from 'lucide-react';

export function CampaignSettingsForm({ campaign, onSave, onToggleStatus, loading }) {
  const [name, setName] = useState(campaign?.name || '');
  const [dailyLimit, setDailyLimit] = useState(campaign?.daily_limit || 40);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, daily_limit: parseInt(dailyLimit, 10) });
  };

  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="text-xl text-white">Configurações Gerais</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 space-y-2 w-full">
            <Label htmlFor="name" className="text-gray-300">Nome da Campanha</Label>
            <Input 
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-black/30 border-white/10 text-white"
            />
          </div>
          
          <div className="w-full md:w-48 space-y-2">
            <Label htmlFor="limit" className="text-gray-300">Limite Diário (E-mails)</Label>
            <Input 
              id="limit"
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              className="bg-black/30 border-white/10 text-white"
            />
          </div>

          <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
            <Button 
              type="button"
              variant={campaign?.status === 'active' ? 'destructive' : 'default'}
              className={campaign?.status !== 'active' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              onClick={onToggleStatus}
            >
              <Play className="mr-2 h-4 w-4" /> 
              {campaign?.status === 'active' ? 'Pausar' : 'Ativar'}
            </Button>
            
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              <Save className="mr-2 h-4 w-4" /> Salvar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
