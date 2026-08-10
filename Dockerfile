FROM nginxinc/nginx-unprivileged:1.27-alpine

LABEL org.opencontainers.image.title="Authproxycaller" \
      org.opencontainers.image.description="Stateless browser-side builder for DeepUnity Auth Proxy and Companion App calls" \
      org.opencontainers.image.version="0.2.39"

COPY --chown=101:101 nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=101:101 src/ /usr/share/nginx/html/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
