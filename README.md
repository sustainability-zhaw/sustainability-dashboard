# sustainability-dashboard
Frontend for the ZHAW Sustainability Dashboard

## Purpose

The sustainability dashboard provides a searchable interface for the ZHAW's sustainability related activities in research and education. 

The frontend is provided by a basic caddy-server that listens on port `80`.

The dashboard is embedded into a docker container that is designed to be hosted *behind* a reverse proxy server. That proxy server maintains authentication and SSL-Termination.  

## Production environment

The UI is part of a prebuilt Web-Service based on the [Caddy Server](https://caddyserver.com). It is designed to reside behind a TLS terminating reverse proxy of a docker swarm or kubernetes cluster.

```
docker build -t ghcr.io/dxiai/sustainability-dashboard:${VERSIONTAG} .
docker push ghcr.io/dxiai/sustainability-dashboard:${VERSIONTAG}
```

## Testing

One can test the frontend using the following command. 

```
docker run --rm -d -p 8080:80 --name devcaddy multimico/caddyhelper:latest
```

## Developoment 

The development environment mounts the frontend code into a caddy container. 

```
docker run --rm -d --network proxynetwork --name devcaddy multimico/caddyhelper:latest
docker exec -it devcaddy /bin/ash
```
