#!/bin/sh
set -e

npm run db:init

exec node /app/server.js
