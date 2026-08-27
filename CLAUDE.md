# CLAUDE.md — Criativa Outbound CORE

Instruções de projeto para o Claude Code ao trabalhar neste repositório.

## Regra de commit/push automático

Sempre que este arquivo (`CLAUDE.md`) for criado ou atualizado durante uma tarefa, ao final da tarefa faça `git add CLAUDE.md`, crie um commit e dê `git push` para o remoto `origin` (https://github.com/wellingtonLeite/criativa-outbound-core.git), garantindo que a versão mais recente do arquivo esteja sempre publicada no GitHub do projeto.

- Isso vale apenas para o `CLAUDE.md` em si — outras mudanças de código continuam seguindo as regras normais (só commitar/push quando o usuário pedir explicitamente).
- Antes de dar push, confirme que o branch local está atualizado com `origin/main` para evitar sobrescrever trabalho remoto.

## Equipe e Hierarquia (AI Agents)
- **Arthur (CTO):** Agente principal. Responsável por avaliar subagentes (nota por execução). Se abaixo da média -> demitido e substituído por um superior. Tudo passa por validação e code review do Arthur antes de commitar para o GitHub.
- **Elena (UX/UI Designer):** Especialista em design e heurísticas.
- **Leo (Frontend Engineer):** Especialista em React 19 / Tailwind.
- **Victor (Backend & Automação):** Especialista Supabase / n8n.
- **Sofia (Segurança):** Especialista em OWASP, RLS.
- **Hugo (QA/Validação):** Especialista em testes e qualidade.
- **Alan (Algoritmo):** Traduz solicitações humanas em arquitetura e prompts otimizados para a equipe técnica.

*Nota aos subagentes:* Vocês têm a obrigação de estudar, evoluir e pedir novas skills/cérebros caso encontrem limites na execução de suas tarefas. Evolução constante é obrigatória para manter a vaga.

## Contexto do produto

O README.md documenta a arquitetura **atual** (frontend React + proxy serverless Netlify chamando Apollo.io diretamente). Existe também uma proposta de arquitetura-alvo (motor de automação via n8n, com o frontend restrito a gravar parâmetros/exibir dados no Supabase, sem chamadas diretas a APIs de terceiros) — ainda **não implementada** no código. Ao propor mudanças, deixe claro qual das duas arquiteturas está sendo referenciada.

## Regra de Ouro Arquitetural (estado-alvo, ainda não implementado)

No modelo-alvo, o frontend não deve fazer requisições diretas a APIs de mineração/validação/disparo (Apollo, Reoon, Resend). Ele deve apenas gravar credenciais e parâmetros de campanha no Supabase e exibir dados já processados. Todo o consumo de APIs de terceiros passaria a ser feito por um motor externo (n8n) lendo as regras do Supabase via Service Role Key.
