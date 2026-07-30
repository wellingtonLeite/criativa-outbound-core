---
name: ux-ui-design-system
description: >
  Skill de Design System e UX/UI para o projeto CORE. Ativa automaticamente em
  qualquer criação ou edição de componentes, páginas e estilos CSS. Aplica
  as 10 heurísticas de Nielsen, princípios de Gestalt, tipografia Inter,
  e o padrão visual Dark Glassmorphism do CORE.
---

# UX/UI Design System — CORE

## Princípios Fundamentais de Usabilidade

Antes de escrever qualquer linha de código de interface, aplique estes princípios:

### 1. As 10 Heurísticas de Nielsen (Obrigatório)
1. **Visibilidade do status do sistema** — O usuário deve saber o que está acontecendo (loading states, feedback de sucesso/erro).
2. **Compatibilidade com o mundo real** — Use linguagem simples. "Salvar", não "Persistir". "Buscar", não "Query".
3. **Controle e liberdade do usuário** — Sempre ofereça "Voltar" e "Cancelar". Nunca prenda o usuário.
4. **Consistência e padrões** — Todos os botões primários são azuis. Todos os destrutivos são vermelhos. Sem exceções.
5. **Prevenção de erros** — Desabilite botões quando campos obrigatórios estão vazios. Use placeholders descritivos.
6. **Reconhecimento, não lembrança** — Labels visíveis em todos os inputs. Nunca dependa apenas de placeholders.
7. **Flexibilidade e eficiência** — Atalhos de teclado (Enter para adicionar tags, Escape para fechar modais).
8. **Design estético e minimalista** — Elimine informações irrelevantes. Cada pixel deve servir a um propósito.
9. **Ajudar a reconhecer e recuperar erros** — Mensagens de erro claras e específicas.
10. **Ajuda e documentação** — Textos auxiliares abaixo de campos complexos.

### 2. Princípios de Gestalt para Layout
- **Proximidade:** Agrupar elementos relacionados com espaçamento menor que 16px entre eles, e espaçamento maior (24-32px) entre grupos diferentes.
- **Alinhamento:** Todos os elementos devem seguir uma grade. Nunca usar tamanhos ou posições arbitrárias.
- **Hierarquia Visual:** O olho do usuário deve percorrer a tela de cima-esquerda para baixo-direita, encontrando as informações mais importantes primeiro.

---

## Tokens de Design

### Tipografia (Font: Inter)
| Elemento       | Tamanho  | Peso     | Cor               |
|----------------|----------|----------|--------------------|
| Page Title     | 1.75rem  | 700 Bold | #e2e8f0 (text)     |
| Section Title  | 1.125rem | 600 Semi | #e2e8f0 (text)     |
| Body Text      | 0.875rem | 400 Reg  | #94a3b8 (secondary)|
| Small/Help     | 0.75rem  | 400 Reg  | #64748b (muted)    |
| Button Text    | 0.875rem | 500 Med  | Depende do botão   |

### Espaçamento (Spacing Scale - 4px base)
| Token  | Value | Uso                        |
|--------|-------|----------------------------|
| xs     | 4px   | Gaps internos mínimos      |
| sm     | 8px   | Espaço entre ícone e texto |
| md     | 16px  | Padding interno de cards   |
| lg     | 24px  | Padding de seções          |
| xl     | 32px  | Margem entre seções        |
| 2xl    | 48px  | Padding do main-content    |

### Cores
| Variável         | Hex       | Uso                          |
|------------------|-----------|------------------------------|
| --color-bg       | #0a0a0f   | Fundo principal              |
| --color-surface  | rgba(255,255,255,0.03) | Cards           |
| --color-border   | rgba(255,255,255,0.06) | Bordas          |
| --color-primary  | #00d4ff   | Ações primárias              |
| --color-blue     | #3b82f6   | Botões de ação               |
| --color-violet   | #7c3aed   | Campanhas / Sequências       |
| --color-emerald  | #10b981   | Sucesso / Ativo              |
| --color-amber    | #f59e0b   | Alerta / Pausado             |
| --color-rose     | #f43f5e   | Erro / Destrutivo            |

### Border Radius
| Token      | Value | Uso                  |
|------------|-------|----------------------|
| radius-sm  | 6px   | Badges, tags         |
| radius-md  | 8px   | Inputs, botões       |
| radius-lg  | 12px  | Cards, seções        |
| radius-xl  | 16px  | Modais               |

---

## Regras de Componentes

### Botões
- Primário: Fundo azul sólido (`#3b82f6`), texto branco. Hover = escurece.
- Secundário: Fundo transparente, borda sutil, texto claro. Hover = fundo sutil.
- Destrutivo: Fundo vermelho translúcido, texto vermelho. Hover = mais opaco.
- Todos os botões devem ter `min-height: 40px` e `padding: 10px 20px`.
- Ícones dentro de botões: 16-18px, sempre à esquerda do texto.

### Inputs
- Fundo: `rgba(255,255,255,0.05)`. Borda: `rgba(255,255,255,0.06)`.
- Focus: borda `#00d4ff` com `box-shadow: 0 0 0 3px rgba(0,212,255,0.1)`.
- Label SEMPRE visível acima do input (nunca usar apenas placeholder).
- Min height: 40px. Padding: 10px 14px.

### Cards de Seção
- Usar classe `.section-card` para cards de conteúdo.
- Header do card separado por borda inferior sutil.
- Accent colorido no topo (`border-top: 3px solid`) para diferenciar seções.

### Formulários
- Grid de 2 colunas em telas > 768px (`display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px`).
- Coluna única em mobile.
- Labels com cor `#94a3b8`, tamanho `0.875rem`, peso `500`.

### Modais
- Overlay escuro com blur (`rgba(0,0,0,0.7)` + `backdrop-filter: blur(4px)`).
- Card do modal com fundo `#16162a`, padding `32px`, max-width `560px`.
- Header e footer separados por borda sutil.

---

## Regras Anti-Padrões (NUNCA FAZER)
1. ❌ NUNCA misturar classes Tailwind inline com CSS custom no mesmo elemento.
2. ❌ NUNCA usar `@import "tailwindcss"` junto com CSS vanilla - escolha UM.
3. ❌ NUNCA deixar um input sem label visível.
4. ❌ NUNCA usar cores de ação sem contraste suficiente (mínimo 4.5:1).
5. ❌ NUNCA criar páginas sem feedback de carregamento (spinner/skeleton).
6. ❌ NUNCA deixar botões sem estado disabled quando necessário.
7. ❌ NUNCA usar fontes do sistema (usar Inter obrigatoriamente).
