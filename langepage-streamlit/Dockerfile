# PLACEHOLDER (ADR-001, D9): substituir pelo Dockerfile gerado pelo Cookiecutter do Titan (streamlit-sgen-base-ia-sample),
# que usa a imagem base corporativa e o índice do Nexus. Este arquivo só documenta o que a imagem precisa conter.
# Build local de conferência: docker build --build-arg BASE_IMAGE=python:3.11-slim -t agenda-normativa .
ARG BASE_IMAGE=python:3.11-slim
FROM ${BASE_IMAGE}

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app
COPY requirements.txt .
# Índice do pip: proxy pypi-all/simple do Nexus, passado na esteira como segredo do BuildKit (nunca versionado, R6):
#   docker build --secret id=pip_index_url,env=PIP_INDEX_URL ...
# Vale só dentro deste RUN. Nunca ENV nem ARG: ENV fica na imagem (`docker inspect`) e o valor de um ARG usado num RUN
# fica no `docker history`. Sem o segredo (build local de conferência), o pip usa o índice padrão.
RUN --mount=type=secret,id=pip_index_url \
    if [ -s /run/secrets/pip_index_url ]; then PIP_INDEX_URL="$(cat /run/secrets/pip_index_url)"; export PIP_INDEX_URL; fi; \
    pip install -r requirements.txt

COPY .streamlit/ .streamlit/
COPY settings.yaml .
COPY data/ data/
COPY src/ src/

# Non-root user, as in the sample.
RUN useradd --create-home --uid 10001 appuser && chown -R appuser /app
USER appuser

# Health: probes do k8s em /_stcore/health (k8s/deployment.yaml).
EXPOSE 8501
CMD ["streamlit", "run", "src/app.py"]
