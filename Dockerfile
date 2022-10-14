# Create runtime (public) container
FROM caddy:2.5.1

LABEL maintainer="phish108 <cpglahn@gmail.com>"
LABEL org.opencontainers.image.source="https://github.com/dxiai/sustainability-dashboard"

COPY Caddyfile /etc/caddy/Caddyfile
COPY site /usr/share/caddy
