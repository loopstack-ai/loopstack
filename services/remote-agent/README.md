# Loopstack Remote Agent

Lightweight agent service running on remote instances for file and command operations.

## Publishing the Docker Image

### Prerequisites

Install flyctl (macOS):

```sh
brew install flyctl
```

Log in to Fly.io:

```sh
fly auth login
```

Create the Fly app (one-time):

```sh
fly apps create builder-agent
```

Authenticate Docker with Fly's registry:

```sh
fly auth docker
```

### Build and Push

The image must be built for `linux/amd64` since Fly machines run on x86_64.

```sh
npm run docker:build   # Build for linux/amd64
npm run docker:push    # Push to registry.fly.io
```

### Verify correct architecture (amd64)

```sh
docker inspect --format='{{.Architecture}}' registry.fly.io/builder-agent:latest
```

### Hub Backend Configuration

Set the following env var on the hub-backend so that new Fly instances use this image:

```
FLY_IMAGE=registry.fly.io/builder-agent:latest
```
