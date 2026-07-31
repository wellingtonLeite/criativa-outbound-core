-- ============================================================================
-- CORE — Estimativa de créditos Apollo (a API não expõe saldo real nem
-- data de renovação, só limites de chamada — confirmado em testes manuais).
-- ============================================================================
-- Como a Apollo não devolve o saldo de créditos via API, guardamos uma
-- calibração manual (o usuário copia o número que vê no painel da Apollo)
-- e o sistema estima o consumo a partir daí, contando quantos leads com
-- e-mail foram trazidos pela Apollo desde a última calibração.
-- ============================================================================

ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS credit_balance integer,
  ADD COLUMN IF NOT EXISTS credit_balance_as_of timestamptz,
  ADD COLUMN IF NOT EXISTS credit_renews_at timestamptz;

COMMENT ON COLUMN credentials.credit_balance IS 'Saldo de créditos informado manualmente pelo usuário (copiado do painel da Apollo) — só usado quando service_name = apollo';
COMMENT ON COLUMN credentials.credit_balance_as_of IS 'Quando o saldo acima foi informado — usado como ponto de partida para estimar o consumo desde então';
COMMENT ON COLUMN credentials.credit_renews_at IS 'Data de renovação informada manualmente pelo usuário (copiada do painel da Apollo)';

NOTIFY pgrst, 'reload schema';
