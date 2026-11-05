"""Headless Chrome over CDP (no extra deps: the websocket client is tornado's, a Streamlit dependency): screenshots in
light/dark and at 1440/375 px, plus DOM probes used to craft the CSS selectors.

Usage: python checks/shoot.py <base_url> [out_dir]   (or CHECK_BASE_URL=<base_url>; there is no default host, R6)"""
from __future__ import annotations

import ipaddress
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

from tornado.ioloop import IOLoop
from tornado.websocket import websocket_connect

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
# Chrome's DevTools endpoint listens only on this machine's loopback interface (the Chrome started below); it is not
# the app under test, whose address always comes from base_url().
CDP_HOST = str(ipaddress.ip_address(socket.INADDR_LOOPBACK))


def base_url(argv: list[str] | None = None, index: int = 1) -> str:
    """Base URL of the running app: argv[index] or CHECK_BASE_URL. Required: no host is versioned (R6)."""
    argv = sys.argv if argv is None else argv
    value = (argv[index] if len(argv) > index and argv[index] else os.environ.get("CHECK_BASE_URL", "")).strip().rstrip("/")
    if not value:
        sys.exit("informe a URL base do app: argumento <base_url> ou variável CHECK_BASE_URL (ex.: o endereço do streamlit run)")
    return value


def _free_port() -> int:
    """A free local port for Chrome's DevTools (several agents/checks may run Chrome at once)."""
    with socket.socket() as sock:
        sock.bind((CDP_HOST, 0))
        return sock.getsockname()[1]


class Browser:
    def __init__(self, port: int | None = None):
        self.port = port or _free_port()
        self.profile = tempfile.mkdtemp(prefix="st-shoot-")
        self.proc = subprocess.Popen([CHROME, "--headless=new", f"--remote-debugging-port={self.port}", f"--user-data-dir={self.profile}",
                                      "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--window-size=1440,1000", "about:blank"],
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(50):
            try:
                targets = json.loads(urllib.request.urlopen(f"http://{CDP_HOST}:{self.port}/json").read())
                page = next(t for t in targets if t["type"] == "page")
                break
            except Exception:
                time.sleep(0.2)
        self.loop = IOLoop()
        self.ws = self.loop.run_sync(lambda: websocket_connect(page["webSocketDebuggerUrl"], max_message_size=1 << 30))
        self.seq = 0
        self.send("Page.enable")
        self.send("Runtime.enable")

    def send(self, method: str, **params):
        self.seq += 1
        self.loop.run_sync(lambda: self.ws.write_message(json.dumps({"id": self.seq, "method": method, "params": params})))
        while True:
            msg = json.loads(self.loop.run_sync(self.ws.read_message))
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
            self.loop.close()


if __name__ == "__main__":
    base = base_url()
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
