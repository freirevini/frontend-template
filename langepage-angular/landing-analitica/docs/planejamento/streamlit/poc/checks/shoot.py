"""Headless Chrome over CDP (no extra deps beyond `websockets`, already a Streamlit dependency): screenshots of the
PoC in light/dark and at 1440/375 px, plus DOM probes used to craft the CSS selectors."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

from websockets.sync.client import connect

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9333


class Browser:
    def __init__(self):
        self.profile = tempfile.mkdtemp(prefix="st-shoot-")
        self.proc = subprocess.Popen([CHROME, "--headless=new", f"--remote-debugging-port={PORT}", f"--user-data-dir={self.profile}",
                                      "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--window-size=1440,1000", "about:blank"],
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(50):
            try:
                targets = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json").read())
                page = next(t for t in targets if t["type"] == "page")
                break
            except Exception:
                time.sleep(0.2)
        self.ws = connect(page["webSocketDebuggerUrl"], max_size=None)
        self.seq = 0
        self.send("Page.enable")
        self.send("Runtime.enable")

    def send(self, method: str, **params):
        self.seq += 1
        self.ws.send(json.dumps({"id": self.seq, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.seq:
                if "error" in msg:
                    raise RuntimeError(msg["error"])
                return msg.get("result", {})

    def viewport(self, width: int, height: int, mobile: bool = False):
        self.send("Emulation.setDeviceMetricsOverride", width=width, height=height, deviceScaleFactor=1, mobile=mobile)

    def dark(self, on: bool):
        self.send("Emulation.setEmulatedMedia", features=[{"name": "prefers-color-scheme", "value": "dark" if on else "light"}])

    def go(self, url: str, settle: float = 4.0):
        self.send("Page.navigate", url=url)
        time.sleep(settle)

    def js(self, expr: str):
        res = self.send("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True)
        return res.get("result", {}).get("value")

    def shot(self, path: str, full: bool = True):
        if full:
            width = self.js("window.innerWidth")
            height = self.js("Math.max(document.querySelector('[data-testid=\"stMain\"]')?.scrollHeight || 0, document.documentElement.scrollHeight)")
            height = min(max(int(height or 1000), 600), 9000)
            self.send("Emulation.setDeviceMetricsOverride", width=width, height=height, deviceScaleFactor=1, mobile=width < 600)
            time.sleep(1.0)
            res = self.send("Page.captureScreenshot", format="png")
            self.send("Emulation.setDeviceMetricsOverride", width=width, height=1000, deviceScaleFactor=1, mobile=width < 600)
        else:
            res = self.send("Page.captureScreenshot", format="png")
        Path(path).write_bytes(__import__("base64").b64decode(res["data"]))

    def close(self):
        try:
            self.ws.close()
        finally:
            self.proc.terminate()


if __name__ == "__main__":
    base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8601"
    out = Path(sys.argv[2] if len(sys.argv) > 2 else "shots")
    out.mkdir(exist_ok=True)
    b = Browser()
    try:
        for theme in ("light", "dark"):
            b.dark(theme == "dark")
            for width, name in ((1440, "desktop"), (375, "mobile")):
                b.viewport(width, 1000, mobile=width < 600)
                for path, slug in (("/", "inicio"), ("/triagent", "triagent"), ("/scalation", "scalation")):
                    b.go(f"{base}{path}", settle=6)
                    b.shot(str(out / f"{slug}-{name}-{theme}.png"))
                    print("shot", slug, name, theme)
    finally:
        b.close()
