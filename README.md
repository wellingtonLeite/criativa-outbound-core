# Criativa Outbound CORE

Bem-vindo ao repositório oficial do **Criativa Outbound CORE**. 
Este sistema é uma plataforma modular de prospecção ativa B2B, gestão de contatos (CRM) e construtor de campanhas de outbound. Ele foi arquitetado para ser simples, intuitivo e extremamente poderoso, permitindo a integração direta com motores como Apollo.io, sistemas de disparo (Instantly, Smartlead) e verificadores de e-mail (Reoon).

O design visual da plataforma baseia-se num sistema de *Dark Glassmorphism* puro (sem frameworks pesados de CSS como Tailwind), focado em usabilidade, performance e consistência guiada pelas heurísticas de Nielsen.

---

## 📑 Sumário

1. [Visão Geral](#visão-geral)
2. [Arquitetura e Tecnologias](#arquitetura-e-tecnologias)
3. [Módulos Principais](#módulos-principais)
4. [Como Funciona a Prospecção (Apollo)](#como-funciona-a-prospecção-apollo)
5. [Configuração Inicial do Projeto](#configuração-inicial-do-projeto)
6. [Integrações e Segurança (RLS)](#integrações-e-segurança-rls)
7. [Design System (UX/UI)](#design-system-uxui)

---

## 🔭 Visão Geral

O **CORE** atua como o "cérebro" das operações de Outbound. Em vez de operar várias ferramentas dispersas, o usuário centraliza toda a inteligência e o fluxo de dados aqui:
- **Busca:** Pesquisa de leads em tempo real usando a base do Apollo.io.
- **Armazenamento:** Salvamento de listas e leads extraídos em um banco de dados unificado.
- **Ação:** Criação de réguas de comunicação e campanhas direcionadas.
- **Gestão:** CRM nativo estilo Kanban e Dashboard analítico focado em conversões B2B.

---

## 🛠 Arquitetura e Tecnologias

O sistema segue uma arquitetura moderna focada na rapidez de resposta e estabilidade.

- **Frontend:** React 19 (via Vite)
- **Roteamento:** React Router 7 (Single Page Application)
- **Estilização:** CSS Customizado (`src/index.css`) + Tailwind CSS e componentes estilo shadcn/ui (`src/components/ui/`) para os elementos de formulário.
- **Gráficos:** Recharts (Dashboard).
- **Backend / Database:** [Supabase](https://supabase.com/) (PostgreSQL, Autenticação, Row Level Security).
- **Serverless / Proxy API:** Funções serverless hospedadas no [Netlify Functions](https://www.netlify.com/products/functions/) (ex: `/netlify/functions/apollo.js`). Isso garante que chaves de API nunca vazem para o cliente.
- **Ícones:** Lucide React.

---

## 🧩 Módulos Principais

O sistema foi concebido de forma modular, dividindo responsabilidades claras em cada página:

### 1. Dashboard (`/dashboard`)
Fornece métricas vitais da operação (ex: e-mails enviados, taxa de abertura, oportunidades no CRM) em uma visão gerencial ampla usando gráficos modernos.

### 2. Prospecção (`/prospector`)
É a porta de entrada de novos Leads. Consome diretamente o banco de dados do Apollo.io. 
- **Aba Pessoas:** Busca contatos por cargo, localidade e palavra-chave.
- **Aba Empresas:** Busca dados estruturais de contas corporativas.
- **Minhas Listas (Apollo):** Integração bidirecional que lê suas listas cadastradas no Apollo em tempo real e permite a criação de novas listas diretamente pela plataforma.

### 3. CRM (`/crm`)
Um pipeline visual no modelo Kanban focado no time comercial gerir oportunidades geradas pelas campanhas (MQLs, SQLs, Reuniões Agendadas, Fechamentos).

### 4. Campanhas (`/campaigns`)
Visualiza e ativa campanhas ativas.

### 5. Campaign Builder (`/campaign-builder`)
A principal área de "montagem" da estratégia B2B, permitindo:
- Configurar fluxos de e-mail e LinkedIn.
- Cadenciar tempo entre os envios.
- Vincular públicos (listas).

### 6. Integrações (`/integrations`)
Área de segurança onde as **API Keys** das ferramentas terceiras (Apollo, Reoon, Resend, etc) são cadastradas. Todas as chaves ficam armazenadas em uma tabela segura (`credentials`) protegida por RLS.

---

## 🔌 Como Funciona a Prospecção (Apollo)

Para evitar os problemas comuns de bloqueio de CORS ao tentar acessar o Apollo direto do navegador de um usuário, nós criamos um **Proxy Serverless**:

1. A página `ProspectorPage.jsx` envia a busca com o `Token JWT` do usuário logado para a função serverless (`/netlify/functions/apollo.js`).
2. A função intercepta o pedido, usa o `Token` para se identificar no Supabase do usuário (respeitando o RLS).
3. A função localiza, com segurança, a `Master API Key` do Apollo deste usuário no banco de dados.
4. A função faz o POST/GET silencioso e autenticado para a API do Apollo.io (ex: `api/v1/labels` ou `api/v1/mixed_people/search`) usando o header `x-api-key` — a API do Apollo **não** usa `Authorization: Bearer`, apenas `x-api-key`.
5. A função devolve apenas o resultado limpo para a tela do usuário.

**Regra de Ouro:** Para que a aba de Listas funcione, a Chave do Apollo inserida nas integrações PRECISA ter a opção **"Set as Master Key"** ativada no painel do Apollo (Settings > Integrations > API Keys). Chaves não-master retornam `403` em endpoints restritos; um `Authorization: Bearer` inválido/indevido retorna o erro `Access token is invalid`.

---

## 🚀 Configuração Inicial do Projeto

Siga os passos abaixo para rodar o projeto na sua máquina (Ambiente de Desenvolvimento):

### 1. Clone o repositório
```bash
git clone https://github.com/wellingtonLeite/criativa-outbound-core.git
cd criativa-outbound-core
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis (estas ligam seu sistema ao seu banco de dados Supabase):
```env
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

### 4. Rodar o servidor de desenvolvimento
```bash
npm run dev
```

### 5. Compilar para Produção
```bash
npm run build
```

---

## 🔒 Integrações e Segurança (RLS)

A tabela de credenciais onde as chaves de API são armazenadas utiliza políticas de **Row Level Security (RLS)**. Isso significa que, mesmo que uma chave pública do Supabase vaze, os dados permanecem fechados.

- Ninguém, exceto o dono do `user_id` vinculado à chave, consegue ler o campo `api_key`.
- Funções *Serverless* só conseguem buscar credenciais quando recebem o token de login explícito no cabeçalho (*Header*) `Authorization: Bearer <TOKEN>`.
- Caso haja duplicação de chave no banco, a API sempre privilegia a chave com `is_active = true` ou a data de criação mais recente.

---

## 🎨 Design System (UX/UI)

O sistema abandonou o uso de frameworks engessados para dar lugar a um Design System fluido. 
As diretrizes seguidas pelo time (e por sistemas automatizados) estão no arquivo `.agents/skills/ux-ui-design-system/SKILL.md`.

- **Dark Glassmorphism:** Fundo escuro texturizado com containers levemente translúcidos, criando forte hierarquia (ex: classe `.glass-card`).
- **Nielsen:** Foco em informar estados (carregando spinners, erros descritivos se uma API falhar), botões de cancelamento óbvios e padronização (o que funciona de um jeito no Prospector, funciona igual nas Integrações).
- **Gestalt (Proximidade):** Maior respiro visual (`gap: 24px`, margens altas) visando conforto na leitura para usuários leigos.
- **Tipografia:** Fonte `Inter` (peso geométrico moderno para números em dashboards).

---

> Desenvolvido com inteligência e estratégia para times de vendas de alta performance. 🚀
