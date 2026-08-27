import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Database, 
  Search, 
  CheckCircle2, 
  Building2, 
  ArrowRight, 
  ShieldCheck,
  UserCheck,
  MapPin,
  Briefcase,
  Layers,
  Phone,
  Mail,
  Zap
} from 'lucide-react';
import { triggerMiningJob } from '../lib/miningClient';
import CompanyAvatar from '../components/CompanyAvatar';

const SUGGESTED_ROLES = [
  'Diretor',
  'CEO',
  'Gerente Comercial',
  'Head de Vendas',
  'Diretor de Operações',
  'CTO'
];

const SECTORS = [
  { value: 'Tecnologia & Software', label: 'Tecnologia & Software' },
  { value: 'Logística & Transporte', label: 'Logística & Transporte' },
  { value: 'Indústria & Manufatura', label: 'Indústria & Manufatura' },
  { value: 'Varejo & E-commerce', label: 'Varejo & E-commerce' },
  { value: 'Saúde & Farma', label: 'Saúde & Farma' },
  { value: 'Serviços Financeiros', label: 'Serviços Financeiros' }
];

const LOCATIONS = [
  { value: 'SP', label: 'São Paulo (SP)' },
  { value: 'RJ', label: 'Rio de Janeiro (RJ)' },
  { value: 'MG', label: 'Minas Gerais (MG)' },
  { value: 'SUL', label: 'Sul (PR/SC/RS)' },
  { value: 'BR', label: 'Brasil Todo' }
];

const QUANTITY_OPTIONS = [
  { value: 10, label: '10 leads' },
  { value: 25, label: '25 leads' },
  { value: 50, label: '50 leads' },
  { value: 100, label: '100 leads' }
];

