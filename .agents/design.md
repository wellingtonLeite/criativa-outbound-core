# Design System & UX Guidelines (CORE)

## 1. Princípios de Usabilidade (UX)
- **Minimalismo Funcional:** A interface deve ter apenas o necessário na tela. Funcionalidades secundárias devem ser agrupadas em menus ou abas.
- **Feedback Imediato:** Qualquer ação do usuário (salvar, buscar, excluir) deve ter feedback visual claro (loading states, toasts, disable buttons).
- **Hierarquia Visual:** Use peso de fontes, cores e espaçamento para guiar os olhos do usuário para a ação principal.
- **Espaçamento Generoso:** Elementos não podem ficar colados. Utilize sistema de grid e flexbox com gaps bem definidos.

## 2. Tipografia (Inter)
A fonte principal do sistema é a **Inter**.
- `Heading 1`: 30px (text-3xl), Font Bold, para títulos de páginas.
- `Heading 2`: 20px (text-xl), Font SemiBold, para títulos de cards e seções.
- `Body Text`: 14px (text-sm), Font Normal, cor `text-gray-300`, para leitura geral.
- `Small Text`: 12px (text-xs), Font Normal, cor `text-gray-400`, para labels e dicas.

## 3. Paleta de Cores e Estilo
O tema é **Dark Glassmorphism** focado em contrastes sutis:
- **Background Principal:** `#0a0a0f`
- **Background Cards (Glass):** `bg-white/5` com borda `border-white/10`
- **Ação Primária (Botões):** Azul sólido `bg-blue-600` hover `bg-blue-700`
- **Ação Secundária:** Transparente `bg-white/5` hover `bg-white/10`
- **Status Positivo:** Verde `text-emerald-400`
- **Status Negativo:** Vermelho `text-rose-500`

## 4. Arquitetura Modular (Orientação a Objetos no Frontend)
Para evitar arquivos gigantescos, o sistema deve adotar uma estrutura modular baseada em composição (Single Responsibility Principle):

Padrão de Pastas de Funcionalidade (Feature-Based Architecture):
- Cada funcionalidade deve ter sua pasta contendo seus próprios componentes, hooks e utils.
- Componentes grandes devem ser subdivididos em sub-componentes especialistas.
