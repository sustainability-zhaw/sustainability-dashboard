# sustainability-dashboard

Frontend for the ZHAW Sustainability Dashboard

## Purpose

The sustainability dashboard provides a searchable interface for the ZHAW's sustainability related activities in research and education. 

The frontend is provided by a basic caddy-server that listens on port `80`.

The dashboard is embedded into a docker container that is designed to be hosted *behind* a reverse proxy server. That proxy server maintains authentication and SSL-Termination.  

## Testing and development

For testing and development the package brings a minimal backend deployment. This allows to test against the same configuration as it would run in production. 

Testing requires that [nodejs (with npm)](https://nodejs.org) and [docker](https://docker.com) are installed on the system. 

On the command line run the following commands

```sh
npm ci 
npm run all
docker compose -f docker-compose-local.yaml up --force-recreate --remove-orphans
```

The setup takes about 30-40 seconds to fully start, because of database initialisation. After that it takes a few hours for scraping the OAI endpoint. During that time one can be amazed by observing how the data tickles into the system. 

Afterwards the dev-system is linked to a dev container, so editing takes direct effect. The dev environment is available via http://localhost:8080/. 

The [ad_resolver component](https://github.com/sustainability-zhaw/ad-resolver) is inactive during the integration testing. When it is activated then it needs an appropriate configutation. ad-resolver's configuration options are documented separately in the [component's Readme](https://github.com/sustainability-zhaw/ad-resolver). 

The dev environment has **no authentication layer**! 

- Important **The compose file is not suit for production deployments!** 

An ansible playbook for deploying the system to a Docker Swarm is available in the [docker-deploy repository](https://github.com/sustainability-zhaw/docker-deploy).
