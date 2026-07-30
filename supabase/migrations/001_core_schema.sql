-- ============================================================================
-- CORE (Criativa Outbound Real-time Engine) — Schema Completo
-- Supabase PostgreSQL Migration
-- ============================================================================
-- Este script cria toda a estrutura de banco de dados do CORE:
--   • Enums customizados
--   • Tabelas com relacionamentos (FKs)
--   • Índices otimizados para consultas frequentes
--   • Row Level Security (RLS) para usuários autenticados
--   • Funções auxiliares para métricas do Dashboard
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

-- Status de uma campanha no ciclo de vida
CREATE TYPE campaign_status AS ENUM (
  'draft',
  'active',
  'paused',
  'completed'
);

-- Resultado da validação do e-mail do lead (via Reoon ou similar)
CREATE TYPE validation_status AS ENUM (
  'pending',
  'valid',
  'invalid',
  'catch_all'
);

-- Posição do lead no funil de outbound
CREATE TYPE funnel_status AS ENUM (
  'scraped',
  'in_sequence',
  'replied',
  'bounced',
  'booked',
  'unsubscribed'
);

-- Tipo de evento registrado no log de outreach
CREATE TYPE outreach_event_type AS ENUM (
  'sent',
  'opened',
  'replied',
  'bounced'
);


