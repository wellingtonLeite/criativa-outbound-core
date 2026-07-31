-- ============================================================================
-- CORE — RPC para o n8n detectar quando uma campanha terminou de disparar
-- ============================================================================
-- Uma campanha é considerada "concluída" quando não sobra nenhum lead válido
-- em sequência (`in_sequence`) que ainda tenha um próximo step de e-mail
-- configurado em email_templates. Ou seja: todo mundo que podia receber
-- e-mail já recebeu todos os steps disponíveis (não há mais o que enviar,
-- mesmo no futuro, a menos que novos leads/templates sejam adicionados).
-- ============================================================================

CREATE OR REPLACE FUNCTION is_campaign_complete(p_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM leads l
    WHERE l.campaign_id = p_campaign_id
      AND l.funnel_status = 'in_sequence'
      AND l.validation_status = 'valid'
      AND EXISTS (
        SELECT 1 FROM email_templates et
        WHERE et.campaign_id = l.campaign_id
          AND et.step_number = l.current_step + 1
      )
  );
$$;

COMMENT ON FUNCTION is_campaign_complete(uuid) IS 'true quando não há mais nenhum lead válido em sequência com um próximo step de e-mail pendente — usado pelo n8n para marcar a campanha como "completed" automaticamente ao final do disparo';

NOTIFY pgrst, 'reload schema';
