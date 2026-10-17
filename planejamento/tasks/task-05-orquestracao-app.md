# Task 05: Orquestração do Fluxo, Estado Reativo e Eventos

## 1. Identificação e Visão Geral
- **ID da Task**: `TASK-05`
- **Título**: Orquestrador da Aplicação, Estado Reativo Global e Binding de Eventos (`app.js`)
- **Status**: Concluída
- **Módulos Afetados**: `js/app.js`
- **Potencial de Paralelização**: Médio (integra os módulos desenvolvidos nas Tasks 01, 02, 03 e 04).

## 2. Objetivo da Atividade
Implementar o ponto de entrada (`js/app.js`) que amarra toda a aplicação: gerencia o estado reativo da sessão (dados extraídos do PDF, configurações de sliders e horários contratuais, filtro ativo), escuta eventos de upload (drag-and-drop e file picker), aciona o parser do PDF, despacha o cálculo de simplificação e orquestra a renderização dinâmica da UI.

## 3. Entregáveis Esperados
1. Arquivo `js/app.js` importando:
   - `parsePontoFacilPDF` de `./parser.js`
   - `optimizePunches` de `./optimizer.js`
   - Utilitários de UI e renderização de `./ui.js`
2. Gerenciamento do Estado Central (`AppState`):
   ```javascript
   const appState = {
     periodData: null,         // Dados brutos extraídos do PDF
     optimizationResult: null, // Resultado atual do cálculo de otimização
     config: {
       thresholdMinutes: 30,
       maxExitTime: "20:00",
       standardSchedule: {
         e1: "08:00",
         s1: "12:00",
         e2: "13:00",
         s2: "17:00",
         dailyMinutes: 480
       }
     },
     currentFilter: 'only_exceptions' // 'only_exceptions' | 'all'
   };
   ```
3. Binding de Eventos de Upload:
   - Suporte completo a **Arrastar e Soltar (Drag & Drop)** sobre a área destacada.
   - Suporte ao clique convencional para seleção de arquivo via diálogo do sistema operacional.
   - Validação do tipo de arquivo (garantir que seja `.pdf`).
   - Feedback de carregamento (spinner/indicador de processamento enquanto o `pdf.js` lê o arquivo).
4. Ciclo Reativo de Atualização:
   - Criação da função central `recalculateAndRender()`:
     - Sempre que o usuário move o slider de **Threshold** (ex: de 30m para 45m ou 15m), chama `optimizePunches(appState.periodData.days, appState.config)` e atualiza a UI instantaneamente sem reprocessar o PDF.
     - Sempre que o usuário altera o slider de **Saída Máxima** (ex: de 20:00 para 19:30), recalcula a distribuição e re-renderiza.
     - Sempre que os horários padrão são alterados, atualiza os parâmetros base.
5. Alternância de Filtros:
   - Eventos de clique nos botões de rádio ou pills de filtro ("Apenas Exceções" e "Todas as Datas"), acionando `renderTable()` com os dados em cache.
6. Tratamento de Erros e Casos Limítrofes:
   - Exibir mensagem amigável caso o PDF não seja reconhecido como um extrato válido do Ponto Fácil.
   - Garantir que a interface volte ao estado inicial de forma limpa caso ocorra erro.

## 4. Critérios de Aceite
- [x] O fluxo completo do usuário (User Journey - Seção 2.2) funciona perfeitamente: Drop PDF -> Processamento -> Exibição Imediata com filtro "Apenas Exceções".
- [x] Alterar o slider de threshold atualiza a tabela e os cards de métricas em menos de 100ms.
- [x] O botão "Simplificar Ponto" e os sliders mantêm sincronizados os valores numéricos visíveis na tela.
- [x] O sistema não faz nenhuma requisição HTTP para envio de dados do PDF a servidores externos (Zero Backend).

## 5. Dependências e Paralelização
- **Bloqueado por**: `TASK-01`, `TASK-02`, `TASK-03` e `TASK-04`.
- **Bloqueia**: `TASK-06` (validação ponta a ponta integrada).
