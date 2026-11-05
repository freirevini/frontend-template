"""Dockerfile (placeholder of the Titan sample): the pip index URL of the pipeline never stays in the image (E-022)."""
from __future__ import annotations

import re
from pathlib import Path

DOCKERFILE = Path(__file__).resolve().parents[1] / "Dockerfile"


def _instructions() -> list[str]:
    """Dockerfile instructions with continuation lines joined and comments dropped."""
    text = re.sub(r"\\\n", " ", DOCKERFILE.read_text(encoding="utf-8"))
    return [line.strip() for line in text.splitlines() if line.strip() and not line.strip().startswith("#")]


def test_pip_index_url_is_never_env_nor_arg():
    for line in _instructions():
        keyword = line.split()[0].upper()
        if keyword in ("ENV", "ARG"):
            assert "PIP_INDEX_URL" not in line, line  # ENV stays in the image; an ARG used by RUN stays in docker history


def test_pip_install_reads_the_index_from_a_buildkit_secret():
    runs = [line for line in _instructions() if line.upper().startswith("RUN") and "pip install" in line]
    assert len(runs) == 1
    assert "--mount=type=secret,id=pip_index_url" in runs[0] and "/run/secrets/pip_index_url" in runs[0]
