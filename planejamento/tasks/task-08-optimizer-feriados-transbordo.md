# Task 08: Aprimoramento do Otimizador: Feriados/Domingos Trabalhados, Limite Inferior S2 e Transbordo em Cascata

## 1. Identificação e Visão Geral
- **ID da Task**: `TASK-08`
- **Título**: Tratamento de Feriados/Fins de Semana Trabalhados, Piso Mínimo de Saída S2 e Transbordo em Cascata para Dias Absorvidos (`optimizer.js`)
- **Status**: ✅ Concluída
- **Módulos Afetados**: `js/optimizer.js`
- **Potencial de Paralelização**: Altíssimo (motor matemático puro, desacoplado de DOM).

## 2. Contexto e Regras de Negócio Definidas
A revisão do motor `js/optimizer.js` frente a cenários extremos e ao extrato longo (`01 fev. 2026 - 30 set. 2026.pdf`) definiu quatro regras essenciais:

1. **Feriados e Fins de Semana Trabalhados (`extra_work`)**:
   - Como o sistema corporativo de ponto por exceção **não pré-preenche** horários padrão (`08:00–12:00 / 13:00–17:00`) em feriados ou fins de semana, esses dias não podem receber a instrução *"Cancele a batida das 17:00 e lance saída às HH:mm"* nem ter seu saldo diluído no pool dos dias úteis.
   - **Decisão de Design**: Dias com `specialType === 'extra_work'` (feriados ou sábados/domingos com batidas registradas) devem ser mantidos como **exceções no próprio dia** (`simplifiedAction: 'extra_work'`), conservando seu saldo original (`adjustedBalance = originalBalanceMinutes`) e instruindo o lançamento manual de todas as batidas reais registradas no PDF naquele dia.
2. **Dias Úteis com Abono/Feriado Parcial (`partialHolidayNote`)**:
   - **Decisão de Design**: Dias úteis normais que tiveram abono parcial (ex: `seg., 29 jun. 2026` com `"Feriado / + 04h 45m"` e saldo líquido `-00h 03m`) participam normalmente de `workDays` pelo seu saldo líquido do resumo, sendo absorvidos pelo threshold quando `|delta| <= thresholdMinutes`.
3. **Transbordo em Cascata quando todos os `eligibleDays` atingem o Teto (`maxExitTime`)**:
   - Quando o usuário configura um `maxExitTime` restrito (ex: `17:30` ou `18:00`) em um período com muitas horas extras, todos os `eligibleDays` podem atingir o limite máximo (`maxAllowedBalance`).
   - No código atual, a Etapa 7 despeja toda a sobra não alocada no primeiro dia elegível (gerando ex: `+1564 min` e saída `23:59` em um único dia).
   - **Correção**: Se após distribuir entre `eligibleDays` ainda restar `pendingOverflow > 0`, o algoritmo deve recrutar progressivamente dias de `absorbedDays` (priorizando os dias com maior saldo original positivo, mais próximos do threshold), convertendo-os para `modify_exit` até alocar todo o excedente respeitando `maxAllowedBalance`.
4. **Piso Mínimo para Saída `S2` no Rateio Negativo e Reclassificação de Saldo Zero**:
   - Ao distribuir um `poolMinutes` negativo entre `eligibleDays`, o saldo ajustado de um dia nunca pode fazer com que a saída `S2` (`s2Base + adjustedBalance`) fique menor ou igual à entrada da tarde `E2` (`e2Base`, ex: `13:00`). Deve ser respeitado um piso mínimo de tarde (ex: `minAllowedBalance = (e2Base + 15) - s2Base`, garantindo saída mínima às `13:15`), transbordando eventual saldo negativo restante para outros dias com folga.
   - Se, após o rateio do pool ou transbordo, um dia elegível resultar exatamente em `adjustedBalance === 0` (`S2 == 17:00`), sua ação deve ser automaticamente convertida de `'modify_exit'` para `'keep_standard'`, economizando mais uma exceção.

