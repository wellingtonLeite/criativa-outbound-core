-- ============================================================================
-- CORE — get_send_queue passa a incluir dados enriquecidos da empresa/pessoa
-- ============================================================================
-- A versão original (001_core_schema.sql) só devolvia os campos básicos do
-- lead. Para permitir personalização via IA no n8n (usando indústria,
-- descrição, cargo, senioridade etc.), a fila de envio agora também inclui
-- company_info, person_info, company_name e revenue_estimated.
-- ============================================================================

DROP FUNCTION IF EXISTS get_send_queue(uuid, integer);

CREATE FUNCTION get_send_queue(p_campaign_id uuid, p_limit integer DEFAULT 40)
RETURNS TABLE (
  lead_id         uuid,
  lead_email      text,
  lead_first_name text,
  lead_company    text,
  next_step       integer,
  template_id     uuid,
  subject         text,
  body_html       text,
  company_info    jsonb,
  person_info     jsonb,
  revenue_estimated text
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
    et.body_html,
    l.company_info,
    l.person_info,
    l.revenue_estimated
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

COMMENT ON FUNCTION get_send_queue(uuid, integer) IS 'Fila de envio para o n8n — inclui company_info/person_info para permitir personalização via IA (OpenRouter)';