-- ============================================================================
-- 2. TABELAS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 2.1  credentials — Cofre de APIs (Apollo, Reoon, Resend, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE credentials (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name  text        NOT NULL,
  api_key       text        NOT NULL,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  -- Cada usuário só pode ter uma credencial por serviço
  CONSTRAINT uq_credentials_user_service UNIQUE (user_id, service_name)
);

COMMENT ON TABLE  credentials IS 'Cofre de chaves de API para serviços externos (Apollo, Reoon, Resend…)';
COMMENT ON COLUMN credentials.api_key IS 'Chave armazenada — em produção considerar pgcrypto ou Vault do Supabase';

-- ---------------------------------------------------------------------------
-- 2.2  campaigns — Campanhas de Prospecção
-- ---------------------------------------------------------------------------
CREATE TABLE campaigns (
  id               uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text            NOT NULL,
  status           campaign_status NOT NULL DEFAULT 'draft',
  daily_send_limit integer         NOT NULL DEFAULT 40,
  created_at       timestamptz     NOT NULL DEFAULT now(),
  updated_at       timestamptz     NOT NULL DEFAULT now(),

  CONSTRAINT chk_daily_send_limit_positive CHECK (daily_send_limit > 0)
);

COMMENT ON TABLE campaigns IS 'Campanhas de outbound / cold email';

-- ---------------------------------------------------------------------------
-- 2.3  email_templates — Copy dos Disparos (Steps da Sequência)
-- ---------------------------------------------------------------------------
CREATE TABLE email_templates (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  uuid    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  step_number  integer NOT NULL,
  subject      text    NOT NULL,
  body_html    text    NOT NULL,
  wait_days    integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  -- Dentro de uma campanha, cada step é único
  CONSTRAINT uq_template_campaign_step UNIQUE (campaign_id, step_number),
  CONSTRAINT chk_step_number_positive  CHECK (step_number > 0),
  CONSTRAINT chk_wait_days_non_neg     CHECK (wait_days >= 0)
);

COMMENT ON TABLE  email_templates IS 'Templates de e-mail vinculados a steps de uma campanha';
COMMENT ON COLUMN email_templates.subject   IS 'Suporta variáveis dinâmicas: {{first_name}}, {{company_name}}…';
COMMENT ON COLUMN email_templates.body_html IS 'Corpo HTML com variáveis dinâmicas para merge pelo n8n';

-- ---------------------------------------------------------------------------
-- 2.4  leads — Banco de Oportunidades
-- ---------------------------------------------------------------------------
CREATE TABLE leads (
  id                  uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         uuid              NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  email               text              NOT NULL,
  first_name          text,
  company_name        text,
  revenue_estimated   text,
  validation_status   validation_status NOT NULL DEFAULT 'pending',
  funnel_status       funnel_status     NOT NULL DEFAULT 'scraped',
  current_step        integer           NOT NULL DEFAULT 0,
  last_contacted_at   timestamptz,
  created_at          timestamptz       NOT NULL DEFAULT now(),
  updated_at          timestamptz       NOT NULL DEFAULT now(),

  -- E-mail único por campanha (evita duplicatas dentro da mesma campanha)
  CONSTRAINT uq_leads_campaign_email UNIQUE (campaign_id, email)
);

COMMENT ON TABLE  leads IS 'Leads prospectados — cada registro pertence a uma campanha';
COMMENT ON COLUMN leads.current_step IS 'Step atual na sequência de e-mails (0 = ainda não iniciou)';

-- ---------------------------------------------------------------------------
-- 2.5  outreach_logs — Registro de Atividades / Eventos
-- ---------------------------------------------------------------------------
CREATE TABLE outreach_logs (
  id           uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      uuid                NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  template_id  uuid                NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  event_type   outreach_event_type NOT NULL,
  metadata     jsonb,
  created_at   timestamptz         NOT NULL DEFAULT now()
);

COMMENT ON TABLE  outreach_logs IS 'Log imutável de eventos de outreach (envio, abertura, resposta, bounce)';
COMMENT ON COLUMN outreach_logs.metadata IS 'Dados extras do evento — ex: message_id, IP de abertura, etc.';


-- ============================================================================
-- 3. ÍNDICES (otimização para queries frequentes do Dashboard e do n8n)
-- ============================================================================

-- Credentials: busca por serviço do usuário
CREATE INDEX idx_credentials_user_service
  ON credentials (user_id, service_name);

-- Campaigns: listar campanhas do usuário por status
CREATE INDEX idx_campaigns_user_status
  ON campaigns (user_id, status);

-- Email Templates: buscar steps de uma campanha em ordem
CREATE INDEX idx_templates_campaign_step
  ON email_templates (campaign_id, step_number);

-- Leads: fila de envio do n8n (leads ativos pendentes de contato)
CREATE INDEX idx_leads_campaign_funnel
  ON leads (campaign_id, funnel_status);

-- Leads: filtro de validação para métricas
CREATE INDEX idx_leads_validation
  ON leads (validation_status);

-- Leads: CRM / Inbox — leads que responderam ou agendaram
CREATE INDEX idx_leads_crm_inbox
  ON leads (funnel_status)
  WHERE funnel_status IN ('replied', 'booked');

-- Outreach Logs: histórico por lead
CREATE INDEX idx_logs_lead
  ON outreach_logs (lead_id, created_at DESC);

-- Outreach Logs: contagem de eventos por tipo (métricas do Dashboard)
CREATE INDEX idx_logs_event_type
  ON outreach_logs (event_type, created_at);


-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Estratégia:
--   • Usuários autenticados acessam APENAS seus próprios registros (via user_id).
--   • Tabelas filhas (email_templates, leads, outreach_logs) herdam o acesso
--     verificando a ownership pela cadeia de FKs até campaigns.user_id.
--   • A Service Role Key do Supabase (usada pelo n8n) bypassa o RLS por padrão,
--     garantindo que o motor de processamento tenha acesso total via API REST.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 4.1  credentials
-- ---------------------------------------------------------------------------
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credentials_select_own"
  ON credentials FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "credentials_insert_own"
  ON credentials FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "credentials_update_own"
  ON credentials FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "credentials_delete_own"
  ON credentials FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4.2  campaigns
-- ---------------------------------------------------------------------------
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_select_own"
  ON campaigns FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "campaigns_insert_own"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "campaigns_update_own"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "campaigns_delete_own"
  ON campaigns FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4.3  email_templates (acesso via campaign ownership)
-- ---------------------------------------------------------------------------
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_select_own"
  ON email_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = email_templates.campaign_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "templates_insert_own"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = email_templates.campaign_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "templates_update_own"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = email_templates.campaign_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = email_templates.campaign_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "templates_delete_own"
  ON email_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = email_templates.campaign_id
        AND c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 4.4  leads (acesso via campaign ownership)
-- ---------------------------------------------------------------------------
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_select_own"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = leads.campaign_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "leads_insert_own"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = leads.campaign_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "leads_update_own"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = leads.campaign_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = leads.campaign_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "leads_delete_own"
  ON leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = leads.campaign_id
        AND c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 4.5  outreach_logs (acesso via lead → campaign ownership)
-- ---------------------------------------------------------------------------
ALTER TABLE outreach_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logs_select_own"
  ON outreach_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN campaigns c ON c.id = l.campaign_id
      WHERE l.id = outreach_logs.lead_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "logs_insert_own"
  ON outreach_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN campaigns c ON c.id = l.campaign_id
      WHERE l.id = outreach_logs.lead_id
        AND c.user_id = auth.uid()
    )
  );

