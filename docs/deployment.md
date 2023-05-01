User docker command:
```shell
docker build . -t rssrocketcontrolcontainer.azurecr.io/rss/flight-management-client:latest -t rssrocketcontrolcontainer.azurecr.io/rss/flight-management-client:v
```

Then

```shell
docker login rssrocketcontrolcontainer.azurecr.io
```

and

```shell
docker push rssrocketcontrolcontainer.azurecr.io/rss/flight-management-client -a
```

Registry docs:
https://learn.microsoft.com/en-us/azure/container-registry/container-registry-get-started-docker-cli?tabs=azure-cli