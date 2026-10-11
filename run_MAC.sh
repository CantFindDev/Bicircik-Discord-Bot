#!/bin/sh
set -eu

cd "$(dirname "$0")"

# Prints the message to stderr and exits with failure.
fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

command -v node >/dev/null 2>&1 || fail "Node.js was not found. Install it from https://nodejs.org and run this again."

if [ ! -f .env ]; then
  cp .env-Example .env
  fail "Created .env from .env-Example. Fill in the values and run this again."
fi

stamp=$(node -p "process.platform+'-'+process.arch+'-'+require('crypto').createHash('sha1').update(require('fs').readFileSync('package-lock.json')).digest('hex')")
installed=$(cat node_modules/.run-stamp 2>/dev/null || true)

if [ "$stamp" != "$installed" ]; then
  npm install
  printf '%s\n' "$stamp" > node_modules/.run-stamp
fi

exec node src/index.js
