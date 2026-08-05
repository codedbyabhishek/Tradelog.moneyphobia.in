#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MYSQL_BASE="${MYSQL_BASE:-/opt/anaconda3}"
if [ ! -x "$MYSQL_BASE/bin/mysqld" ] && [ -x "/opt/homebrew/opt/mysql/bin/mysqld" ]; then
  MYSQL_BASE="/opt/homebrew/opt/mysql"
fi
MYSQLD="$MYSQL_BASE/bin/mysqld"
MYSQL="$MYSQL_BASE/bin/mysql"
MYSQLADMIN="$MYSQL_BASE/bin/mysqladmin"
MYSQL_MESSAGE_DIR="$MYSQL_BASE/share/mysql"

TEMP_ROOT="$ROOT_DIR/.tmp/mysql"
DATADIR="$TEMP_ROOT/data"
RUN_DIR="$TEMP_ROOT/run"
LOG_DIR="$TEMP_ROOT/logs"
SOCKET="$RUN_DIR/mysql.sock"
PID_FILE="$RUN_DIR/mysql.pid"
LOG_FILE="$LOG_DIR/mysql.log"
PORT="${TEMP_MYSQL_PORT:-3307}"
DB_NAME="${TEMP_DB_NAME:-trading_journal_temp}"
INIT_SQL="$ROOT_DIR/sql/init.sql"

mkdir -p "$DATADIR" "$RUN_DIR" "$LOG_DIR"

if [ ! -d "$DATADIR/mysql" ]; then
  echo "Initializing temporary MySQL data directory at $DATADIR"
  "$MYSQLD" \
    --no-defaults \
    --basedir="$MYSQL_BASE" \
    --datadir="$DATADIR" \
    --lc-messages-dir="$MYSQL_MESSAGE_DIR" \
    --initialize-insecure
fi

if [ -f "$PID_FILE" ]; then
  EXISTING_PID="$(cat "$PID_FILE" || true)"
  if [ -n "${EXISTING_PID}" ] && kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "Temporary MySQL is already running on port $PORT"
  else
    rm -f "$PID_FILE"
  fi
fi

if [ ! -f "$PID_FILE" ]; then
  echo "Starting temporary MySQL on 127.0.0.1:$PORT"
  "$MYSQLD" \
    --no-defaults \
    --basedir="$MYSQL_BASE" \
    --datadir="$DATADIR" \
    --socket="$SOCKET" \
    --pid-file="$PID_FILE" \
    --port="$PORT" \
    --bind-address=127.0.0.1 \
    --log-error="$LOG_FILE" \
    --lc-messages-dir="$MYSQL_MESSAGE_DIR" \
    --skip-networking=0 \
    --daemonize
fi

for _ in {1..30}; do
  if "$MYSQLADMIN" --protocol=tcp -h127.0.0.1 -P"$PORT" -uroot ping >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! "$MYSQLADMIN" --protocol=tcp -h127.0.0.1 -P"$PORT" -uroot ping >/dev/null 2>&1; then
  echo "MySQL did not become ready. See $LOG_FILE"
  exit 1
fi

echo "Creating database $DB_NAME if needed"
"$MYSQL" --protocol=tcp -h127.0.0.1 -P"$PORT" -uroot -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "Applying schema from $INIT_SQL"
"$MYSQL" --protocol=tcp -h127.0.0.1 -P"$PORT" -uroot "$DB_NAME" < "$INIT_SQL"

echo
echo "Temporary MySQL is ready."
echo "Host: 127.0.0.1"
echo "Port: $PORT"
echo "User: root"
echo "Password: (empty)"
echo "Database: $DB_NAME"
echo "Socket: $SOCKET"
echo "Log: $LOG_FILE"
