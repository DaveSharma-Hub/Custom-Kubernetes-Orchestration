
# What it does:

Kubernetes like orchestration tool that will create the specific number of docker containers, and ensure that they are always running. 
In the event that a running container exits or fails, it will automatically regenerate and spawn a new container for the specific image.

## Features:
- Spawns docker containers with a configuration file specifying the docker file image path, number of containers, internal docker container port and exposed port
- Ensures the minimum of containers are always running and will regenerate upon failure.

## Todo:
- Will autoscale based on rate algorithm (exponential, linear etc.) to a maximum number of containers
