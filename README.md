# Simplificador de Ponto por Exceção ⏱️

Uma aplicação web moderna, reativa e estática (SPA Client-Side) para quem utiliza controle de ponto por exceção e quer bater o banco de horas com esforço mínimo, eliminando mais de 70% dos cliques mensais.

> **Privacidade Total (Zero Backend)**: Todo o processamento (leitura de PDF, cálculos e visualização) ocorre 100% no navegador do usuário. Nenhum dado sai do seu computador.

---

## 🎯 O Que o Aplicativo Faz

1. **Importa o Extrato PDF** gerado pelo aplicativo *Ponto Fácil* (v4.x).
2. **Extrai com precisão** todas as batidas reais, faltas e feriados.
3. **Aplica o Algoritmo de Pool de Horas e Threshold**:
   - Variações pequenas (ex: $\pm 30$ minutos) são absorvidas pelo padrão contratual (ex: `08:00 - 12:00` e `13:00 - 17:00`), sem necessidade de alteração.
   - O saldo residual dessas variações é compensado nos dias que já excederam o threshold.
   - O saldo final acumulado do período bate **100% exatamente** com o saldo do extrato original.
4. **Regra de Ouro da Batida Única S2**:
   - Em vez de excluir 4 batidas e digitar 4 novas batidas por dia, o sistema instrui você a **alterar apenas a última batida de saída (S2)**.
   - Entrada (`08:00`) e almoço (`12:00 - 13:00`) permanecem intocados.
5. **Cópia Rápida com 1 Clique**:
   - Botão `[📋]` para copiar o horário sugerido direto para a área de transferência.

---

## 🚀 Como Executar

### Opção 1: Abrir diretamente no Navegador (Mais Rápido)
Basta abrir o arquivo [`index.html`](./index.html) em qualquer navegador moderno (Chrome, Edge, Firefox, Brave, Safari).

### Opção 2: Servidor Local Estático
Se preferir rodar com um servidor HTTP local:

```bash
# Com Python 3
python -m http.server 8000
```
Em seguida, acesse no navegador: [http://localhost:8000](http://localhost:8000)

---

## 📁 Estrutura do Projeto

```text
simplificador-de-ponto/
├── index.html                   # Estrutura HTML da página única e UI responsiva
├── css/
│   └── styles.css               # Estilos complementares, animações e regras de impressão
├── js/
│   ├── app.js                   # Orquestrador do fluxo, estado global e eventos
│   ├── parser.js                # Parser e normalizador do extrato PDF (Mozilla pdf.js)
│   ├── optimizer.js             # Algoritmo de Pool de Horas, Threshold e Saída Máxima
│   └── ui.js                    # Renderização de tabela, métricas, sliders e clipboard
├── data/
│   └── 16 set. 2026 - 15 out. 2026.pdf  # Extrato PDF de amostra real
├── planejamento/
│   └── tasks/                   # Detalhamento de todas as 6 tarefas implementadas
├── tests/                       # Suíte completa de testes automatizados e relatórios
└── ESPECIFICACAO.md             # Especificação técnica e funcional completa
```

---

## 🧪 Suíte de Testes e Validação

A aplicação foi validada por agentes de QA automatizados cobrindo todos os casos de teste da especificação:

| Caso de Teste | Descrição | Status |
|---|---|---|
| **TC-01** | Parsing e leitura precisa do extrato real PDF | ✅ Aprovado (0.36s) |
| **TC-02** | Conservação estrita do saldo ($\Delta = 0$ min em todos os thresholds) | ✅ Aprovado |
| **TC-03** | Ajuste dinâmico do slider de threshold com reatividade em tempo real | ✅ Aprovado |
| **TC-04** | Respeito ao teto de horário máximo de saída (20:00) com transbordo seguro | ✅ Aprovado |
| **TC-05** | Período sem nenhum dia > threshold (alocação mínima em 1 único dia) | ✅ Aprovado |
| **TC-06** | Identificação e tratamento correto de feriados oficiais (12/out) | ✅ Aprovado |
| **TC-07** | Identificação e segregação de faltas sem abono integrais (08/out e 09/out) | ✅ Aprovado |
| **TC-08** | Cópia de horário para o clipboard com feedback visual instantâneo | ✅ Aprovado |

Consulte o relatório detalhado em [`tests/RELATORIO_VALIDACAO_TASK_06.md`](./tests/RELATORIO_VALIDACAO_TASK_06.md).

---

## 🛠️ Tecnologias Utilizadas

- **HTML5 & Vanilla JavaScript Moderno (ES6+ Modules)**: Leve, sem dependências de compilação ou bundlers.
- **Tailwind CSS (CDN)**: Estilização moderna, limpa e responsiva.
- **Mozilla PDF.js (CDN)**: Leitura e extração do fluxo textual do PDF no client-side.
- **Lucide Icons**: Ícones modernos e consistentes.
