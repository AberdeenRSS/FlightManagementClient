User docker command:
```shell
docker build . -f .dockerfile -t rssrocketcontrolcontainer.azurecr.io/rss/flight-management-client
```

Then

```shell
docker login rssrocketcontrolcontainer.azurecr.io
```

and

```shell
docker push rssrocketcontrolcontainer.azurecr.io/rss/flight-management-client
```

Registry docs:
https://learn.microsoft.com/en-us/azure/container-registry/container-registry-get-started-docker-cli?tabs=azure-cli