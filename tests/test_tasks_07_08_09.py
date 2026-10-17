import os
import time
from playwright.sync_api import sync_playwright

def test_tasks_07_08_09():
    html_path = os.path.abspath('index.html').replace('\\', '/')
    pdf_sample = os.path.abspath('data/16 set. 2026 - 15 out. 2026.pdf')
    pdf_long = os.path.abspath('data/01 fev. 2026 - 30 set. 2026.pdf')

    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True, args=['--allow-file-access-from-files'])
        page = browser.new_page()
        page.goto(f'file:///{html_path}')

        # -------------------------------------------------------------
        # Test PDF 1 (Sample: 16 set - 15 out)
        # -------------------------------------------------------------
        page.set_input_files('#pdf-input', pdf_sample)
        page.wait_for_selector('#table-body tr', timeout=10000)
        time.sleep(0.5)

        c2_main_pdf1 = page.locator('#summary-balance').inner_text()
        c2_desc_pdf1 = page.locator('#summary-balance-desc').inner_text()
        print('PDF1 Card 2 Main:', c2_main_pdf1)
        print('PDF1 Card 2 Desc:', c2_desc_pdf1)
        assert c2_main_pdf1 == '+01h 43m', f'Expected +01h 43m, got {c2_main_pdf1}'
        assert '-25h 52m' in c2_desc_pdf1 and '0m' in c2_desc_pdf1, f'Unexpected desc: {c2_desc_pdf1}'

        # -------------------------------------------------------------
        # Test PDF 2 (Long: 01 fev - 30 set)
        # -------------------------------------------------------------
        page.set_input_files('#pdf-input', pdf_long)
        page.wait_for_selector('#table-body tr', timeout=10000)
        time.sleep(0.5)

        c2_main_pdf2 = page.locator('#summary-balance').inner_text()
        c2_desc_pdf2 = page.locator('#summary-balance-desc').inner_text()
        print('PDF2 Card 2 Main:', c2_main_pdf2)
        print('PDF2 Card 2 Desc:', c2_desc_pdf2)
        assert c2_main_pdf2 == '+26h 54m', f'Expected +26h 54m, got {c2_main_pdf2}'
        assert '+44h 48m' in c2_desc_pdf2 and '0m' in c2_desc_pdf2, f'Unexpected desc: {c2_desc_pdf2}'

        # Check copy button on extra_work day (e.g. 08/mar/2026)
        mar08_row = page.locator('tr:has-text("08 mar. 2026")')
        assert mar08_row.count() > 0, "08 mar. 2026 row not found in only_exceptions view"
        copy_buttons = mar08_row.locator('.copy-btn')
        print('08/mar copy buttons count:', copy_buttons.count())
        assert copy_buttons.count() == 4, f"Expected 4 copy buttons, got {copy_buttons.count()}"
        
        first_btn = copy_buttons.first
        first_btn.click()
        time.sleep(0.3)
        assert 'copied' in (first_btn.get_attribute('class') or ''), 'copied class not added'
        print('08/mar copy button clicked and marked copied')

        # Check badge on 29/jun
        # Since 29/jun has originalBalance -3m, with threshold=30m it's absorbed into keep_standard.
        # Switch to all dates to view it:
        page.click('#filter-all')
        time.sleep(0.3)

        jun29_row = page.locator('tr:has-text("29 jun. 2026")')
        assert jun29_row.count() > 0, "29 jun. 2026 row not found"
        jun29_text = jun29_row.inner_text()
        assert 'Feriado / + 04h 45m' in jun29_text, f"Missing partial holiday note in 29 jun: {jun29_text}"
        print('29/jun partial holiday badge confirmed:', 'Feriado / + 04h 45m')

        # Check badge on 14/abr
        apr14_row = page.locator('tr:has-text("14 abr. 2026")')
        assert apr14_row.count() > 0, "14 abr. 2026 row not found"
        apr14_text = apr14_row.inner_text()
        assert 'Batida incompleta' in apr14_text, f"Missing missing punch badge in 14 abr: {apr14_text}"
        print('14/abr missing punch badge confirmed:', 'Batida incompleta (???)')

        # Check tailwind custom class presence in computed style
        computed_size = page.evaluate("() => { const el = document.querySelector('.text-2xs'); return el ? window.getComputedStyle(el).fontSize : null; }")
        print('Computed font-size for .text-2xs:', computed_size)
        assert computed_size in ['11px', '0.6875rem'], f"Unexpected font-size for 2xs: {computed_size}"

        print("\n>>> ALL VALIDATION TESTS FOR TASKS 07, 08, 09 PASSED SUCCESSFULLY! <<<")

if __name__ == '__main__':
    test_tasks_07_08_09()
