# Authproxycaller

Authproxycaller is a static browser application for generating DeepUnity Auth Proxy URLs and `du-proxy-app` Companion App calls.

The production container serves only static HTML, CSS and JavaScript through Nginx. There is no backend API, database, cookie, browser storage, telemetry or access logging.

## Docker Deploy

Deploy the published GHCR image with Docker Compose:

```bash
docker compose -f docker-compose.image.yml up -d
```

The default image is:

```text
ghcr.io/syschelle/authproxycaller:latest
```

Override image or port if needed:

```bash
AUTHPROXYCALLER_IMAGE=ghcr.io/syschelle/authproxycaller:latest WEB_PORT=18081 docker compose -f docker-compose.image.yml up -d
```

Open:

```text
http://<DOCKER-HOST>:8080
```

With `WEB_PORT=18081`:

```text
http://<DOCKER-HOST>:18081
```

Health check:

```text
http://<DOCKER-HOST>:18081/healthz
```

## Update Existing Deployment

Update the Compose file and pull the newest image:

```bash
git pull
docker compose -f docker-compose.image.yml pull
docker compose -f docker-compose.image.yml up -d --force-recreate
```

If the deployment uses custom environment values, pass them again during the recreate:

```bash
AUTHPROXYCALLER_IMAGE=ghcr.io/syschelle/authproxycaller:latest WEB_PORT=18081 docker compose -f docker-compose.image.yml pull
AUTHPROXYCALLER_IMAGE=ghcr.io/syschelle/authproxycaller:latest WEB_PORT=18081 docker compose -f docker-compose.image.yml up -d --force-recreate
```

Check the updated container:

```bash
docker compose -f docker-compose.image.yml ps
docker compose -f docker-compose.image.yml logs --tail=50 authproxycaller
```

The GitHub workflow runs the Node.js tests, builds the Docker image and publishes `latest`, branch and SHA images to GitHub Container Registry.

## Local Development

Run tests:

```bash
npm test
```

Build a local image:

```bash
docker build -t authproxycaller:local .
```

Run locally:

```bash
docker run --rm -p 18081:8080 authproxycaller:local
```

## Security Notes

- static frontend only
- unprivileged Nginx image
- read-only container filesystem
- Linux capabilities dropped
- `no-new-privileges`
- Nginx access log disabled
- restrictive security headers
- no third-party runtime assets
