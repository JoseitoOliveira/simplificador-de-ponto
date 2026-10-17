# Task 01: Setup do Projeto e Estrutura Base HTML/CSS

## 1. Identificação e Visão Geral
- **ID da Task**: `TASK-01`
- **Título**: Setup do Projeto, Importação de Dependências e Estrutura Base HTML/CSS (UI Scaffold)
- **Status**: Concluída
- **Módulos Afetados**: `index.html`, `css/styles.css`
- **Potencial de Paralelização**: Alto (pode ser executada em paralelo com `TASK-02` e `TASK-03`).

## 2. Objetivo da Atividade
Construir a estrutura semântica da página única (SPA), carregar as bibliotecas externas necessárias via CDN (TailwindCSS, Mozilla pdf.js e Lucide Icons), criar os estilos auxiliares em `css/styles.css` e estruturar o layout responsivo com os 4 blocos principais descritos na Seção 6.1 da especificação.

## 3. Entregáveis Esperados
1. Arquivo `index.html`:
   - Importação via CDN de:
     - Tailwind CSS (`https://cdn.tailwindcss.com`)
     - Mozilla `pdf.js` (`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js`) e configuração do worker (`pdf.worker.min.js`)
     - Lucide Icons (`https://unpkg.com/lucide@latest`)
   - **Bloco 1 (Header e Área de Dropzone)**:
     - Título e subtítulo da aplicação com ícone temático de relógio/calendário.
     - Área pontilhada para arrastar e soltar (drag & drop) o PDF do Ponto Fácil com input invisível (`type="file"`, accept `.pdf`).
     - Badge/Aviso de privacidade: "Processamento 100% no seu navegador. Nenhum dado sai do seu computador."
   - **Bloco 2 (Painel de Parâmetros e Sliders)**:
     - Campos para horários contratuais padrão (`08:00 - 12:00` e `13:00 - 17:00`) e jornada diária (`08:00`).
     - Slider de Threshold de Tolerância: `0 a 60 minutos` (passo 5 min, padrão 30m), com indicador numérico reativo.
     - Slider de Horário Máximo de Saída: `17:30 a 22:00` (passo 15 min, padrão 20:00), com indicador de horário.
     - Botão de ação primária: "Simplificar Ponto".
   - **Bloco 3 (Cards de Resumo & Métricas de Impacto)**:
     - Card de Saldo Total do Período (com cor verde para positivo e vermelho/âmbar para negativo).
     - Card de Total de Dias Úteis do ciclo.
     - Card comparativo de impacto: "Exceções Originais vs. Exceções Simplificadas" e badge percentual de cliques economizados.
   - **Bloco 4 (Barra de Filtros e Tabela de Lançamento)**:
     - Botões de alternância de visualização: "(•) Apenas Exceções" (ativo por padrão) e "( ) Todas as Datas".
     - Tabela responsiva com cabeçalhos claros: Data/Dia, Horário Real (PDF), Saldo Original, Ação Recomendada, Batida Final Sugerida (S2) e Ação de Cópia.
     - Contêiner para alertas especiais (ex: dias com faltas sem abono ou feriados).
2. Arquivo `css/styles.css`:
   - Animações sutis (hover em linhas, pulse na dropzone durante dragover, transições de feedback de cópia).
   - Estilizações customizadas para barras de slider (`accent-color` e tooltips).
   - Estilo para impressão ou exportação limpa, se aplicável.

## 4. Critérios de Aceite
- [x] O arquivo `index.html` carrega corretamente no navegador sem erros no console.
- [x] As bibliotecas Tailwind, pdf.js e Lucide Icons são inicializadas sem falhas de rede.
- [x] O layout é responsivo, apresentando boa visualização tanto em desktop quanto em telas menores (tablets e smartphones).
- [x] A área de dropzone reage visualmente a eventos de `dragover` e `dragleave`.
- [x] Os IDs e classes dos elementos respeitam a convenção para vinculação posterior em `ui.js` e `app.js`.

## 5. Dependências e Paralelização
- **Bloqueado por**: Nenhuma. Pode ser iniciado imediatamente.
- **Bloqueia**: `TASK-05` (orquestração do DOM).