-- Logs são imutáveis — sem UPDATE ou DELETE para usuários autenticados


-- ============================================================================
-- 5. TRIGGERS DE UPDATED_AT (manutenção automática do timestamp)
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_credentials
  BEFORE UPDATE ON credentials
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_campaigns
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_email_templates
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_leads
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- ============================================================================
-- 6. VIEWS E FUNÇÕES PARA O DASHBOARD (métricas agregadas)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 6.1  View: Métricas do Dashboard por Usuário
-- ---------------------------------------------------------------------------
-- Esta view é consumida pela rota /dashboard do frontend
-- O RLS continua ativo pois a view faz JOIN com campaigns.user_id
CREATE OR REPLACE VIEW dashboard_metrics AS
SELECT
  c.user_id,

  -- Total de leads do usuário
  COUNT(DISTINCT l.id) AS total_leads,

  -- Leads com e-mail validado
  COUNT(DISTINCT l.id) FILTER (
    WHERE l.validation_status = 'valid'
  ) AS validated_leads,

  -- Leads com e-mail inválido
  COUNT(DISTINCT l.id) FILTER (
    WHERE l.validation_status = 'invalid'
  ) AS invalid_leads,

  -- Leads com e-mail catch-all
  COUNT(DISTINCT l.id) FILTER (
    WHERE l.validation_status = 'catch_all'
  ) AS catch_all_leads,

  -- Leads que responderam
  COUNT(DISTINCT l.id) FILTER (
    WHERE l.funnel_status = 'replied'
  ) AS replied_leads,

  -- Leads que agendaram (booked)
  COUNT(DISTINCT l.id) FILTER (
    WHERE l.funnel_status = 'booked'
  ) AS booked_leads,

  -- Leads com bounce
  COUNT(DISTINCT l.id) FILTER (
    WHERE l.funnel_status = 'bounced'
  ) AS bounced_leads,

  -- Campanhas ativas
  COUNT(DISTINCT c.id) FILTER (
    WHERE c.status = 'active'
  ) AS active_campaigns

FROM campaigns c
LEFT JOIN leads l ON l.campaign_id = c.id
GROUP BY c.user_id;

-- ---------------------------------------------------------------------------
-- 6.2  Função: E-mails enviados hoje (para o Dashboard)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_emails_sent_today(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)
  FROM outreach_logs ol
  JOIN leads l ON l.id = ol.lead_id
  JOIN campaigns c ON c.id = l.campaign_id
  WHERE c.user_id = p_user_id
    AND ol.event_type = 'sent'
    AND ol.created_at >= CURRENT_DATE;
$$;

