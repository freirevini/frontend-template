# Image of the landing-analitica front: one image promoted DES -> UAT -> PRD.
# Per-environment settings come from src/assets/env.json, overridden at runtime by a ConfigMap mounted at
# /usr/share/nginx/html/assets/env.json. /api/* is routed by the Ingress to the BFF, not by this container.
#
# Both base images are build arguments. The defaults are PUBLIC PLACEHOLDERS for local tests only; the pipeline
# passes the corporate images (Node 22 build image and non-root web image) from the corporate registry:
#   docker build --build-arg NODE_IMAGE=<corporate node 22> --build-arg WEB_IMAGE=<corporate non-root nginx> \
#     --build-arg NPM_REGISTRY=<corporate npm proxy> --secret id=npmrc,src=<npm user config with the auth line> .

# Placeholder: replace with the Node 22 image of the corporate registry (Angular 20 requires Node ^22.12).
ARG NODE_IMAGE=node:22
# Placeholder: replace with the corporate non-root Nginx image (must listen on 8080 and run as a non-root user).
ARG WEB_IMAGE=nginxinc/nginx-unprivileged:1.27-alpine

FROM ${NODE_IMAGE} AS build
# Registry read by the versioned .npmrc (registry=${NPM_REGISTRY}). The default is the public registry, for local tests
# only; the pipeline passes the corporate npm proxy (--build-arg NPM_REGISTRY=...). Declared in this discarded stage,
# so it never reaches the final image.
ARG NPM_REGISTRY=https://registry.npmjs.org/
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
# Registry credentials: optional BuildKit secret "npmrc" (a user config with the auth line of the registry), mounted
# only while this command runs and never written to a layer. Without the secret, npm ci runs anonymously.
# Scripts are explicitly allowed: esbuild (Angular build) installs its native binary in a postinstall script.
RUN --mount=type=secret,id=npmrc,required=false NPM_CONFIG_USERCONFIG=/run/secrets/npmrc npm ci --ignore-scripts=false
COPY . .
RUN npm run build:prod

FROM ${WEB_IMAGE}
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist/landing-analitica/browser /usr/share/nginx/html
# The web image already runs as a non-root user; nothing here switches back to root.
EXPOSE 8080
