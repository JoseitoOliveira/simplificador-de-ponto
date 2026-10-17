# Task 03: Algoritmo de Otimização e Pool de Horas

## 1. Identificação e Visão Geral
- **ID da Task**: `TASK-03`
- **Título**: Algoritmo de Otimização, Pool de Horas e Threshold para Ponto por Exceção (`optimizer.js`)
- **Status**: Concluída
- **Módulos Afetados**: `js/optimizer.js`
- **Potencial de Paralelização**: Altíssimo (módulo com funções puras de negócio, desacoplado de DOM e de PDF, baseado nas Seções 1.2, 5 e 7 da especificação).

## 2. Objetivo da Atividade
Implementar o motor de cálculo da aplicação no arquivo `js/optimizer.js`. O algoritmo deve receber a lista de dias normalizados (`ParsedDay[]`) e a configuração do usuário (threshold, teto de saída, horários padrão) e calcular a alocação do pool de compensação, minimizando ao máximo as alterações no sistema corporativo, respeitando a regra de ouro da batida única S2 e garantindo 100% de precisão matemática em relação ao saldo acumulado do período.

## 3. Entregáveis Esperados
1. Arquivo `js/optimizer.js` exportando:
   - `function optimizePunches(days, config): OptimizationResult`
   - Utilitários de conversão temporal:
     - `parseTimeToMinutes(hhmm: string): number`
     - `formatMinutesToTime(totalMinutes: number): string`
     - `formatDelta(minutes: number): string` (ex: `+02h 38m`, `-42m`)
2. Implementação das etapas do algoritmo (Seção 5.3):
   - **Etapa 1**: Segregação de dias especiais (faltas sem abono, feriados, folgas) dos dias úteis trabalhados ordinários.
   - **Etapa 2**: Classificação dos dias trabalhados:
     - *Dias Absorvidos*: Se `|delta| <= thresholdMinutes`, marcar como `keep_standard` (saldo corporativo 0) e acumular o `delta` no `poolMinutes`.
     - *Dias Elegíveis*: Se `|delta| > thresholdMinutes`, manter como candidatos a exceção.
   - **Etapa 3**: Distribuição do Pool de Horas:
     - Se houver dias elegíveis, ratear o saldo do pool (`poolMinutes`) entre eles de forma balanceada.
     - Ajustar o saldo de cada dia: $\text{targetBalance} = \text{day.originalBalanceMinutes} + \text{allocatedDelta}$.
   - **Etapa 4**: Restrição de Saída Máxima (`maxExitTime`, default 20:00):
     - Calcular a saída S2 sugerida: $\text{S2} = \text{standardS2} + \text{targetBalance}$.
     - Se ultrapassar o teto permitido (ex: 20:00 = 180 min após as 17:00), limitar ao teto e transbordar o excedente para os demais dias elegíveis com folga.
   - **Etapa 5**: Tratamento de Caso Especial (Nenhum dia furou o threshold):
     - Se nenhum dia ultrapassou o threshold, mas o pool total for diferente de zero, eleger o menor número de dias (1 ou 2) para alocar o pool residual.
   - **Etapa 6**: Regra de Ouro da Batida Única S2:
     - Instrução explícita de alteração apenas da saída da tarde (S2): "Cancele a batida das 17:00 e lance saída às HH:mm".
     - E1 (08:00), S1 (12:00) e E2 (13:00) permanecem intocadas.
   - **Etapa 7**: Validador de Invariante Matemática:
     - Função de sanidade que verifica se:
       $$\sum \text{saldos\_ajustados} + \sum \text{saldos\_dias\_especiais} == \text{saldo\_total\_original}$$
       Garantindo tolerância zero a desvios no banco de horas.

## 4. Assinatura e Interface
```typescript
interface OptimizerConfig {
  thresholdMinutes: number; // Ex: 30
  maxExitTime: string;      // Ex: "20:00"
  standardSchedule: {
    e1: string;             // "08:00"
    s1: string;             // "12:00"
    e2: string;             // "13:00"
    s2: string;             // "17:00"
    dailyMinutes: number;   // 480
  };
}

interface OptimizationResult {
  workDays: OptimizedDay[];
  specialDays: OptimizedDay[];
  summary: {
    totalOriginalBalanceMinutes: number;
    totalOptimizedBalanceMinutes: number;
    originalExceptionCount: number;
    simplifiedExceptionCount: number;
    reductionPercentage: number;
  };
}
```

## 5. Critérios de Aceite
- [x] Executa puramente em memória e de forma determinística.
- [x] Quando submetido aos 22 dias da amostra real (Seção 7.1) com threshold de 30m e saída máx 20:00:
  - Reduz as exceções de 18 dias originais para apenas os dias elegíveis.
  - O saldo final acumulado é rigorosamente idêntico ao saldo do extrato (`+103 min`).
- [x] Respeita o teto de 20:00 mesmo em dias de saldo positivo extremo.
- [x] Trata o caso de pool sem dias elegíveis elegendo o mínimo de datas sem lançar erro.
- [x] Instruções textuais formatadas corretamente para o usuário.

## 6. Dependências e Paralelização
- **Bloqueado por**: Nenhuma (pode ser desenvolvido e testado com mock data).
- **Bloqueia**: `TASK-05` e `TASK-06`.
- **Paralelizável com**: `TASK-01`, `TASK-02` e `TASK-04`.
