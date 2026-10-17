# Task 09: Refinamento de UI, Card de Saldos, Cópia em Dias Extras e Configuração Tailwind

## 1. Identificação e Visão Geral
- **ID da Task**: `TASK-09`
- **Título**: Renderização de Batidas Copiáveis para Feriados/Domingos Trabalhados, Duplo Saldo no Card 2, Alertas de Ponto e Compatibilidade Tailwind (`index.html`, `js/ui.js`, `js/app.js`)
- **Status**: ✅ Concluída
- **Módulos Afetados**: `index.html`, `js/ui.js`, `js/app.js`, `css/styles.css`
- **Potencial de Paralelização**: Médio (depende das propriedades adicionadas nas Tasks 07 e 08).

## 2. Contexto e Decisões de Interface
A partir das definições alinhadas na revisão do projeto, a camada de interface e orquestração precisa dos seguintes ajustes:

1. **Exibição de Feriados e Fins de Semana Trabalhados (`extra_work`) na Tabela**:
   - **Decisão de Design**: Quando um dia for classificado como `simplifiedAction === 'extra_work'` (ex: `dom., 08 mar. 2026` com 4 batidas `12:44`, `13:44`, `16:33`, `19:11` ou `qui., 04 jun. 2026` com `10:43`, `14:10`), ele deve aparecer no filtro **"Apenas Exceções"**.
   - Na coluna **"Batida Sugerida"**, em vez dos horários padrão `08:00 12:00 13:00 ~17:00~`, devem ser exibidas **todas as batidas reais registradas no PDF como botões de cópia individuais** (`makeSuggestedBadge(punch.time)`), acompanhadas de uma tag identificadora (`Trabalho em Feriado` ou `Fim de Semana`).
2. **Exibição de Notas de Abono Parcial (`partialHolidayNote`) e Batidas Incompletas (`hasMissingPunch`)**:
   - **Decisão de Design**:
     - Em dias úteis com abono parcial (ex: `29/jun` com `"Feriado / + 04h 45m"`), exibir um badge informativo discreto ao lado das batidas na coluna **"Real no PDF"**, mantendo o tratamento normal de dia útil na coluna **"Batida Sugerida"**.
     - Em dias com batida incompleta sinalizada por `"???"` no PDF (ex: `14/abr`), exibir um badge de alerta âmbar/vermelho (`⚠️ Batida incompleta (???)`) na coluna **"Real no PDF"** para alertar o colaborador.
3. **Card 2: Destaque para "Banco de Horas Final" + "Saldo Líquido do Período" no Subtítulo**:
   - **Decisão de Design**:
     - O valor principal em destaque no Card 2 deve exibir o **Banco de Horas Final** do extrato (`periodData.bancoDeHorasMinutes`, ex: `+01h 43m` no PDF1 e `+26h 54m` no PDF2).
     - O subtítulo do Card 2 (`#summary-balance-desc`) deve exibir explicitamente o **Saldo Líquido do Período** e a confirmação de desvio zero (ex: `Saldo do ciclo: -25h 52m • Desvio: 0m`).
     - Remover de `js/app.js` a sobrescrita artificial `totalOptimizedBalanceMinutes: appState.periodData.totalOriginalBalanceMinutes`, preservando os campos reais de `result.summary` e passando tanto `bancoDeHorasMinutes` quanto `periodBalanceMinutes` para `renderSummaryCards`.
4. **Compatibilidade de Classes Tailwind CSS v3 CDN e Limpeza de Código**:
   - O arquivo `index.html` carrega o Tailwind v3.4 via CDN (`https://cdn.tailwindcss.com`), mas o HTML e o `js/ui.js` utilizam classes do Tailwind v4 (`text-2xs`, `shadow-xs`, `shadow-2xs`, `border-3`, `backdrop-blur-xs`, `focus:outline-hidden`, `active:scale-98`).
   - Configurar essas extensões diretamente no objeto `tailwind.config` em `index.html` (ou `css/styles.css`) para que todas as classes sejam aplicadas pelo motor do Tailwind.
   - Unificar o comportamento das funções utilitárias (`formatDelta`, `parseTimeToMinutes`, `formatMinutesToTime`) evitando discrepâncias entre módulos.
   - Remover o diretório vazio `src/` da raiz do projeto.

## 3. Entregáveis Esperados
1. **Atualização de `js/ui.js`**:
   - Em `isExceptionDay(day)`: incluir `if (day.simplifiedAction === 'extra_work') return true;`.
   - Em `renderTable()`:
     - Renderizar para `day.simplifiedAction === 'extra_work'` a lista de botões `.copy-btn` correspondentes a cada batida real de `day.punches`, seguida do badge `Trabalho em Feriado` ou `Fim de Semana`.
     - Renderizar na coluna **"Real no PDF"** o badge de `day.partialHolidayNote` (quando presente) e o badge de alerta quando `day.hasMissingPunch === true`.
   - Em `renderSummaryCards(summaryData, periodInfo)`:
     - Exibir `periodInfo.bancoDeHorasMinutes` no elemento principal `#summary-balance`.
     - Exibir em `#summary-balance-desc` o texto formatado: `Saldo do ciclo: ${formatDelta(summaryData.totalOptimizedBalanceMinutes)} (Desvio: ${diff}m)`.
2. **Atualização de `js/app.js`**:
   - Passar `result.summary` íntegro para `uiRenderSummary(result.summary, appState.periodData)`.
   - Exibir um Toast de aviso (`warning`) caso `result.summary.ceilingExceededWarning` seja `true` (quando o usuário escolher um teto de saída fisicamente incompatível com o volume total de horas extras do período).
3. **Atualização de `index.html` e Limpeza**:
   - Estender `tailwind.config.theme.extend` em `index.html` com `fontSize: { '2xs': ['0.6875rem', { lineHeight: '1rem' }] }`, `boxShadow: { 'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)', '2xs': '0 1px 1px 0 rgb(0 0 0 / 0.04)' }`, `borderWidth: { '3': '3px' }`, `backdropBlur: { 'xs': '2px' }`, `scale: { '98': '0.98' }`.
   - Remover a pasta vazia `src/`.

## 4. Critérios de Aceite
- [x] Nos feriados e domingos trabalhados (`18/fev`, `08/mar`, `05/abr`, `04/jun`, `12/ago`), a coluna **"Batida Sugerida"** exibe botões clicáveis individuais para copiar cada horário real do PDF, funcionando com feedback visual (`Copiado!`).
- [x] O dia `29/jun` exibe o badge `"Feriado / + 04h 45m"` na coluna **"Real no PDF"** e permanece absorvido pelo horário padrão quando o threshold é $\ge 3$ min.
- [x] O dia `14/abr` exibe o badge de alerta de batida incompleta (`???`) na coluna **"Real no PDF"**.
- [x] O Card 2 exibe `+01h 43m` (destaque) e `Saldo do ciclo: -25h 52m • Desvio: 0m` (subtítulo) para o PDF1, e `+26h 54m` (destaque) e `Saldo do ciclo: +44h 48m • Desvio: 0m` para o PDF2.
- [x] As classes customizadas (`text-2xs`, `shadow-xs`, `border-3`, etc.) são reconhecidas e aplicadas pelo Tailwind CDN no navegador.

## 5. Dependências e Paralelização
- **Bloqueado por**: `TASK-07` e `TASK-08`.
- **Bloqueia**: `TASK-10`.
