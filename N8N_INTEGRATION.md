# Integração com n8n

Este documento descreve o contrato de dados que o **CORE** expõe via Supabase para que um workflow no n8n (rodando fora deste repositório) automatize a Etapa 4 do pipeline: **Orquestração e Disparo** de cold e-mails.

O CORE não roda o motor de disparo — ele só garante que os dados e as funções abaixo estejam prontos e corretos para o n8n consumir.

## Workflow pronto para importar

O arquivo [`n8n/core-dispatch-workflow.json`](n8n/core-dispatch-workflow.json) implementa todo o fluxo descrito abaixo, pronto para importar no n8n (Workflows → Import from File/URL).

**Antes de ativar**, abra o node **"Configuração"** (logo após o gatilho) e edite os 3 valores:
- `supabase_url` — URL do seu projeto Supabase
- `supabase_service_role_key` — a Service Role Key (Supabase → Project Settings → API → `service_role`), **nunca** a anon key
- `resend_from` — o remetente que vai aparecer nos e-mails (ex: `"Sua Empresa <contato@seudominio.com>"`, precisa ser um domínio verificado no Resend)

Esse workflow foi montado com base na documentação oficial da Reoon/Resend/PostgREST/OpenRouter. Já está deployado e rodando (n8n self-hosted via Coolify, projeto isolado no mesmo servidor do Criativa ONE) — o node "Configuração" da instância em produção já está preenchido; se importar em outra instância, revise o resultado de cada node no canvas antes de ativar.

## Autenticação

Todas as chamadas ao Supabase devem usar a **Service Role Key** do projeto (nunca a `anon key`), para bypassar o RLS e ter acesso a todas as campanhas de todos os usuários:

```
Base URL: https://<project-ref>.supabase.co/rest/v1
Headers:
  apikey: <SUPABASE_SERVICE_ROLE_KEY>
  Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
  Content-Type: application/json
```

## Fluxo do workflow (por execução do CRON)

### 1. Buscar campanhas ativas
```
GET /rest/v1/campaigns?status=eq.active
```

### 2. Para cada campanha, calcular a quota restante do dia
```
POST /rest/v1/rpc/get_emails_sent_today_for_campaign
Body: { "p_campaign_id": "<campaign.id>" }
```
Quota restante = `campaign.daily_send_limit - resultado_da_rpc`. Se `<= 0`, pular esta campanha.

### 3. Buscar a fila de envio elegível
```
POST /rest/v1/rpc/get_send_queue
Body: { "p_campaign_id": "<campaign.id>", "p_limit": <quota_restante> }
```
Retorna, por lead elegível: `lead_id`, `lead_email`, `lead_first_name`, `lead_company`, `next_step`, `template_id`, `subject`, `body_html`, `company_info`, `person_info`, `revenue_estimated` (os dois primeiros são jsonb enriquecidos pelo Apollo — usados na personalização via IA do passo 5.5). A função já filtra por `funnel_status = 'in_sequence'`, `validation_status = 'valid'` e respeita o `wait_days` do template — **não envie para leads que não vieram nesta lista**. Requer `supabase/migrations/005_send_queue_include_enrichment.sql`.

### 4. Buscar as credenciais do dono da campanha
```
GET /rest/v1/credentials?user_id=eq.<campaign.user_id>&service_name=eq.resend&is_active=eq.true&order=created_at.desc&limit=1
GET /rest/v1/credentials?user_id=eq.<campaign.user_id>&service_name=eq.openrouter&is_active=eq.true&order=created_at.desc&limit=1
```
Resend é obrigatório — se não encontrar, pular a campanha. OpenRouter é opcional — se não encontrar, o e-mail usa só a substituição literal do template (passo 5).

### 5. Para cada lead da fila: montar o e-mail base (fallback)

Substituir as variáveis no `subject` e `body_html`:
- `{{first_name}}` → `lead_first_name`
- `{{company_name}}` → `lead_company`

### 5.5. Se houver credencial OpenRouter: personalizar via IA (com fallback)

Monta um prompt com `lead_first_name`, `lead_company`, `company_info` (indústria, descrição, palavras-chave, porte, ano de fundação, localização) e `person_info` (cargo, headline, senioridade) — um briefing de copywriting completo (assunto curto e específico, primeira frase provando pesquisa real sobre a empresa, sem jargão corporativo, sem pedir reunião direto, 60-90 palavras). Veja o texto completo do prompt no node "Montar Prompt IA" do workflow.

