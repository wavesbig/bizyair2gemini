#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

DOCKER_USER=""
IMAGE_NAME=""
VERSION=""
ALSO_LATEST="false"
NO_LOGIN="false"
ALLOW_DIRTY="false"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --image-name)
      IMAGE_NAME="$2"
      shift 2
      ;;
    --version)
      VERSION="$2"
      shift 2
      ;;
    --also-latest)
      ALSO_LATEST="true"
      shift 1
      ;;
    --no-login)
      NO_LOGIN="true"
      shift 1
      ;;
    --allow-dirty)
      ALLOW_DIRTY="true"
      shift 1
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: sh ./upload-docker.sh [--image-name bizyair2gemini] [--version 0.1.0] [--also-latest] [--no-login] [--allow-dirty]"
      exit 1
      ;;
  esac
done

if [ -f "$SCRIPT_DIR/.docker-publish.json" ]; then
  if [ -z "$DOCKER_USER" ]; then
    DOCKER_USER="$(node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(c.dockerUser||'')" "$SCRIPT_DIR/.docker-publish.json")"
  fi
  if [ -z "$IMAGE_NAME" ]; then
    IMAGE_NAME="$(node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(c.imageName||'')" "$SCRIPT_DIR/.docker-publish.json")"
  fi
fi

if [ -z "$DOCKER_USER" ] && [ -n "${DOCKERHUB_USER:-}" ]; then
  DOCKER_USER="$DOCKERHUB_USER"
fi

if [ -z "$IMAGE_NAME" ]; then
  IMAGE_NAME="bizyair2gemini"
fi

if [ -z "$DOCKER_USER" ]; then
  echo "Missing Docker Hub username. Create .docker-publish.json from .docker-publish.example.json, or set DOCKERHUB_USER."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI is not installed or not in PATH."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not available. Start Docker Desktop and try again."
  exit 1
fi

if [ "$NO_LOGIN" != "true" ] && [ ! -f "${HOME}/.docker/config.json" ]; then
  echo "Docker Hub login not detected. Run 'docker login' first or pass --no-login only if you are already authenticated."
  exit 1
fi

if [ "$ALLOW_DIRTY" != "true" ]; then
  if [ -n "$(git -C "$SCRIPT_DIR" status --porcelain)" ]; then
    echo "Git working tree is not clean. Commit/stash changes first, or rerun with --allow-dirty."
    exit 1
  fi
fi

REPO="${DOCKER_USER}/${IMAGE_NAME}"

if [ -z "$VERSION" ]; then
  VERSION="$(cd "$SCRIPT_DIR" && node ./scripts/prepare-docker-version.js)"
else
  VERSION="$(cd "$SCRIPT_DIR" && node ./scripts/prepare-docker-version.js --version "$VERSION")"
fi

VERSION_TAG="${REPO}:${VERSION}"

echo "Repository: ${REPO}"
echo "Version tag: ${VERSION_TAG}"

if [ "$NO_LOGIN" != "true" ]; then
  echo "Logging in to Docker Hub..."
  docker login
fi

echo "Building image ${VERSION_TAG} ..."
docker build --build-arg APP_VERSION="${VERSION}" -t "${VERSION_TAG}" "$SCRIPT_DIR"

echo "Pushing image ${VERSION_TAG} ..."
docker push "${VERSION_TAG}"

if [ "$ALSO_LATEST" = "true" ] && [ "$VERSION" != "latest" ]; then
  LATEST_TAG="${REPO}:latest"
  echo "Tagging ${VERSION_TAG} as ${LATEST_TAG} ..."
  docker tag "${VERSION_TAG}" "${LATEST_TAG}"

  echo "Pushing image ${LATEST_TAG} ..."
  docker push "${LATEST_TAG}"
fi

echo "Persisting version ${VERSION} to package.json ..."
(cd "$SCRIPT_DIR" && node ./scripts/prepare-docker-version.js --version "$VERSION" --commit >/dev/null)

echo "Done."