export default function ProspectorPage() {
  const navigate = useNavigate();

  // Search & Filter Form State
  const [role, setRole] = useState('Diretor');
  const [segment, setSegment] = useState('Tecnologia & Software');
  const [location, setLocation] = useState('SP');
  const [quantity, setQuantity] = useState(25);

  // Execution & Results State
  const [isMining, setIsMining] = useState(false);
  const [miningFeedback, setMiningFeedback] = useState(null);
  const [minedResults, setMinedResults] = useState([]);

  const handleSelectRoleTag = (suggestedRole) => {
    setRole(suggestedRole);
  };

  const handleStartMining = async (e) => {
    if (e) e.preventDefault();
    if (isMining) return;

    setIsMining(true);
    setMiningFeedback({ stage: 'Mapeando diretórios corporativos e bases de dados B2B...', progress: 30 });

    try {
      await new Promise(r => setTimeout(r, 250));
      setMiningFeedback({ stage: `Consultando decisores (${role || 'Decisores'}) no setor ${segment} (${location})...`, progress: 65 });

      await new Promise(r => setTimeout(r, 250));
      setMiningFeedback({ stage: 'Enriquecendo dados cadastrais e verificando CNPJs...', progress: 90 });

      const res = await triggerMiningJob({
        segment: segment || 'Tecnologia & Software',
        location: location || 'SP',
        quantity: Math.max(1, Number(quantity) || 10),
        role: role.trim() || 'Diretor'
      });

      if (res.status === 'SUCCESS') {
        const discovered = res.data || [];
        setMinedResults(discovered);
        setMiningFeedback({
          success: true,
          stage: `✓ ${discovered.length} decisores qualificados encontrados e salvos na sua base!`,
          count: discovered.length
        });
      } else {
        throw new Error(res.error || 'Não foi possível completar a mineração.');
      }
    } catch (err) {
      console.error('Erro na mineração:', err);
      setMiningFeedback({ error: true, stage: err.message || 'Erro ao minerar leads.' });
    } finally {
      setIsMining(false);
    }
  };

  return (
    <div className="animate-fade-in dashboard-container">
      {/* 1. Header Executivo */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge" style={{ background: 'rgba(0, 212, 255, 0.12)', color: '#00d4ff', fontWeight: 600, fontSize: '0.75rem' }}>
              PASSO 1 DE 3
            </span>
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>• Esteira Comercial CORE</span>
          </div>
          <h1 className="page-title">1. Mineração de Decisores B2B</h1>
          <p className="page-subtitle">
            Descubra contatos qualificados por cargo, setor e localização para alimentar sua esteira comercial.
          </p>
        </div>
      </div>

      {/* 2. Painel de Busca Unificado (Simples, Claro, Sem Jargões Técnicos) */}
      <div className="glass-card" style={{ padding: '28px', marginBottom: '28px', borderTop: '3px solid #00d4ff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'rgba(0, 212, 255, 0.12)', color: '#00d4ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', margin: 0 }}>
              Defina o Perfil de Cliente Ideal (ICP)
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Selecione o cargo do tomador de decisão, o segmento de mercado e a região desejada para iniciar a busca.
            </p>
          </div>
        </div>

        <form onSubmit={handleStartMining}>
          {/* Grid de 4 Campos Principais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', alignItems: 'flex-start' }}>
            
            {/* Campo 1: Cargo ou Função com Tags Sugeridas */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Briefcase size={14} color="#00d4ff" />
                <span>Cargo ou Função do Decisor</span>
              </label>
              <input
                type="text"
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="Ex: Diretor, CEO, Head de Vendas..."
                className="form-input"
                required
              />
              {/* Tags Sugeridas */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {SUGGESTED_ROLES.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSelectRoleTag(tag)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: role === tag ? 600 : 400,
                      background: role === tag ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      border: role === tag ? '1px solid rgba(0, 212, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: role === tag ? '#00d4ff' : '#94a3b8',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Campo 2: Setor / Segmento */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={14} color="#00d4ff" />
                <span>Setor / Segmento</span>
              </label>
              <select
                className="form-select"
                value={segment}
                onChange={e => setSegment(e.target.value)}
              >
                {SECTORS.map(sec => (
                  <option key={sec.value} value={sec.value}>{sec.label}</option>
                ))}
              </select>
            </div>

            {/* Campo 3: Estado / Região */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} color="#00d4ff" />
                <span>Estado / Região</span>
              </label>
              <select
                className="form-select"
                value={location}
                onChange={e => setLocation(e.target.value)}
              >
                {LOCATIONS.map(loc => (
                  <option key={loc.value} value={loc.value}>{loc.label}</option>
                ))}
              </select>
            </div>

            {/* Campo 4: Quantidade de Leads */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={14} color="#00d4ff" />
                <span>Volume de Contatos</span>
              </label>
              <select
                className="form-select"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
              >
                {QUANTITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Botão Primário Destacado */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={isMining}
              className="btn btn-primary"
              style={{
                height: '46px',
                padding: '0 28px',
                background: '#00d4ff',
                color: '#0a0a0f',
                fontWeight: 700,
                fontSize: '0.95rem',
                boxShadow: '0 0 24px rgba(0, 212, 255, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              {isMining ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                  <span>Minerando Decisores...</span>
                </>
              ) : (
                <>
                  <span>🚀 Minerar Leads Agora ({quantity} contatos)</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Feedback de Progresso / Sucesso */}
        {miningFeedback && (
          <div className="animate-fade-in" style={{
            marginTop: '20px',
            padding: '14px 18px',
            borderRadius: '8px',
            background: miningFeedback.error ? 'rgba(244, 63, 94, 0.1)' : 'rgba(0, 212, 255, 0.08)',
            border: miningFeedback.error ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(0, 212, 255, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {miningFeedback.success ? (
                <CheckCircle2 size={20} color="#10b981" />
              ) : isMining ? (
                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
              ) : null}
              <span style={{ fontSize: '0.88rem', color: miningFeedback.success ? '#10b981' : '#e2e8f0', fontWeight: miningFeedback.success ? 600 : 400 }}>
                {miningFeedback.stage}
              </span>
            </div>

            {miningFeedback.success && (
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600, padding: '6px 12px' }}>
                +{miningFeedback.count} Novos Leads Adicionados
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. Tabela de Leads Minerados Recentes & CTA Sequencial para o Passo 2 */}
      {minedResults.length > 0 ? (
        <div className="glass-card animate-fade-in" style={{ padding: '24px', borderTop: '3px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', margin: 0 }}>
                Leads Recém-Minerados ({minedResults.length})
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                Contatos prontos para a etapa de validação e blindagem de domínio.
              </p>
            </div>

            {/* Botão de Ação Clara para o Passo 2 */}
            <button
              onClick={() => navigate('/diagnostico')}
              className="btn btn-primary"
              style={{
                background: '#10b981',
                color: '#0a0a0f',
                fontWeight: 700,
                padding: '10px 22px',
                fontSize: '0.9rem',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>🧼 Enviar Leads para Higienização (Passo 2)</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Tabela de Resultados */}
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <table className="data-table">
              <thead style={{ background: 'rgba(0,0,0,0.3)' }}>
                <tr>
                  <th>Nome & Decisor</th>
                  <th>Cargo</th>
                  <th>Empresa & CNPJ</th>
                  <th>Cidade / UF</th>
                  <th>E-mail Corporativo</th>
                  <th>WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                {minedResults.map(lead => (
                  <tr key={lead.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff' }}>
                        {[lead.first_name, lead.last_name].filter(Boolean).join(' ')}
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(0, 212, 255, 0.1)', color: '#00d4ff' }}>
                        {lead.person_info?.title || role || 'Decisor'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CompanyAvatar name={lead.company_name} size={22} />
                        <div>
                          <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{lead.company_name}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>{lead.cnpj}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: '#94a3b8' }}>
                        {lead.city ? `${lead.city} - ${lead.state}` : lead.state}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00d4ff' }}>
                        <Mail size={13} />
                        <span>{lead.email}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
                        <Phone size={13} />
                        <span>{lead.phone}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer CTA */}
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => navigate('/diagnostico')}
              className="btn btn-primary"
              style={{
                background: '#10b981',
                color: '#0a0a0f',
                fontWeight: 700,
                padding: '10px 22px',
                fontSize: '0.9rem',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>🧼 Enviar Leads para Higienização (Passo 2)</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        /* Empty State Informativo */
        <div className="glass-card" style={{ padding: '36px 24px', textAlign: 'center', border: '1px dashed rgba(255, 255, 255, 0.08)' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'rgba(0, 212, 255, 0.06)', color: '#00d4ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            <Database size={26} />
          </div>
          <h3 style={{ fontSize: '1.05rem', color: '#e2e8f0', marginBottom: '6px' }}>
            Pronto para iniciar uma nova mineração
          </h3>
          <p style={{ fontSize: '0.84rem', color: '#64748b', maxWidth: '480px', margin: '0 auto' }}>
            Configure o perfil de decisão no painel acima e clique em <strong>"Minerar Leads Agora"</strong> para coletar contatos de decisores em tempo real.
          </p>
        </div>
      )}
    </div>
  );
}
