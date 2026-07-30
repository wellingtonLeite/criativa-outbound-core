import React from 'react';
import { ArrowLeft, Play, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function CampaignHeader({ campaign, onStatusChange }) {
  if (!campaign) return null;

  return (
    <div className="mb-8">
      <Link 
        to="/campaigns" 
        className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft size={16} className="mr-1" /> Voltar para Campanhas
      </Link>
      
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            {campaign.name}
            <span className={`text-xs px-2 py-1 rounded-full border ${
              campaign.status === 'active' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
            }`}>
              {campaign.status.toUpperCase()}
            </span>
          </h1>
        </div>
      </div>
    </div>
  );
}
