# Task 02: Parser e Normalizador do Extrato PDF

## 1. Identificação e Visão Geral
- **ID da Task**: `TASK-02`
- **Título**: Módulo de Extração e Normalização de Dados do Extrato PDF do Ponto Fácil (`parser.js`)
- **Status**: Concluída
- **Módulos Afetados**: `js/parser.js`
- **Potencial de Paralelização**: Altíssimo (módulo independente, baseia-se na Seção 4 da especificação e no arquivo de teste `data/16 set. 2026 - 15 out. 2026.pdf`).

## 2. Objetivo da Atividade
Desenvolver a função `parsePontoFacilPDF(pdfData)` utilizando o `pdf.js` para ler o fluxo de texto do extrato mensal gerado pelo aplicativo móvel *Ponto Fácil* (v4.x), identificar o período de apuração, extrair os blocos diários de batidas, registrar eventos especiais (faltas, feriados) e calcular o saldo consolidado do período, retornando a estrutura tipada `PeriodData`.

## 3. Entregáveis Esperados
1. Arquivo `js/parser.js` exportando as funções principais:
   - `async function parsePontoFacilPDF(fileBufferOrArrayBuffer): Promise<PeriodData>`
   - Funções auxiliares para regex e conversão de strings de data/tempo.
2. Implementação das expressões regulares (Seção 4.2):
   - `dateHeader`: captura formato de data `ddd., DD mmm. AAAA` (ex: `qua., 16 set. 2026`).
   - `timePunch`: captura batidas isoladas `HH:mm`.
   - `balanceLine`: captura saldos no formato `[+-] HHh MMm`.
   - `specialEvent`: captura ocorrências como `Falta sem abono / dia todo`, `Falta abonada`, `Feriado`, `Nenhum ponto registrado!`.
   - `periodRange`: captura o intervalo de apuração no cabeçalho (ex: `16/set./2026 - 15/out./2026`).
3. Máquina de Estados para reconstruir o agrupamento de cada dia:
   - Identificar a data corrente.
   - Coletar as batidas do dia (2, 4 ou mais horários `HH:mm`).
   - Coletar a linha de resumo com o saldo do dia (`[+-] HHh MMm`) e converter para minutos com sinal.
   - Marcar flag `isSpecial: true` e capturar `specialReason` quando houver faltas ou feriados.
4. Normalização do Período:
   - Extrair data de início e fim no formato ISO (`YYYY-MM-DD`).
   - Computar o `totalOriginalBalanceMinutes` acumulado a partir das informações do PDF.

## 4. Estrutura do Objeto de Retorno
```javascript
{
  startDate: "2026-09-16",
  endDate: "2026-10-15",
  rawPeriodStr: "16 set. 2026 a 15 out. 2026",
  totalOriginalBalanceMinutes: 103, // Ex: +01h 43m = 103 min
  days: [
    {
      dateStr: "qua., 16 set. 2026",
      dateISO: "2026-09-16",
      dayOfWeek: "qua.",
      punches: [
        { type: "entrada", time: "08:00", minutesFromMidnight: 480 },
        { type: "saida", time: "12:00", minutesFromMidnight: 720 },
        { type: "entrada", time: "13:00", minutesFromMidnight: 780 },
        { type: "saida", time: "17:07", minutesFromMidnight: 1027 }
      ],
      originalBalanceMinutes: 7,
      isSpecial: false,
      specialReason: null
    },
    {
      dateStr: "qui., 08 out. 2026",
      dateISO: "2026-10-08",
      dayOfWeek: "qui.",
      punches: [],
      originalBalanceMinutes: -480,
      isSpecial: true,
      specialReason: "Falta sem abono / dia todo"
    }
    // ... demais dias
  ]
}
```

## 5. Critérios de Aceite
- [x] Executa 100% no cliente sem chamadas de rede externas ou backend.
- [x] Consegue processar o arquivo `data/16 set. 2026 - 15 out. 2026.pdf` sem lançar exceções.
- [x] Extrai com precisão todos os 22 dias úteis/trabalhados listados na Seção 7.1 da especificação.
- [x] Identifica corretamente o dia 12/out como feriado e os dias 08/out e 09/out como faltas integrais.
- [x] O saldo consolidado acumulado bate exatamente com o saldo real do extrato (`+01h 43m` = `+103 minutos`).

## 6. Dependências e Paralelização
- **Bloqueado por**: Nenhuma (o arquivo PDF de amostra já está disponível em `data/`).
- **Bloqueia**: `TASK-05` e `TASK-06`.
- **Paralelizável com**: `TASK-01`, `TASK-03` e `TASK-04`.
