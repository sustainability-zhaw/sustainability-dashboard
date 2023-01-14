# sustainability-dashboard

Frontend for the ZHAW Sustainability Dashboard

## Purpose

The sustainability dashboard provides a searchable interface for the ZHAW's sustainability related activities in research and education. 

The frontend is provided by a basic caddy-server that listens on port `80`.

The dashboard is embedded into a docker container that is designed to be hosted *behind* a reverse proxy server. That proxy server maintains authentication and SSL-Termination.  

## Testing and development

For testing and development the package brings a minimal backend deployment. This allows to test against the same configuration as it would run in production. 

```
docker compose -f docker-compose-local.yaml up --force-recreate --remove-orphans
```

The setup takes about 30-40 seconds to fully start, because of database initialisation.

Afterwards the dev-system is linked to a dev container, so editing takes direct effect. The dev environment is available via http://localhost:8081/. 

The dev environment has no authentication layer. 
