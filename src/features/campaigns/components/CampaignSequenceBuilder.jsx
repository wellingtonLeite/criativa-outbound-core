import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Save, Plus } from 'lucide-react';

export function CampaignSequenceBuilder({ campaign, onSave, loading }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Implementation placeholder for sequence saving
    onSave({});
  };

  return (
    <Card className="bg-white/5 border-white/10 mb-6 border-t-4 border-t-purple-500">
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <Mail size={20} className="text-purple-500" />
            Sequência de E-mails
          </CardTitle>
          <p className="text-xs text-gray-400 mt-2">
            Variáveis: <code className="text-[#00d4ff] bg-blue-900/30 px-1 rounded">{`{{first_name}}`}</code>, <code className="text-[#00d4ff] bg-blue-900/30 px-1 rounded">{`{{company_name}}`}</code>
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={loading} className="bg-[#00d4ff] text-black hover:bg-[#00b0d4]">
          <Save className="mr-2 h-4 w-4" /> Salvar Sequência
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6 border-l-2 border-purple-500/30 space-y-6">
          <div className="bg-black/20 border border-white/5 p-8 text-center rounded-xl text-gray-400 relative">
            <div className="absolute w-3 h-3 bg-purple-500 rounded-full -left-[31px] top-1/2 -translate-y-1/2 ring-4 ring-black"></div>
            Nenhum step configurado. Adicione o primeiro e-mail da sequência.
          </div>
          
          <Button variant="outline" className="w-full border-dashed border-white/20 text-gray-400 hover:text-white hover:border-white/40 bg-transparent">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Step
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
