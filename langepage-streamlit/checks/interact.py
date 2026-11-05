"""Interaction checks over CDP: page filter, cross filters, clickable legend (Components v2), chat, theme switch,
section links and the 375 px layout. Usage: python checks/interact.py <base_url> (or CHECK_BASE_URL; no default host)."""
import time

from shoot import Browser, base_url  # noqa: E402  (same folder)

BASE = base_url()
OUT = "../shots"


def click(b, selector_js):
    return b.js(f"(() => {{ const el = {selector_js}; if (!el) return 'MISSING'; el.scrollIntoView({{block: 'center'}}); el.click(); return 'clicked'; }})()")


def by_text(tag, text):
    return f"Array.from(document.querySelectorAll({tag!r})).find(e => e.textContent.trim() === {text!r})"


def exceptions(b):
    return b.js("""Array.from(document.querySelectorAll('[data-testid="stException"]')).map(e => e.innerText.slice(0, 300)).join(' | ')""") or "none"


b = Browser()
try:
    b.dark(False)
    b.viewport(1440, 1000)
    b.go(f"{BASE}/triagent", settle=7)

    # 1. "a classificar" page filter
    print("1 click badge:", click(b, by_text("button p", "7 a classificar") + "?.closest('button')"))
    time.sleep(4)
    print("   notice:", b.js("document.querySelector('.brand-notice')?.innerText.slice(0, 90)"))
    print("   dashed label:", b.js("Array.from(document.querySelectorAll('.brand-traffic-legend')).map(e => e.innerText.split('\\n')[0]).join(' | ')"))
    print("   pie subtitle:", b.js("document.querySelector('.st-key-card-normas-aplicaveis .brand-card-subtitle')?.innerText"))
    print("   table subtitle:", b.js("document.querySelector('.st-key-card-tabela-analitica .brand-card-subtitle')?.innerText"))
    b.shot(f"{OUT}/i1-filter.png", full=False)

    # 2. theme row (Components v2 clicklist) filters the pie
    print("2 click theme row:", click(b, "document.querySelector('button.brand-theme-row')"))
    time.sleep(4)
    print("   pie subtitle:", b.js("document.querySelector('.st-key-card-normas-aplicaveis .brand-card-subtitle')?.innerText"))
    print("   row active:", b.js("document.querySelector('button.brand-theme-row')?.className"))
    print("   classification notice:", b.js("Array.from(document.querySelectorAll('.brand-notice')).map(e => e.innerText.slice(0, 60)).join(' || ')"))

    # 3. legend highlight (Components v2 clicklist)
    print("3 click legend Corporativo:", click(b, "document.querySelector('button.brand-traffic-legend[data-value=\"1\"]')"))
    time.sleep(4)
    print("   legend classes:", b.js("Array.from(document.querySelectorAll('.brand-traffic-legend')).map(e => e.className.trim()).join(' | ')"))
    print("   exceptions:", exceptions(b))

    # 4. section link from the sidebar (page_link with query param) scrolls to the section
    print("4 click sidebar sub-item:", click(b, "document.querySelector('[data-testid=\"stSidebar\"] a[href$=\"secao=tabela-analitica\"]')"))
    time.sleep(5)
    print("   url:", b.js("location.href"), "scrollTop:", b.js("document.querySelector('[data-testid=\"stMain\"]').scrollTop"))
    print("   active sub-item:", b.js("Array.from(document.querySelectorAll('[data-testid=\"stSidebar\"] [class*=\"-active\"]')).map(e => e.className.split(' ').find(c => c.startsWith('st-key'))).join(',')"))

    # 5. chat: open popover, pick an option, type a question
    print("5 open chat:", click(b, "document.querySelector('.st-key-chat-fab [data-testid=\"stPopoverButton\"]')"))
    time.sleep(4)
    print("   messages:", b.js("Array.from(document.querySelectorAll('.chat-msg__bubble')).map(e => e.innerText.slice(0, 70)).join(' || ')"))
    print("   suggestions:", b.js("Array.from(document.querySelectorAll('.st-key-chat-suggestions button')).map(e => e.innerText).join(' | ')"))
    b.shot(f"{OUT}/i5-chat-open.png", full=False)
    print("   click option:", click(b, by_text(".st-key-chat-suggestions button p", "Consultar uma norma") + "?.closest('button')"))
    time.sleep(4)
    print("   popover still open:", b.js("!!document.querySelector('[data-testid=\"stPopoverBody\"]')"))
    if not b.js("!!document.querySelector('[data-testid=\"stPopoverBody\"]')"):
        click(b, "document.querySelector('.st-key-chat-fab [data-testid=\"stPopoverButton\"]')")
        time.sleep(3)
    print("   messages:", b.js("Array.from(document.querySelectorAll('.chat-msg__bubble')).map(e => e.innerText.slice(0, 60)).join(' || ')"))
    print("   chat input present:", b.js("!!document.querySelector('[data-testid=\"stChatInput\"]')"))
    focused = b.js("(() => { const ta = document.querySelector('[data-testid=\"stChatInput\"] textarea'); if (!ta) return false; ta.focus(); return true; })()")
    if focused:
        b.send("Input.insertText", text="Qual o prazo de adequação da resolução?")
        time.sleep(0.5)
        b.send("Input.dispatchKeyEvent", type="keyDown", key="Enter", code="Enter", windowsVirtualKeyCode=13, nativeVirtualKeyCode=13)
        b.send("Input.dispatchKeyEvent", type="keyUp", key="Enter", code="Enter", windowsVirtualKeyCode=13, nativeVirtualKeyCode=13)
        time.sleep(5)
        if not b.js("!!document.querySelector('[data-testid=\"stPopoverBody\"]')"):
            click(b, "document.querySelector('.st-key-chat-fab [data-testid=\"stPopoverButton\"]')")
            time.sleep(3)
        print("   after question:", b.js("Array.from(document.querySelectorAll('.chat-msg__bubble')).slice(-2).map(e => e.innerText.slice(0, 120)).join(' || ')"))
        print("   feedback widget:", b.js("!!document.querySelector('[data-testid=\"stFeedback\"]')"))
        b.shot(f"{OUT}/i5-chat-answer.png", full=False)
    print("   exceptions:", exceptions(b))

    # 6. theme switch through the header menu (localStorage + reload)
    b.js("for (const p of [location.pathname, '/']) localStorage.setItem('stActiveTheme-' + p + '-v2', JSON.stringify('Dark')); location.reload(); 1")
    time.sleep(7)
    print("6 dark via storage: main bg =", b.js("getComputedStyle(document.querySelector('[data-testid=\"stMain\"]')).backgroundColor"),
          "sidebar bg =", b.js("getComputedStyle(document.querySelector('[data-testid=\"stSidebar\"]')).backgroundColor"),
          "theme.type seen by python =", b.js("document.documentElement.style.getPropertyValue('--brand-surface-card') || getComputedStyle(document.documentElement).getPropertyValue('--brand-surface-card')"))
    b.shot(f"{OUT}/i6-dark-forced.png")
    b.js("for (const p of [location.pathname, '/']) localStorage.setItem('stActiveTheme-' + p + '-v2', JSON.stringify('System')); location.reload(); 1")
    time.sleep(6)
    print("   back to system: main bg =", b.js("getComputedStyle(document.querySelector('[data-testid=\"stMain\"]')).backgroundColor"))

    # 7. mobile layout
    b.viewport(375, 800, mobile=True)
    b.go(f"{BASE}/triagent", settle=7)
    b.shot(f"{OUT}/i7-mobile.png")
    print("7 mobile: sidebar visible =", b.js("(() => { const s = document.querySelector('[data-testid=\"stSidebar\"]'); return s ? s.getAttribute('aria-expanded') : 'none'; })()"),
          "horizontal overflow =", b.js("document.querySelector('[data-testid=\"stMain\"]').scrollWidth + '/' + window.innerWidth"))
finally:
    b.close()