**Implementação com nodes nativos do n8n (recomendada)**, em vez de um HTTP Request cru:
- **OpenRouter Chat Model** (`@n8n/n8n-nodes-langchain.lmChatOpenRouter`) — usa uma credencial `openRouterApi` própria do n8n (Settings → Credentials → New → OpenRouter), não a chave embutida em código. Modelo padrão: `google/gemma-4-31b-it:free` (gratuito — confira modelos disponíveis em `GET https://openrouter.ai/api/v1/models`, filtrando por `:free`).
- **Structured Output Parser** (`@n8n/n8n-nodes-langchain.outputParserStructured`) — força a IA a devolver `{"subject": "...", "html": "..."}` já estruturado, sem precisar fazer parse manual de texto.
- **Basic LLM Chain** (`@n8n/n8n-nodes-langchain.chainLlm`) — conecta o prompt (`={{ $json.ai_prompt }}`) ao Chat Model e ao Output Parser.
- Um node **Wait** de 5s antes da chamada evita 429 (rate limit) — o tier gratuito da OpenRouter permite 20 req/minuto e 50/dia sem créditos comprados (1000/dia com ao menos US$10 em créditos).
- Se a IA falhar (erro, parse inválido, rate limit) o Code node seguinte usa o e-mail do passo 5 sem parar a execução.

**Após importar o workflow em uma nova instância do n8n**: a credencial OpenRouter não é portada (por segurança, nunca é exportada em texto). Crie uma nova em Settings → Credentials → New → OpenRouter, cole a chave, e reselecione essa credencial no node "OpenRouter Chat Model".

### 6. Enviar via Resend
```
POST https://api.resend.com/emails
Headers:
  Authorization: Bearer <resend_api_key>
  Content-Type: application/json
Body:
  {
    "from": "<remetente configurado>",
    "to": ["<lead_email>"],
    "subject": "<subject com variáveis substituídas>",
    "html": "<body_html com variáveis substituídas>"
  }
```

### 7. Registrar o envio
```
POST /rest/v1/outreach_logs
Body: {
  "lead_id": "<lead_id>",
  "template_id": "<template_id>",
  "event_type": "sent"
}
```

### 8. Atualizar o lead
```
PATCH /rest/v1/leads?id=eq.<lead_id>
Body: {
  "current_step": <next_step>,
  "last_contacted_at": "<timestamp ISO agora>",
  "funnel_status": "in_sequence"
}
```

## Observações importantes

- **Um lead por vez, com tratamento de erro isolado**: se o envio de um lead falhar (Resend fora do ar, e-mail rejeitado), registre o erro e siga para o próximo — não deixe uma falha travar a campanha inteira. O workflow pronto já marca os nodes de envio/log/atualização com "continuar em caso de erro".
- **Transição `scraped` → `in_sequence`**: resolvida no próprio CORE — assim que um lead novo é validado pela Reoon e o resultado é `valid`, o frontend já grava `funnel_status: 'in_sequence'` na hora da criação (`src/pages/CampaignBuilderPage.jsx`, funções `addLeadFromSearchResult` e `handleImportList`). Leads que ficaram `pending` (falha de validação) podem ser revalidados manualmente na aba "Leads Adicionados" da campanha ("Revalidar Pendentes") — se o resultado virar `valid`, a mesma transição acontece. O n8n só precisa consumir `get_send_queue`, que já exige `funnel_status = 'in_sequence'`.
- **Detecção de resposta/bounce**: fora do escopo deste contrato por enquanto. `outreach_logs.event_type` aceita `'opened' | 'replied' | 'bounced'` além de `'sent'`, e `leads.funnel_status` aceita `'replied' | 'bounced' | 'booked' | 'unsubscribed'` — mas nada aqui popula isso automaticamente. Isso depende de você decidir como capturar respostas (webhook de bounce do Resend cobre bounce; resposta humana normalmente exige uma caixa de entrada dedicada + parsing, ou um serviço de terceiros).
- Todo o schema (tabelas, enums, RLS, `get_send_queue`, `get_emails_sent_today`) está documentado com comentários em `supabase/migrations/001_core_schema.sql`. A RPC `get_emails_sent_today_for_campaign`, usada no passo 2, está em `supabase/migrations/004_send_quota_helper.sql`. A versão de `get_send_queue` que inclui `company_info`/`person_info` (passo 3) está em `supabase/migrations/005_send_queue_include_enrichment.sql`.
- **OpenRouter é opcional**: cadastre em Integrações (`service_name: openrouter`) só se quiser e-mails personalizados por IA. Sem essa credencial, o workflow funciona normalmente usando só a substituição literal do template (passo 5).
