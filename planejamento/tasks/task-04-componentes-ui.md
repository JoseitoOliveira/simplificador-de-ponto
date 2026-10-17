# Task 04: Componentes de Interface, Renderização da Tabela e Clipboard

## 1. Identificação e Visão Geral
- **ID da Task**: `TASK-04`
- **Título**: Módulo de Renderização de UI, Gerenciamento de Tabela e Cópia para o Clipboard (`ui.js`)
- **Status**: Concluída
- **Módulos Afetados**: `js/ui.js`
- **Potencial de Paralelização**: Alto (baseia-se no layout da `TASK-01` e nos contratos de dados de saída da `TASK-03`).

## 2. Objetivo da Atividade
Desenvolver o módulo `js/ui.js` responsável por manipular o DOM da aplicação: renderizar os cards de métricas de impacto, montar as linhas da tabela de lançamentos, aplicar o filtro dinâmico de visualização ("Apenas Exceções" vs "Todas as Datas") e fornecer a funcionalidade de cópia ágil para a área de transferência com feedback visual instantâneo.

## 3. Entregáveis Esperados
1. Arquivo `js/ui.js` exportando as seguintes funções:
   - `function renderSummaryCards(summaryData, periodInfo): void`
   - `function renderTable(optimizedDays, filterMode): void`
   - `function setupClipboardCopy(buttonElement, textToCopy): void`
   - `function showNotification(message, type): void`
   - `function updateSliderDisplays(config): void`
2. Renderização dos Cards de Resumo e Métricas:
   - Exibição destacada do período (ex: `16 set. 2026 - 15 out. 2026`).
   - Saldo Total do Período com formatação visual intuitiva (`+01h 43m` em verde / `-00h 45m` em vermelho).
   - Card comparativo com porcentagem de redução de trabalho: "De 18 dias manuais para apenas 5 exceções (-72% cliques)".
3. Renderização da Tabela Dinâmica:
   - Cada linha deve conter:
     - Data formatada com dia da semana (ex: `qui., 17 set. 2026`).
     - Horários originais registrados no PDF.
     - Saldo original do dia.
     - **Ação sugerida** com destaque colorido:
       - *Manter Padrão*: Badge discreto em cinza/verde claro ("Sem alteração necessária").
       - *Alterar Saída*: Badge em destaque com a orientação clara ("Cancelar saída 17:00 e lançar 16:18").
       - *Falta sem abono*: Badge vermelho de alerta ("Lançar falta de dia integral").
       - *Feriado*: Badge azul informativo ("Feriado / Sem expediente").
     - **Horário Final Sugerido** com botão de cópia rápida `[📋]`.
4. Sistema de Filtro:
   - Estado padrão ativado: **"Apenas Exceções"** (oculta dias com ação `keep_standard` ou feriados sem intervenção).
   - Alternância fluida para **"Todas as Datas"** sem necessidade de reprocessamento.
5. Integração com Clipboard (`navigator.clipboard`):
   - Cópia do horário em 1 clique.
   - Feedback visual: substituição do ícone de prancheta por um check verde e mensagem temporária "Copiado!" por 2 segundos.
   - Tratamento de fallback caso a API de Clipboard do navegador não esteja disponível.

## 4. Critérios de Aceite
- [x] A tabela é preenchida dinamicamente respeitando o contrato de dados de `OptimizedDay`.
- [x] Ao alternar entre "Apenas Exceções" e "Todas as Datas", a tabela filtra instantaneamente sem travamento de tela.
- [x] O clique no botão de cópia transfere o horário exato (ex: `16:18`) para a área de transferência do usuário.
- [x] O feedback visual da cópia desaparece automaticamente após o tempo limite.
- [x] Todos os ícones Lucide inseridos dinamicamente são renderizados (`lucide.createIcons()`).

## 5. Dependências e Paralelização
- **Bloqueado por**: Definição da estrutura DOM da `TASK-01`.
- **Bloqueia**: `TASK-05`.
- **Paralelizável com**: `TASK-02` e `TASK-03`.
