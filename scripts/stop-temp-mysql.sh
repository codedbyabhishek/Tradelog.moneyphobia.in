#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MYSQLADMIN="/opt/anaconda3/bin/mysqladmin"
PID_FILE="$ROOT_DIR/.tmp/mysql/run/mysql.pid"
PORT="${TEMP_MYSQL_PORT:-3307}"

if [ -f "$PID_FILE" ]; then
  "$MYSQLADMIN" --protocol=tcp -h127.0.0.1 -P"$PORT" -uroot shutdown || true
  rm -f "$PID_FILE"
  echo "Temporary MySQL stopped."
else
  echo "Temporary MySQL is not running."
fi
