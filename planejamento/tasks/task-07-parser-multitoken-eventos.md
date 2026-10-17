# Task 07: Resiliência do Parser para Datas Multi-Token e Eventos Complexos

## 1. Identificação e Visão Geral
- **ID da Task**: `TASK-07`
- **Título**: Resiliência do Parser para Datas Divididas em Múltiplos Tokens, Feriados Parciais/Trabalhados e Marcações Incompletas (`parser.js`)
- **Status**: ✅ Concluída
- **Módulos Afetados**: `js/parser.js`
- **Potencial de Paralelização**: Altíssimo (módulo isolado de extração e normalização, testável diretamente contra os arquivos em `data/`).

## 2. Contexto e Problema Identificado
Durante a validação com o extrato longo de 8 meses (`data/01 fev. 2026 - 30 set. 2026.pdf`), foram identificadas quatro situações reais geradas pelo aplicativo *Ponto Fácil* (v4.0.28) que o parser atual não distingue adequadamente:

1. **Datas divididas em múltiplos tokens pelo `pdf.js`**:
   - O cabeçalho do dia `dom., 08 mar. 2026` é extraído pelo `pdf.js` em dois tokens separados: `"dom., 08 mar."` seguido de `"2026"`.
   - Como `PATTERNS.dateHeader` exige o ano de 4 dígitos no mesmo token, a data `08/03/2026` é ignorada, suas 4 batidas (`12:44`, `13:44`, `16:33`, `19:11`) são mescladas erroneamente na sexta-feira `06/03/2026` (gerando 8 batidas), e o resumo de `08/03` (`+03h 38m`) sobrescreve o saldo de `06/03` (`+00h 01m`), causando perda de `1 minuto` no somatório geral do período (`2687m` vs `2688m`).
2. **Feriados Parciais / Abonos Parciais em Dia Útil (`Feriado / + HHh MMm`)**:
   - No dia `seg., 29 jun. 2026`, o colaborador trabalhou pela manhã (`08:55` às `12:07`), teve um abono parcial `"Feriado / + 04h 45m"` e saldo líquido no resumo de `-00h 03m`.
   - Atualmente, qualquer ocorrência da palavra `"feriado"` marca o dia como `isSpecial = true` (`"Feriado / Sem expediente"`), impedindo que o dia seja tratado como dia útil normal pelo seu saldo líquido (`-3m`).
3. **Feriados e Fins de Semana com Horas Trabalhadas**:
   - Em `18/fev` (`09:05–12:50`, `+03h 45m`), `04/jun` (`10:43–14:10`, `+03h 27m`) e `12/ago` (`19:10–19:44`, `+00h 34m`), consta `"Feriado / dia todo"`, mas houve trabalho efetivo registrado com batidas.
   - Em `dom., 08 mar. 2026` (`+03h 38m`) e `dom., 05 abr. 2026` (`+02h 17m`), houve trabalho em fim de semana (dias sem expediente padrão pré-preenchido pela empresa).
4. **Batidas Incompletas / Ímpares (`"???"`)**:
   - No dia `ter., 14 abr. 2026`, o colaborador possui 5 batidas e o token `"???"` indicando batida em aberto no Ponto Fácil.

## 3. Entregáveis Esperados
1. **Pré-processamento / Reconstrução de Tokens de Data em `js/parser.js`**:
   - Antes ou durante a varredura de `allTokens`, detectar tokens de prefixo de data sem ano (ex: `/^([a-zçãéíóú]{3,4}\.,?\s+\d{1,2}\s+[a-zçãéíóú]{3}\.?)$/i`) seguidos imediatamente por um token de ano (`/^\d{4}\b/`) e concatená-los em `"dom., 08 mar. 2026"`.
