import os
import time
import threading
import http.server
import socketserver
from playwright.sync_api import sync_playwright

PORT = 8998
DIRECTORY = r"C:\Users\intel\Desktop\simplificador de ponto"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    def log_message(self, format, *args):
        pass

def run():
    server = socketserver.TCPServer(("", PORT), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    time.sleep(1)

    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=edge_path, headless=True)
        page = browser.new_page()

        print("\n--- Test A: Sample Loader Button (#btn-load-sample) ---")
        page.goto(f"http://localhost:{PORT}/index.html", wait_until="networkidle")
        sample_btn = page.locator("#btn-load-sample")
        assert sample_btn.is_visible()
        sample_btn.click()
        page.wait_for_selector("#table-container:not(.hidden)", timeout=10000)
        time.sleep(1)
        period = page.locator("#summary-period").inner_text()
        print(f"Sample loaded period: {period}")
        assert "16 set" in period
        print("[PASS] Sample Loader Button works seamlessly!")

        print("\n--- Test B: Drag & Drop CSS Classes ---")
        dropzone = page.locator("#dropzone")
        dropzone.dispatch_event("dragenter")
        has_dragover = "dragover" in (dropzone.get_attribute("class") or "")
        print(f"Dropzone has 'dragover' on dragenter: {has_dragover}")
        assert has_dragover
        dropzone.dispatch_event("dragleave")
        has_dragover_after = "dragover" in (dropzone.get_attribute("class") or "")
        print(f"Dropzone has 'dragover' after dragleave: {has_dragover_after}")
        assert not has_dragover_after
        print("[PASS] Drag & Drop CSS feedback validated!")

        print("\n--- Test C: Replace File Button & Non-PDF Validation ---")
        btn_replace = page.locator("#btn-replace-file")
        assert btn_replace.is_visible()
        
        # Test non-pdf upload
        invalid_path = os.path.join(DIRECTORY, "test_invalid.txt")
        with open(invalid_path, "w", encoding="utf-8") as f:
            f.write("not a pdf")

        page.locator("#pdf-input").set_input_files(invalid_path)
        time.sleep(0.5)

        toast = page.locator("#toast-container .toast-item").last
        toast_text = toast.inner_text()
        print(f"Invalid file toast: {toast_text}")
        assert "PDF válido" in toast_text
        os.remove(invalid_path)
        print("[PASS] Non-PDF upload rejection and warning toast validated!")

        print("\n--- Test D: Standard Schedule Input Changes ---")
        # Change Standard Exit from 17:00 to 18:00
        input_s2 = page.locator("#config-s2")
        input_s2.fill("18:00")
        input_s2.dispatch_event("change")
        time.sleep(0.5)

        # In table, verify keep_standard rows now reflect 18:00
        page.locator("#filter-all").click()
        time.sleep(0.3)
        table_html = page.locator("#table-body").inner_html()
        assert "18:00" in table_html
        print("[PASS] Standard Schedule reactivity validated!")

        # Reset s2 to 17:00
        input_s2.fill("17:00")
        input_s2.dispatch_event("change")
        time.sleep(0.3)

        browser.close()
        server.shutdown()
        print("\nALL INTERACTION AND EDGE CASE TESTS PASSED!")

if __name__ == "__main__":
    run()
