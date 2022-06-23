# Create alpine builder 
FROM alpine:latest AS builder 

LABEL version="2022.0623.01"
RUN apk add nodejs npm

WORKDIR /app

COPY package.json package.json
COPY site site
COPY scss scss

# compile all assets
RUN npm install && npm run all

# Create runtime
FROM caddy:2.5.1

LABEL maintainer="phish108 <cpglahn@gmail.com>"
LABEL version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/dxiai/sustainability-dashboard"

COPY --from=builder /app/site /usr/share/caddy
