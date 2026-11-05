"""F1 check (Streamlit 1.40): app chrome on every page in light/dark at 1440/375 px, exceptions, theme probe, sidebar
section link, theme selector. Usage: python checks/f1_chrome.py <base_url> [out_dir] (or CHECK_BASE_URL; no default host)"""
import sys
import time
from pathlib import Path

from shoot import Browser, base_url  # noqa: E402  (same folder)

BASE = base_url()
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else "shots")
OUT.mkdir(parents=True, exist_ok=True)
PAGES = [("/", "inicio"), ("/triagent", "triagent"), ("/scalation", "scalation"), ("/analitico", "analitico")]

EXC = """Array.from(document.querySelectorAll('[data-testid="stException"]')).map(e => e.innerText.split('\\n').slice(0, 3).join(' ')).join(' | ') || 'none'"""
STATE = """JSON.stringify({bg: getComputedStyle(document.querySelector('[data-testid="stMain"]')).backgroundColor,
  sidebar: getComputedStyle(document.querySelector('[data-testid="stSidebar"]') || document.body).backgroundColor,
  font: getComputedStyle(document.querySelector('.brand-breadcrumb') || document.body).fontFamily.slice(0, 20),
  crumb: document.querySelector('.brand-breadcrumb')?.innerText, date: document.querySelector('.brand-header-date')?.innerText,
  modeKey: localStorage.getItem('brand-theme-mode'), stKeys: Object.keys(localStorage).filter(k => k.startsWith('stActiveTheme')).length,
  interLoaded: document.fonts.check('500 14px Inter')})"""


def run(b, theme_mode):
    for width, name in ((1440, "desktop"), (375, "mobile")):
        b.viewport(width, 1000, mobile=width < 600)
        for path, slug in PAGES:
            b.go(f"{BASE}{path}", settle=7)
            print(f"{slug:10} {name:7} {theme_mode:5} exc={b.js(EXC)[:300]}")
            if slug in ("inicio", "analitico"):
                print("   ", b.js(STATE))
            b.shot(str(OUT / f"{slug}-{name}-{theme_mode}.png"), full=width > 600)


b = Browser()
try:
    b.dark(False)
    b.viewport(1440, 1000)
    b.go(f"{BASE}/analitico", settle=7)
    run(b, "light")
    # Theme selector: open the popover, click "Escuro" (writes Streamlit's key and reloads)
    b.viewport(1440, 1000)
    b.go(f"{BASE}/analitico", settle=7)
    print("open menu:", b.js("(() => { const el = document.querySelector('.st-key-theme-menu [data-testid=\"stPopoverButton\"]'); if (!el) return 'MISSING'; el.click(); return 'ok'; })()"))
    time.sleep(1)
    b.shot(str(OUT / "theme-menu-light.png"), full=False)
    print("click Escuro:", b.js("(() => { const el = document.querySelector('.st-key-theme-dark button'); if (!el) return 'MISSING'; el.click(); return 'ok'; })()"))
    time.sleep(9)
    print("after dark:", b.js(STATE))
    run(b, "dark")
    # Sidebar sub-item: Triagent > Tabela Analítica
    b.viewport(1440, 1000)
    b.go(f"{BASE}/analitico", settle=7)
    print("expand Triagent:", b.js("(() => { const s = document.querySelector('.st-key-nav-group-triagent summary'); if (!s) return 'MISSING'; s.click(); return 'ok'; })()"))
    time.sleep(1)
    print("click sub:", b.js("(() => { const el = document.querySelector('.st-key-nav-triagent-tabela-analitica button'); if (!el) return 'MISSING'; el.click(); return 'ok'; })()"))
    time.sleep(8)
    print("url:", b.js("location.pathname"), "active:", b.js("Array.from(document.querySelectorAll('[class*=\"st-key-navsub-\"][class*=\"-active\"]')).map(e => e.innerText).join(',')"),
          "scrollTop:", b.js("document.querySelector('[data-testid=\"stMain\"]').scrollTop"), "exc:", b.js(EXC)[:300])
    b.shot(str(OUT / "section-link-dark.png"), full=False)
    # Back to light via the selector
    b.js("document.querySelector('.st-key-theme-menu [data-testid=\"stPopoverButton\"]')?.click()")
    time.sleep(1)
    b.js("document.querySelector('.st-key-theme-light button')?.click()")
    time.sleep(9)
    print("after light:", b.js(STATE))
    # /dashboard redirect
    b.go(f"{BASE}/dashboard", settle=8)
    print("dashboard ->", b.js("location.pathname"), b.js("document.querySelector('.brand-breadcrumb')?.innerText"))
finally:
    b.close()
