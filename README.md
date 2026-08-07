# Authproxycaller

Authproxycaller is a static browser application for generating DeepUnity Auth Proxy URLs and `du-proxy-app` Companion App calls.

The production container serves only static HTML, CSS and JavaScript through Nginx. There is no backend API, database, cookie, browser storage, telemetry or access logging.

## Docker Deploy

After the GitHub workflow has published the image to GHCR, deploy it with Docker Compose:

```bash
docker compose -f docker-compose.image.yml up -d
```

The default image is:

```text
ghcr.io/syschelle/authproxycaller:latest
```

Override image or port if needed:

```bash
AUTHPROXYCALLER_IMAGE=ghcr.io/syschelle/authproxycaller:v0.1.58 WEB_PORT=18081 docker compose -f docker-compose.image.yml up -d
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

## GitHub Release

Push the repository to GitHub, then create and push a tag:

```bash
git tag v0.1.58
git push origin main
git push origin v0.1.58
```

The GitHub workflow will:

- run the Node.js tests
- build the Docker image
- publish `latest`, branch, SHA and tag images to GitHub Container Registry
- create a GitHub Release for `v*` tags

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