## 3. Entregáveis Esperados
1. **Atualização de `classifySpecialDay(day)` em `js/optimizer.js`**:
   - Tratar os 3 tipos de `isSpecial`:
     - `'absence'` (`Falta sem abono`): `simplifiedAction: 'special_action'`, `adjustedBalance: day.originalBalanceMinutes` (`-480`), `instruction: 'No app da empresa: Lançar como Falta Integral / Remover batidas pré-preenchidas'`.
     - `'extra_work'` (Feriado ou Fim de Semana com batidas reais): `simplifiedAction: 'extra_work'`, `adjustedBalance: day.originalBalanceMinutes`, `suggestedPunchS2: null`, `instruction: 'No app da empresa: Lançar as batidas reais registradas no PDF'`.
     - `'holiday'` (Feriado sem expediente e sem batidas): `simplifiedAction: 'keep_standard'`, `adjustedBalance: 0`, `instruction: 'Feriado / Sem intervenção necessária'`.
2. **Refatoração de `distributePoolAcrossEligibles` e Transbordo em Cascata**:
   - Respeitar simultaneamente:
     - **Teto Superior**: `maxAllowedBalance = maxExitMinutes - s2Base` (ex: `20:00 - 17:00 = +180m`).
     - **Piso Inferior**: `minAllowedBalance = (e2Base + 15) - s2Base` (ex: `13:15 - 17:00 = -225m`).
   - Caso todos os `eligibleDays` saturem no teto (ou no piso) e ainda reste saldo pendente (`pendingOverflow !== 0`), promover dias de `absorbedDays` (ordenados por maior proximidade ao sentido do overflow) para `modify_exit` até absorver todo o resíduo dentro dos limites.
   - Caso mesmo utilizando 100% dos `workDays` ainda reste excedente (cenário extremo onde a média diária de horas extras do mês supera o teto escolhido no slider), distribuir o resíduo uniformemente entre os `workDays` (respeitando o limite físico do dia `< 23:59`) e sinalizar flag `summary.ceilingExceededWarning = true`.
3. **Normalização Pós-Rateio (Etapa 6)**:
   - Se `day.simplifiedAction === 'modify_exit'` e `day.adjustedBalance === 0`, reclassificar para `day.simplifiedAction = 'keep_standard'` e `day.suggestedPunchS2 = standardSchedule.s2`.
4. **Métricas de Exceções no `summary`**:
   - Contabilizar corretamente `originalExceptionCount` e `simplifiedExceptionCount` garantindo que dias `extra_work` (feriados/domingos trabalhados) também sejam contabilizados de forma transparente ou reportados em `extraWorkDaysCount`.

## 4. Critérios de Aceite
- [x] Feriados e domingos com batidas (`18/fev`, `08/mar`, `05/abr`, `04/jun`, `12/ago`) recebem `simplifiedAction: 'extra_work'` e conservam `adjustedBalance === originalBalanceMinutes` sem alterar `poolMinutes`.
- [x] No extrato `01 fev. 2026 - 30 set. 2026.pdf` com `maxExitTime = "17:30"`, nenhum dia recebe saída `23:59` por despejo forçado; os dias absorvidos necessários são recrutados respeitando o teto de `17:30` e mantendo $\Delta = 0$.
- [x] Nenhum dia com `simplifiedAction === 'modify_exit'` gera `suggestedPunchS2` anterior a `13:15` (`e2Base + 15m`) nem igual ao próprio `17:00` (`s2Base`).
- [x] A invariante matemática ($\sum \text{adjustedBalance} \equiv \sum \text{originalBalanceMinutes}$) permanece 100% exata ($\Delta = 0$) em ambos os PDFs para qualquer combinação de sliders.

## 5. Dependências e Paralelização
- **Bloqueado por**: Contrato de dados definido na `TASK-07`.
- **Bloqueia**: `TASK-09` e `TASK-10`.
- **Paralelizável com**: `TASK-07`.
