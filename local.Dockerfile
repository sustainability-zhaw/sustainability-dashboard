FROM node:20-buster-slim as build

COPY . /build
RUN cd /build && npm ci && npm run all

# Create runtime (public) container
FROM caddy:2.6.2

LABEL maintainer="phish108 <cpglahn@gmail.com>"
LABEL org.opencontainers.image.source="https://github.com/dxiai/sustainability-dashboard"

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /build/site /usr/share/caddy

# Caddy seems to do some magic on our caddy file
RUN /usr/bin/caddy fmt /etc/caddy/Caddyfile > /etc/caddy/Caddyfile.fmt && \
    mv /etc/caddy/Caddyfile.fmt /etc/caddy/Caddyfile
