-- ============================================================================
-- CORE — Adiciona telefone e dados enriquecidos (empresa + pessoa) aos leads
-- ============================================================================
-- phone: telefone do contato, quando disponível na origem (Apollo).
-- company_info: objeto completo da empresa devolvido pelo Apollo (site,
--   indústria, porte, descrição, tecnologias, redes sociais, faturamento...).
-- person_info: dados adicionais da pessoa (cargo, senioridade, localização,
--   redes sociais, headline...).
-- Ambos são consumidos pelo n8n para personalizar o conteúdo dos e-mails.
-- ============================================================================

ALTER TABLE leads
  ADD COLUMN phone text,
  ADD COLUMN company_info jsonb,
  ADD COLUMN person_info jsonb;

COMMENT ON COLUMN leads.phone IS 'Telefone do contato (quando disponível na origem)';
COMMENT ON COLUMN leads.company_info IS 'Objeto completo da empresa do lead devolvido pelo Apollo — consumido pelo n8n para personalizar e-mails';
COMMENT ON COLUMN leads.person_info IS 'Dados adicionais da pessoa (cargo, senioridade, localização, redes sociais...) devolvidos pelo Apollo — consumido pelo n8n para personalizar e-mails';
