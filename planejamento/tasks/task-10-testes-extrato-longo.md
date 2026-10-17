# Task 10: Expansão da Suíte de Testes Automatizados para Extratos Multi-Meses

## 1. Identificação e Visão Geral
- **ID da Task**: `TASK-10`
- **Título**: Validação Automatizada E2E do Extrato Longo de 8 Meses e Novos Casos de Teste (TC-09 a TC-12)
- **Status**: ✅ Concluída
- **Módulos Afetados**: `tests/test_validation_suite.py`, `tests/test_e2e.py`, `tests/RELATORIO_VALIDACAO_TASK_06.md`
- **Potencial de Paralelização**: Alto (pode ser estruturada em paralelo com a `TASK-09`).

## 2. Objetivo da Atividade
Expandir a suíte de testes automatizados em Python + Playwright para validar não apenas o extrato mensal (`data/16 set. 2026 - 15 out. 2026.pdf`), mas também o extrato completo de 8 meses (`data/01 fev. 2026 - 30 set. 2026.pdf`, contendo 175 dias), cobrindo todos os casos de borda descobertos na revisão técnica.

## 3. Novos Casos de Teste a Implementar (TC-09 a TC-12)

| ID do Teste | Cenário Avaliado | Arquivo / Entrada | Critério de Sucesso Esperado |
|---|---|---|---|
| **TC-09** | Parsing de Datas Multi-Token e Conservação em Extrato Longo (8 meses) | `data/01 fev. 2026 - 30 set. 2026.pdf` | 175 dias extraídos; `06/mar` com 4 batidas (`+1m`) e `08/mar` separado com 4 batidas (`+218m`); soma dos saldos diários idêntica ao `Saldo do período` (`+2688 min` / `+44h 48m`, $\Delta = 0$). |
| **TC-10** | Feriados/Domingos Trabalhados (`extra_work`) e Cópia de Batidas Reais | `18/fev`, `08/mar`, `05/abr`, `04/jun`, `12/ago` no PDF2 | Classificados como `extra_work`; visíveis no filtro "Apenas Exceções"; batidas reais renderizadas como botões `.copy-btn` individuais sem misturar saldo no `poolMinutes`. |
| **TC-11** | Feriado Parcial em Dia Útil (`29/jun`) e Alerta de Batida Ímpar (`14/abr`) | `29/jun` e `14/abr` no PDF2 | `29/jun` tratado como dia útil normal (`-3m` absorvido em threshold 30m) com badge `"Feriado / + 04h 45m"`; `14/abr` sinalizado com `hasMissingPunch: true` e alerta visual na tabela. |
| **TC-12** | Transbordo em Cascata sob Teto Restrito (`maxExitTime = 17:30`) e Piso `13:15` | PDF1 e PDF2 com teto `17:30` e cenários de pool negativo | Quando `eligibleDays` saturam em `17:30`, `absorbedDays` são recrutados progressivamente; nenhum dia sofre despejo para `23:59`; nenhum dia com `modify_exit` tem `S2 < 13:15` ou `S2 == 17:00`; $\Delta = 0$. |

## 4. Critérios de Aceite
- [x] Todos os 12 casos de teste (`TC-01` a `TC-12`) passam com 100% de sucesso em execução headless via Playwright.
- [x] Zero erros de console (`console.error`), zero erros de página (`pageerror`) e zero falhas de requisição na suíte E2E (`tests/test_e2e.py`).
- [x] Arquivo `tests/validation_results.json` e relatório técnico atualizados com as métricas de validação dos dois extratos reais.

## 5. Dependências e Paralelização
- **Bloqueado por**: `TASK-07`, `TASK-08` e `TASK-09`.
- **Bloqueia**: Conclusão da Fase 4 de revisão e estabilização do projeto.