2. **Refinamento da Classificação de Eventos Especiais e Dias de Fim de Semana**:
   - Diferenciar claramente no objeto `ParsedDay`:
     - **Feriado Parcial / Abono Parcial** (ex: `/feriado\s*\/\s*[+-]\s*\d{2}h\s*\d{2}m/i` ou `/falta abonada\s*\/\s*[+-]/i`):
       - `isSpecial: false` (continua sendo um dia útil normal para fins de otimização pelo saldo líquido do `Resumo:`).
       - `partialHolidayNote: string` (ex: `"Feriado / + 04h 45m"`), preservando a informação para exibição na coluna `"Real no PDF"`.
     - **Feriado Integral (`Feriado / dia todo` ou `Nenhum ponto registrado!`)**:
       - Se **não houver batidas** (`punches.length === 0`): `isSpecial: true`, `specialType: 'holiday'`, `specialReason: 'Feriado / Sem expediente'`.
       - Se **houver batidas registradas** (`punches.length > 0`): `isSpecial: true`, `specialType: 'extra_work'`, `specialReason: 'Trabalho em Feriado'`.
     - **Fim de Semana (`sáb.` ou `dom.`)**:
       - Identificar `isWeekend: true` a partir de `dayOfWeek` (`sáb.` / `sab.` / `dom.`).
       - Se houver batidas (`punches.length > 0`): `isSpecial: true`, `specialType: 'extra_work'`, `specialReason: 'Trabalho em Fim de Semana'`.
     - **Falta sem abono integral (`Falta sem abono / dia todo`)**:
       - `isSpecial: true`, `specialType: 'absence'`, `specialReason: 'Falta sem abono / dia todo'`.
3. **Captura de Inconsistência de Batida (`"???"`)**:
   - Quando o token `"???"` for encontrado no dia corrente (ou se `punches.length % 2 !== 0` ao fechar o dia), definir `hasMissingPunch: true` no `ParsedDay`.

## 4. Contrato de Dados Atualizado (`ParsedDay`)
```typescript
interface ParsedDay {
  dateStr: string;               // "dom., 08 mar. 2026"
  dateISO: string;               // "2026-03-08"
  dayOfWeek: string;             // "dom."
  isWeekend: boolean;            // true para sáb. ou dom.
  punches: PunchRecord[];        // Batidas reais extraídas
  originalBalanceMinutes: number;// Saldo do dia conforme Resumo do PDF
  periodBalanceMinutes: number;  // Saldo acumulado do período até o dia
  bancoDeHorasMinutes: number;   // Saldo do banco de horas até o dia
  isSpecial: boolean;            // true para faltas, feriados sem expediente ou trabalho em feriado/fim de semana
  specialType?: 'absence' | 'holiday' | 'extra_work' | null;
  specialReason?: string | null; // Descrição legível do evento especial
  partialHolidayNote?: string | null; // Ex: "Feriado / + 04h 45m" em dias úteis normais
  hasMissingPunch?: boolean;     // true quando houver "???" ou número ímpar de batidas
}
```

## 5. Critérios de Aceite
- [x] Ao processar `data/01 fev. 2026 - 30 set. 2026.pdf`, o dia `2026-03-08` (`dom., 08 mar. 2026`) é extraído como um registro próprio com 4 batidas e saldo `+218 min` (`+03h 38m`), e o dia `2026-03-06` mantém exatamente suas 4 batidas e saldo `+1 min` (`+00h 01m`).
- [x] A soma de `originalBalanceMinutes` de todos os 175 dias extraídos de `01 fev. 2026 - 30 set. 2026.pdf` bate **100% sem nenhum minuto de diferença** com `periodBalanceMinutes` (`+2688 min` = `+44h 48m`).
- [x] O dia `2026-06-29` (`Feriado / + 04h 45m`) é marcado com `isSpecial: false`, `originalBalanceMinutes: -3` e `partialHolidayNote: "Feriado / + 04h 45m"`.
- [x] Os dias `2026-02-18`, `2026-06-04`, `2026-08-12` (feriados com batidas) e `2026-03-08`, `2026-04-05` (domingos com batidas) são classificados com `isSpecial: true` e `specialType: 'extra_work'`.
- [x] O dia `2026-04-14` é marcado com `hasMissingPunch: true` devido ao token `"???"`.
- [x] Retrocompatibilidade total preservada com o extrato `data/16 set. 2026 - 15 out. 2026.pdf`.

## 6. Dependências e Paralelização
- **Bloqueado por**: Nenhuma.
- **Bloqueia**: `TASK-08`, `TASK-09` e `TASK-10`.
- **Paralelizável com**: `TASK-08` (utilizando o contrato de dados acima).
