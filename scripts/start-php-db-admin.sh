#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PHP_DB_ADMIN_PORT:-8081}"

cd "$ROOT_DIR/php-db-admin"
echo "Starting PHP DB admin at http://127.0.0.1:$PORT"
php -S "127.0.0.1:$PORT"
