-- ============================================================================
-- CORE — Quota de envio restante por campanha (contrato para o n8n)
-- ============================================================================
-- O n8n precisa saber quantos e-mails uma campanha ainda pode enviar hoje
-- antes de chamar get_send_queue(). Esta função conta quantos "sent" já
-- foram registrados hoje para os leads daquela campanha especificamente
-- (get_emails_sent_today, do schema original, é por usuário — não por
-- campanha individual).
-- ============================================================================

CREATE OR REPLACE FUNCTION get_emails_sent_today_for_campaign(p_campaign_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)
  FROM outreach_logs ol
  JOIN leads l ON l.id = ol.lead_id
  WHERE l.campaign_id = p_campaign_id
    AND ol.event_type = 'sent'
    AND ol.created_at >= CURRENT_DATE;
$$;

COMMENT ON FUNCTION get_emails_sent_today_for_campaign(uuid) IS 'Quantos e-mails já foram enviados hoje para esta campanha — usado pelo n8n para calcular a quota restante (daily_send_limit - já_enviado_hoje) antes de chamar get_send_queue()';
