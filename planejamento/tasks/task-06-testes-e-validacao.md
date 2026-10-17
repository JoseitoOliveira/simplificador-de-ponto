# Task 06: Suíte de Testes, Validação com Amostra Real e Critérios de Aceite

## 1. Identificação e Visão Geral
- **ID da Task**: `TASK-06`
- **Título**: Testes Automatizados, Validação com o Extrato Real e Verificação dos Casos de Teste (TC-01 a TC-08)
- **Status**: Concluída (100% de Sucesso nos Testes TC-01 a TC-08)
- **Módulos Afetados**: Scripts de validação em Python / Playwright Edge, verificação contra `data/16 set. 2026 - 15 out. 2026.pdf`
- **Potencial de Paralelização**: Alto (testes unitários para `optimizer.js` e `parser.js` podem ser construídos em paralelo com as próprias tasks usando mocks).

## 2. Objetivo da Atividade
Garantir a confiabilidade, fidelidade matemática e aderência funcional da aplicação aos casos de teste (TC-01 a TC-08) definidos na Seção 8 da especificação, validando o processamento do extrato real de teste (`data/16 set. 2026 - 15 out. 2026.pdf`) e confrontando os resultados com os valores descritos na Seção 7.

## 3. Matriz de Casos de Teste a Validar (Seção 8 da Especificação)

| ID do Teste | Cenário Avaliado | Dados de Entrada | Critério de Sucesso Esperado |
|---|---|---|---|
| **TC-01** | Upload e Parsing de PDF Válido | Extrato real `16 set. 2026 - 15 out. 2026.pdf` | Leitura em < 1 segundo; identificação correta de datas de início/fim e todas as batidas. |
| **TC-02** | Conservação Estrita do Saldo | Extrato real e variações sintéticas | A soma dos saldos calculados na tabela simplificada é **rigorosamente idêntica** ao saldo do extrato (`+103 min`). |
| **TC-03** | Ajuste Dinâmico do Slider | Variação do slider de threshold (10m -> 30m -> 45m) | A quantidade de exceções diminui reativamente na tela sem recarregar a aplicação nem reenviar o PDF. |
| **TC-04** | Respeito ao Horário Máximo de Saída | Dia com grande saldo positivo (+3h) e teto de 20:00 | S2 calculada não ultrapassa 20:00; o saldo excedente é redistribuído para outro dia elegível com folga. |
| **TC-05** | Período sem nenhum dia > Threshold | Todos os dias com variações pequenas (ex: $\pm 10$m) | O app aloca o resíduo acumulado no menor número de dias (1 ou 2) sem quebrar. |
| **TC-06** | Feriados Oficiais | Dia 12/out (N. Sra Aparecida) | Identificado como feriado e marcado como "Sem Exceção Necessária / Padrão da Empresa". |
| **TC-07** | Faltas sem Abono | Dias 08/out e 09/out | Identificados como falta sem abono integral e destacados com instrução de remoção de batidas. |
| **TC-08** | Cópia para Clipboard | Clique no botão `[📋]` | Horário transferido com precisão para o clipboard com exibição do feedback temporário ("Copiado!"). |

## 4. Roteiro de Validação Numérica com Amostra Real (Seção 7.1)
O script de validação deve verificar dia a dia com threshold de 30m:
- **Dias absorvidos pelo padrão (zero exceções)**:
  - `16/set (+07m)` -> Padrão (Pool += 7m)
  - `18/set (-29m)` -> Padrão (Pool += -29m)
  - `22/set (-04m)` -> Padrão (Pool += -4m)
  - `23/set (-10m)` -> Padrão (Pool += -10m)
  - `25/set (-14m)` -> Padrão (Pool += -14m)
  - `01/out (+00m)` -> Padrão (Pool += 0m)
- **Dias elegíveis que absorvem o pool**:
  - `17/set`, `21/set`, `24/set`, `28/set`, `29/set`, `30/set`, `02/out`, `05/out`, `06/out`, `07/out`, `13/out`, `14/out`, `15/out`.
- **Dias especiais**:
  - `08/out` e `09/out` -> Faltas sem abono dia todo.
  - `12/out` -> Feriado.
- **Resultado Consolidado**:
  - Saldo líquido final = `+01h 43m` (+103 minutos).
  - Redução de intervenções manuais superior a **70%**.

## 5. Critérios de Aceite
- [x] Todos os testes unitários do algoritmo passam com 100% de sucesso.
- [x] O parser extrai com precisão todos os campos do PDF de teste.
- [x] A invariante de conservação de saldo é validada matematicamente em todos os cenários.
- [x] Relatório final de execução gerado atestando conformidade com a especificação técnica (`tests/RELATORIO_VALIDACAO_TASK_06.md`).

## 6. Dependências e Paralelização
- **Bloqueado por**: `TASK-02` e `TASK-03` para os testes unitários de motor; `TASK-05` para a validação E2E final.
- **Paralelizável com**: Os casos de teste podem ser escritos simultaneamente ao desenvolvimento das tasks usando abordagem TDD.
