-- ============================================================================
-- CORE — Sobrenome do lead + dump bruto completo dos dados do Apollo
-- ============================================================================
-- last_name: sobrenome do contato (antes só tínhamos first_name).
-- raw_data: objeto bruto e completo devolvido pelo Apollo para este contato
--   (contact/organization/account inteiros, sem cherry-pick de campos) —
--   garante que nenhuma informação coletada pela Apollo seja descartada,
--   mesmo que o mapeamento manual da aplicação não preveja aquele campo.
-- ============================================================================

ALTER TABLE leads
  ADD COLUMN last_name text,
  ADD COLUMN raw_data jsonb;

COMMENT ON COLUMN leads.last_name IS 'Sobrenome do contato';
COMMENT ON COLUMN leads.raw_data IS 'Objeto bruto e completo devolvido pelo Apollo (contact/organization/account) — nada é descartado aqui, mesmo que não exista mapeamento manual para o campo';
