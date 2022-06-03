# sustainability-dashboard
Frontend for the ZHAW Sustainability Dashboard

## Purpose

The sustainability dashboard provides a searchable interface for the ZHAW's sustainability related activities in research and education. 

## Production environment

The UI is part of a prebuilt Web-Service based on the [Caddy Server](https://caddyserver.com). It is designed to reside behind a TLS terminating reverse proxy of a docker swarm or kubernetes cluster. 

```
docker build -t ghcr.io/dxiai/sustainability-dashboard:${VERSIONTAG} .
docker push ghcr.io/dxiai/sustainability-dashboard:${VERSIONTAG}
```

## Developoment 

The development environment mounts the frontend code into a caddy container. 

```
docker run --rm -d --network proxynetwork --name devcaddy multimico/caddyhelper:latest
docker exec -it devcaddy /bin/ash
```
