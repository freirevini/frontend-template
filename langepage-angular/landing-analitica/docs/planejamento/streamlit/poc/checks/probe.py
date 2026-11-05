"""DOM probes + quick screenshots for one page of the PoC."""
import sys
from pathlib import Path

from shoot import Browser  # noqa: E402  (same folder)

url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8601/triagent"
out = sys.argv[2] if len(sys.argv) > 2 else "probe.png"
dark = len(sys.argv) > 3 and sys.argv[3] == "dark"
width = int(sys.argv[4]) if len(sys.argv) > 4 else 1440

b = Browser()
try:
    b.dark(dark)
    b.viewport(width, 1000, mobile=width < 600)
    b.go(url, settle=7)
    errors = b.js("""Array.from(document.querySelectorAll('[data-testid="stException"], [data-testid="stAlertContainer"]')).map(e => e.innerText.slice(0, 600)).join('\\n---\\n')""")
    print("EXCEPTIONS:", errors or "none")
    probes = {
        "pills": '[data-testid="stPills"] button',
        "pillsActive": '[data-testid="stPills"] button[aria-checked="true"], [data-testid="stPills"] button[kind*="Active"]',
        "segmented": '[data-testid="stSegmentedControl"] button',
        "popover": '[data-testid="stPopover"]',
        "popoverBtn": '[data-testid="stPopover"] button',
        "cardWrap": '[class*="st-key-card-"]',
        "cardWrapChild": '[class*="st-key-card-"] > *',
        "borderWrap": '[data-testid="stVerticalBlockBorderWrapper"]',
        "pageLink": '[data-testid="stSidebar"] [data-testid="stPageLink"]',
        "expander": '[data-testid="stSidebar"] [data-testid="stExpander"]',
        "sidebarHeader": '[data-testid="stSidebarHeader"]',
        "header": '[data-testid="stHeader"]',
        "mainBlock": '[data-testid="stMainBlockContainer"]',
        "tertiaryBtn": '[class*="st-key-seg-"] button',
        "segContainer": '[class*="st-key-seg-"]',
        "clicklist": '.brand-clicklist',
        "plotly": '[data-testid="stPlotlyChart"]',
        "chatFab": '.st-key-chat-fab',
        "horizontal": '.st-key-traffic-head',
    }
    for name, sel in probes.items():
        info = b.js(f"""(() => {{ const el = document.querySelector({sel!r}); if (!el) return 'MISSING'; const r = el.getBoundingClientRect(); return `count=${{document.querySelectorAll({sel!r}).length}} tag=${{el.tagName}} class=${{el.className && el.className.toString().slice(0,120)}} kind=${{el.getAttribute('kind')}} aria=${{el.getAttribute('aria-checked')}} size=${{Math.round(r.width)}}x${{Math.round(r.height)}} bg=${{getComputedStyle(el).backgroundColor}} font=${{getComputedStyle(el).fontFamily.slice(0,30)}} | ` + el.outerHTML.slice(0, 260).replace(/\\n/g, ' '); }})()""")
        print(f"[{name}] {info}")
    print("FONT CHECK body:", b.js("getComputedStyle(document.body).fontFamily"))
    print("THEME VARS:", b.js("getComputedStyle(document.documentElement).getPropertyValue('--brand-primary')"), b.js("getComputedStyle(document.documentElement).getPropertyValue('--st-primary-color') || 'no --st-primary-color on :root'"))
    b.shot(out)
    print("saved", out)
finally:
    b.close()