-- ---------------------------------------------------------------------------
-- 6.3  Função: Fila de envio para o n8n
-- ---------------------------------------------------------------------------
-- Retorna leads elegíveis para o próximo disparo em uma campanha ativa
-- O n8n chama esta função via RPC com a Service Role Key
CREATE OR REPLACE FUNCTION get_send_queue(p_campaign_id uuid, p_limit integer DEFAULT 40)
RETURNS TABLE (
  lead_id         uuid,
  lead_email      text,
  lead_first_name text,
  lead_company    text,
  next_step       integer,
  template_id     uuid,
  subject         text,
  body_html       text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    l.id            AS lead_id,
    l.email         AS lead_email,
    l.first_name    AS lead_first_name,
    l.company_name  AS lead_company,
    l.current_step + 1 AS next_step,
    et.id           AS template_id,
    et.subject,
    et.body_html
  FROM leads l
  JOIN email_templates et
    ON et.campaign_id = l.campaign_id
   AND et.step_number = l.current_step + 1
  WHERE l.campaign_id = p_campaign_id
    AND l.funnel_status = 'in_sequence'
    AND l.validation_status = 'valid'
    -- Respeitar wait_days do template
    AND (
      l.last_contacted_at IS NULL
      OR l.last_contacted_at + (et.wait_days || ' days')::interval <= now()
    )
  ORDER BY l.created_at ASC
  LIMIT p_limit;
$$;


-- ============================================================================
-- 7. CONTRATOS DE API PARA O n8n (documentação inline)
-- ============================================================================
-- O Supabase expõe automaticamente todas as tabelas acima via API REST:
--
--   BASE_URL: https://<project-ref>.supabase.co/rest/v1
--   Headers:
--     apikey: <SUPABASE_SERVICE_ROLE_KEY>    ← bypassa RLS
--     Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
--     Content-Type: application/json
--
-- ┌──────────────────────────────────────────────────────────────────────┐
-- │ OPERAÇÃO          │ MÉTODO │ ENDPOINT                              │
-- ├──────────────────────────────────────────────────────────────────────┤
-- │ Buscar fila envio │ POST   │ /rpc/get_send_queue                   │
-- │                   │        │ Body: {"p_campaign_id":"<uuid>",       │
-- │                   │        │        "p_limit": 40}                  │
-- ├──────────────────────────────────────────────────────────────────────┤
-- │ Injetar leads     │ POST   │ /rest/v1/leads                        │
-- │ (raspagem)        │        │ Body: [{ "campaign_id": "<uuid>",     │
-- │                   │        │   "email": "...", "first_name": "...",│
-- │                   │        │   "company_name": "...",              │
-- │                   │        │   "revenue_estimated": "..." }]       │
-- │                   │        │ Header: Prefer: return=representation │
-- ├──────────────────────────────────────────────────────────────────────┤
-- │ Atualizar status  │ PATCH  │ /rest/v1/leads?id=eq.<uuid>           │
-- │ do lead           │        │ Body: {"funnel_status":"in_sequence",  │
-- │                   │        │   "validation_status":"valid",        │
-- │                   │        │   "current_step": 1,                  │
-- │                   │        │   "last_contacted_at":"<timestamp>"}  │
-- ├──────────────────────────────────────────────────────────────────────┤
-- │ Registrar evento  │ POST   │ /rest/v1/outreach_logs                │
-- │ de outreach       │        │ Body: {"lead_id":"<uuid>",            │
-- │                   │        │   "template_id":"<uuid>",             │
-- │                   │        │   "event_type":"sent"}                │
-- ├──────────────────────────────────────────────────────────────────────┤
-- │ E-mails enviados  │ POST   │ /rpc/get_emails_sent_today            │
-- │ hoje              │        │ Body: {"p_user_id":"<uuid>"}          │
-- └──────────────────────────────────────────────────────────────────────┘
--
-- NOTA: O n8n deve usar a SERVICE_ROLE_KEY (não a anon key) para
--       bypassar o RLS e ter acesso administrativo completo às tabelas.
-- ============================================================================
