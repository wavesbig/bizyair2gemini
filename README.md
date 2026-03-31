This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Docker Quick Start

This project can be distributed as a Docker image for other users to run directly with Docker Compose.

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Update `IMAGE_NAME`, `ADMIN_PASSWORD`, and `PROXY_API_KEY` in `.env`.

3. Start the service:

```bash
docker compose up -d
```

4. Open `http://localhost:3000`.

The container will automatically initialize `/app/data/dev.db` on first start when the mounted data directory is empty.

## Docker Hub Publish

Replace `your-dockerhub-user` with your Docker Hub namespace:

```bash
docker login
docker build -t your-dockerhub-user/bizyair2gemini:latest .
docker push your-dockerhub-user/bizyair2gemini:latest
```

If you want to publish a versioned tag too:

```bash
docker build -t your-dockerhub-user/bizyair2gemini:0.1.0 -t your-dockerhub-user/bizyair2gemini:latest .
docker push your-dockerhub-user/bizyair2gemini:0.1.0
docker push your-dockerhub-user/bizyair2gemini:latest
```

## One-Click Upload Scripts

Before first use on each device, create `.docker-publish.json` from `.docker-publish.example.json` and fill in your Docker Hub username once.

Example:

```json
{
  "dockerUser": "your-dockerhub-user",
  "imageName": "bizyair2gemini"
}
```

Windows PowerShell:

```powershell
.\upload-docker.ps1 -AlsoLatest
```

macOS / Linux:

```bash
chmod +x ./upload-docker.sh
./upload-docker.sh --also-latest
```

By default, each upload auto-increments the patch version in `package.json` and uses that version as the image tag.

If you want to force a specific version, pass `-Version 0.1.0` on Windows or `--version 0.1.0` on macOS/Linux.

If you are already logged in to Docker Hub, add `-NoLogin` on Windows or `--no-login` on macOS/Linux.

The scripts now run a preflight check before publishing:

- verify Docker CLI is installed
- verify Docker daemon is running
- verify Docker Hub credentials are present unless login is skipped
- verify the git working tree is clean

If you intentionally want to publish from a dirty working tree, add `-AllowDirty` on Windows or `--allow-dirty` on macOS/Linux.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
