#!/bin/sh
set -e

mkdir -p /app/data
chown -R nextjs:nodejs /app/data

gosu nextjs npm run db:init

exec gosu nextjs node /app/server.js
