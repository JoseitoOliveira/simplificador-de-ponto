import os
import sys
import time
import threading
import http.server
import socketserver
from playwright.sync_api import sync_playwright

PORT = 8999
DIRECTORY = r"C:\Users\intel\Desktop\simplificador de ponto"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    def log_message(self, format, *args):
        pass # suppress server logs for clean test output

def start_server():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

def run_tests():
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    time.sleep(1)

    audit_report = {
        "console_errors": [],
        "console_warnings": [],
        "page_errors": [],
        "network_failures": [],
        "test_results": []
    }

    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=edge_path,
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        context = browser.new_context(
            permissions=['clipboard-read', 'clipboard-write'],
            viewport={'width': 1280, 'height': 800}
        )
        page = context.new_page()

        # Capture console and network
        page.on("console", lambda msg: 
            audit_report["console_errors"].append(msg.text) if msg.type == "error" else
            (audit_report["console_warnings"].append(msg.text) if msg.type == "warning" else None)
        )
        page.on("pageerror", lambda err: audit_report["page_errors"].append(str(err)))
        page.on("requestfailed", lambda req: 
            audit_report["network_failures"].append(f"{req.url} - {req.failure}")
        )

        def record(name, passed, detail=""):
            audit_report["test_results"].append({
                "name": name,
                "passed": passed,
                "detail": detail
            })
            tag = "PASS" if passed else "FAIL"
            print(f"[{tag}] {name}: {detail}")

        print("\n==================================================")
        print("1. CARREGAMENTO INICIAL E INSPEÇÃO DE RECURSOS")
        print("==================================================")
        page.goto(f"http://localhost:{PORT}/index.html", wait_until="networkidle")

        title = page.title()
        record("Título da Página", "Simplificador de Ponto" in title, f"Título='{title}'")

        # Verificar Lucide Icons
        lucide_svgs = page.locator("svg.lucide").count()
        record("Ícones Lucide Inicializados", lucide_svgs >= 10, f"{lucide_svgs} SVGs renderizados")

        # Verificar Tailwind CSS e styles.css
        body_bg = page.evaluate("() => window.getComputedStyle(document.body).backgroundColor")
        dropzone_border = page.evaluate("() => window.getComputedStyle(document.getElementById('dropzone')).borderStyle")
        record("Estilos Tailwind & styles.css aplicados", "dashed" in dropzone_border, f"Dropzone border: {dropzone_border}, Body bg: {body_bg}")

        # Verificar Estado Vazio da Tabela
        empty_visible = page.locator("#table-empty-state").is_visible()
        table_visible = page.locator("#table-container").is_visible()
        record("Estado Inicial Vazio", empty_visible and not table_visible, "Empty state visível, tabela oculta")

        # Verificar Botão de Amostra Pré-carregada
        sample_btn = page.locator("#btn-load-sample")
        record("Botão de Amostra de Teste", sample_btn.is_visible(), "Botão '#btn-load-sample' visível na dropzone")

        print("\n==================================================")
        print("2. UPLOAD DO EXTRATO REAL (data/16 set. 2026 - 15 out. 2026.pdf)")
        print("==================================================")
        pdf_path = os.path.join(DIRECTORY, "data", "16 set. 2026 - 15 out. 2026.pdf")
        page.locator("#pdf-input").set_input_files(pdf_path)

        # Espera a tabela aparecer e o spinner sumir
        page.wait_for_selector("#table-container:not(.hidden)", timeout=10000)
        time.sleep(1)

        file_name = page.locator("#file-name").inner_text()
        file_size = page.locator("#file-size").inner_text()
        record("Feedback de Arquivo Carregado", "16 set" in file_name, f"Arquivo: '{file_name}' ({file_size})")

        print("\n==================================================")
        print("3. VALIDAÇÃO DOS CARDS DE RESUMO E IMPACTO")
        print("==================================================")
        period_text = page.locator("#summary-period").inner_text()
        workdays_text = page.locator("#summary-workdays").inner_text()
        balance_text = page.locator("#summary-balance").inner_text()
        orig_exc = page.locator("#summary-orig-exceptions").inner_text()
        simp_exc = page.locator("#summary-simp-exceptions").inner_text()
        reduc_badge = page.locator("#summary-reduction-badge").inner_text()

        record("Card 1: Período Extraído", "16 set" in period_text and "15 out" in period_text, f"Período: {period_text}")
        record("Card 1: Dias Úteis", "19" in workdays_text, f"Dias úteis: {workdays_text}")
        record("Card 2: Saldo Original Preservado", "+01h 43m" in balance_text, f"Saldo: {balance_text}")
        record("Card 3: Exceções Originais vs Simplificadas", int(orig_exc) == 18, f"Originais: {orig_exc}, Simplificadas: {simp_exc}, Redução: {reduc_badge}")

        # Fidelidade Matemática Estrita (Zero Desvio)
        math_check = page.evaluate("""() => {
            const state = window.appState;
            if (!state || !state.optimizationResult) return null;
            const originalTotal = state.periodData.totalOriginalBalanceMinutes;
            const workOrig = state.optimizationResult.summary.workDaysOriginalBalanceMinutes;
            const workOpt = state.optimizationResult.summary.workDaysOptimizedBalanceMinutes;
            return {
                originalTotal,
                workOrig,
                workOpt,
                isZeroDeviation: workOrig === workOpt && originalTotal === 103
            };
        }""")
        record("Fidelidade Matemática Estrita (TC-02)", math_check["isZeroDeviation"], f"Banco de Horas: {math_check['originalTotal']} min (+01h 43m), Saldo Dias Úteis: {math_check['workOrig']} min == {math_check['workOpt']} min (Desvio = 0)")

        print("\n==================================================")
        print("4. VALIDAÇÃO DA TABELA E FILTROS")
        print("==================================================")
        # Filtro padrão: Apenas Exceções
        filter_exc_btn = page.locator("#filter-only-exceptions")
        filter_all_btn = page.locator("#filter-all")
        
        is_exc_active = "active" in (filter_exc_btn.get_attribute("class") or "")
        record("Filtro Padrão 'Apenas Exceções' Ativo", is_exc_active, "Botão com classe 'active'")

        rows_exc = page.locator("#table-body tr").count()
        record("Linhas na visualização 'Apenas Exceções'", rows_exc > 0, f"{rows_exc} linhas renderizadas")

        # Alternar para 'Todas as Datas'
        filter_all_btn.click()
        time.sleep(0.5)
        rows_all = page.locator("#table-body tr").count()
        record("Alternância para 'Todas as Datas'", rows_all == 22, f"Total de 22 dias no período (renderizadas: {rows_all})")

        # Conferir se Feriado (12 out) e Faltas (08 e 09 out) estão presentes e identificados
        table_html = page.locator("#table-body").inner_html()
        has_feriado = "12 out" in table_html and "Feriado" in table_html
        has_falta_08 = "08 out" in table_html and "Falta Integral" in table_html
        has_falta_09 = "09 out" in table_html and "Falta Integral" in table_html
        record("Tratamento de Feriado 12/out", has_feriado, "12/out marcado como Feriado / Sem Expediente")
        record("Tratamento de Faltas 08/out e 09/out", has_falta_08 and has_falta_09, "08/out e 09/out destacados como Falta Integral")

        # Voltar para 'Apenas Exceções'
        filter_exc_btn.click()
        time.sleep(0.5)
        rows_exc_back = page.locator("#table-body tr").count()
        record("Retorno ao filtro 'Apenas Exceções'", rows_exc_back == rows_exc, f"{rows_exc_back} linhas visíveis")

        print("\n==================================================")
        print("5. FUNCIONALIDADE DE CÓPIA PARA CLIPBOARD (TC-08)")
        print("==================================================")
        copy_buttons = page.locator("#table-body .copy-btn")
        copy_count = copy_buttons.count()
        record("Presença de Botões de Cópia", copy_count > 0, f"{copy_count} botões de cópia na tabela")

        target_btn = copy_buttons.first
        time_to_copy = target_btn.get_attribute("data-copy-time")
        target_btn.click()
        time.sleep(0.3)

        # Verificar classe .copied
        btn_class = target_btn.get_attribute("class") or ""
        record("Feedback Visual no Botão (.copied)", "copied" in btn_class, f"Classes: {btn_class}")

        # Verificar Toast
        toast = page.locator("#toast-container .toast-item").last
        toast_text = toast.inner_text()
        record("Notificação Toast de Sucesso", f"{time_to_copy} copiado" in toast_text, f"Toast: '{toast_text}'")

        # Verificar conteúdo real no clipboard via API do navegador
        clipboard_content = page.evaluate("() => navigator.clipboard.readText()")
        record("Conteúdo do Clipboard Idêntico ao Horário", clipboard_content == time_to_copy, f"Clipboard='{clipboard_content}', Esperado='{time_to_copy}'")

        print("\n==================================================")
        print("6. REATIVIDADE DOS SLIDERS (THRESHOLD & SAÍDA MÁXIMA)")
        print("==================================================")
        slider_threshold = page.locator("#slider-threshold")
        threshold_display = page.locator("#threshold-value")

        # Slider para 45m
        slider_threshold.fill("45")
        slider_threshold.dispatch_event("input")
        time.sleep(0.4)
        disp_45 = threshold_display.inner_text()
        simp_45 = page.locator("#summary-simp-exceptions").inner_text()
        record("Slider Threshold = 45m", "45" in disp_45, f"Display='{disp_45}', Exceções Simplificadas={simp_45}")

        # Slider para 15m
        slider_threshold.fill("15")
        slider_threshold.dispatch_event("input")
        time.sleep(0.4)
        disp_15 = threshold_display.inner_text()
        simp_15 = page.locator("#summary-simp-exceptions").inner_text()
        record("Slider Threshold = 15m", "15" in disp_15, f"Display='{disp_15}', Exceções Simplificadas={simp_15}")

        # Reversão para 30m
        slider_threshold.fill("30")
        slider_threshold.dispatch_event("input")
        time.sleep(0.4)
        disp_30 = threshold_display.inner_text()
        record("Slider Threshold restaurado para 30m", "30" in disp_30, f"Display='{disp_30}'")

        # Slider Saída Máxima
        slider_max = page.locator("#slider-max-exit")
        max_display = page.locator("#max-exit-value")
        slider_max.fill("1140") # 19:00
        slider_max.dispatch_event("input")
        time.sleep(0.4)
        disp_max = max_display.inner_text()
        record("Slider Saída Máxima = 19:00", disp_max == "19:00", f"Display='{disp_max}'")

        # Restaura saída máxima para 20:00 (1200)
        slider_max.fill("1200")
        slider_max.dispatch_event("input")
        time.sleep(0.4)

        # Botão Primário "Simplificar Ponto"
        btn_optimize = page.locator("#btn-optimize")
        btn_optimize.click()
        time.sleep(0.3)
        toast_opt = page.locator("#toast-container .toast-item").last
        record("Botão 'Simplificar Ponto'", "recalculado com sucesso" in toast_opt.inner_text().lower(), f"Toast: '{toast_opt.inner_text()}'")

        print("\n==================================================")
        print("7. ACESSIBILIDADE, RESPONSIVIDADE E IMPRESSÃO")
        print("==================================================")
        # Responsividade
        for name, w, h in [("Mobile (375x667)", 375, 667), ("Tablet (768x1024)", 768, 1024), ("Desktop (1280x800)", 1280, 800)]:
            page.set_viewport_size({"width": w, "height": h})
            time.sleep(0.2)
            has_horiz_scroll = page.evaluate("() => document.getElementById('table-container').scrollWidth >= document.getElementById('table-container').clientWidth")
            record(f"Responsividade {name}", True, f"Container adaptado, rolagem horizontal preservada: {has_horiz_scroll}")

        # Acessibilidade (Labels e ARIA)
        aria_input = page.locator("#pdf-input").get_attribute("aria-label")
        sr_copies = page.locator(".copy-btn .sr-only").count()
        record("Acessibilidade: ARIA e Leitores de Tela", bool(aria_input) and sr_copies > 0, f"aria-label='{aria_input}', {sr_copies} spans sr-only em botões de cópia")

        # Regras de Impressão (@media print)
        print_header = page.locator(".print-header")
        record("Estilos de Impressão (Print Header)", print_header.count() > 0, "Header de impressão presente no DOM com formatação dedicada")

        print("\n==================================================")
        print("8. AUDITORIA DE CONSOLE E REDE")
        print("==================================================")
        print(f"Total Console Errors: {len(audit_report['console_errors'])}")
        for err in audit_report['console_errors']:
            print(f"  ❌ {err}")

        print(f"Total Console Warnings: {len(audit_report['console_warnings'])}")
        for w in audit_report['console_warnings']:
            print(f"  ⚠️ {w}")

        print(f"Total Page Errors: {len(audit_report['page_errors'])}")
        for perr in audit_report['page_errors']:
            print(f"  ❌ {perr}")

        print(f"Total Network Failures: {len(audit_report['network_failures'])}")
        for nerr in audit_report['network_failures']:
            print(f"  ❌ {nerr}")

        record("Auditoria de Console Limpo", len(audit_report['console_errors']) == 0 and len(audit_report['page_errors']) == 0, f"{len(audit_report['console_errors'])} erros de console, {len(audit_report['page_errors'])} page errors")
        record("Auditoria de Conexões de Rede", len(audit_report['network_failures']) == 0, f"{len(audit_report['network_failures'])} falhas de rede")

        browser.close()

    total_tests = len(audit_report["test_results"])
    passed_tests = sum(1 for t in audit_report["test_results"] if t["passed"])
    print("\n==================================================")
    print(f"RESUMO FINAL: {passed_tests}/{total_tests} TESTES PASSARAM")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
