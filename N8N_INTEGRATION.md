# Integração com n8n

Este documento descreve o contrato de dados que o **CORE** expõe via Supabase para que um workflow no n8n (rodando fora deste repositório) automatize a Etapa 4 do pipeline: **Orquestração e Disparo** de cold e-mails.

O CORE não roda o motor de disparo — ele só garante que os dados e as funções abaixo estejam prontos e corretos para o n8n consumir.

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
Retorna, por lead elegível: `lead_id`, `lead_email`, `lead_first_name`, `lead_company`, `next_step`, `template_id`, `subject`, `body_html`. A função já filtra por `funnel_status = 'in_sequence'`, `validation_status = 'valid'` e respeita o `wait_days` do template — **não envie para leads que não vieram nesta lista**.

### 4. Buscar a credencial Resend do dono da campanha
```
GET /rest/v1/credentials?user_id=eq.<campaign.user_id>&service_name=eq.resend&is_active=eq.true&order=created_at.desc&limit=1
```
Se não encontrar, pular a campanha (o usuário não configurou Resend em Integrações).

### 5. Para cada lead da fila: montar e enviar o e-mail

Substituir as variáveis no `subject` e `body_html`:
- `{{first_name}}` → `lead_first_name`
- `{{company_name}}` → `lead_company`

Enviar via Resend:
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

### 6. Registrar o envio
```
POST /rest/v1/outreach_logs
Body: {
  "lead_id": "<lead_id>",
  "template_id": "<template_id>",
  "event_type": "sent"
}
```

### 7. Atualizar o lead
```
PATCH /rest/v1/leads?id=eq.<lead_id>
Body: {
  "current_step": <next_step>,
  "last_contacted_at": "<timestamp ISO agora>",
  "funnel_status": "in_sequence"
}
```

## Observações importantes

- **Um lead por vez, com tratamento de erro isolado**: se o envio de um lead falhar (Resend fora do ar, e-mail rejeitado), registre o erro e siga para o próximo — não deixe uma falha travar a campanha inteira.
- **Primeiro envio de um lead**: `funnel_status` começa em `scraped` (ou já vem `in_sequence` se você adotar essa convenção) — a função `get_send_queue` já exige `funnel_status = 'in_sequence'` para incluir o lead na fila. Ou seja, **algo precisa mover o lead de `scraped` para `in_sequence` antes do primeiro disparo** — hoje isso não é feito automaticamente por nenhuma tela do CORE. Ao montar o workflow, decida onde essa transição acontece (ex: o próprio n8n marca como `in_sequence` assim que o lead tem `validation_status = 'valid'`, antes de rodar `get_send_queue`).
- **Detecção de resposta/bounce**: fora do escopo deste contrato por enquanto. `outreach_logs.event_type` aceita `'opened' | 'replied' | 'bounced'` além de `'sent'`, e `leads.funnel_status` aceita `'replied' | 'bounced' | 'booked' | 'unsubscribed'` — mas nada aqui popula isso automaticamente. Isso depende de você decidir como capturar respostas (webhook de bounce do Resend cobre bounce; resposta humana normalmente exige uma caixa de entrada dedicada + parsing, ou um serviço de terceiros).
- Todo o schema (tabelas, enums, RLS, `get_send_queue`, `get_emails_sent_today`) está documentado com comentários em `supabase/migrations/001_core_schema.sql`. A RPC `get_emails_sent_today_for_campaign`, usada no passo 2, está em `supabase/migrations/004_send_quota_helper.sql`.
