#!/usr/bin/env bash
set -euo pipefail

echo "{"

# PostgreSQL
if command -v psql &>/dev/null; then
  if pg_isready -q 2>/dev/null; then
    echo '  "postgres": "RUNNING",'
  else
    echo '  "postgres": "NOT_RUNNING",'
  fi
else
  echo '  "postgres": "NOT_INSTALLED",'
fi

# MySQL
if command -v mysql &>/dev/null; then
  if mysqladmin ping -s 2>/dev/null; then
    echo '  "mysql": "RUNNING",'
  else
    echo '  "mysql": "NOT_RUNNING",'
  fi
else
  echo '  "mysql": "NOT_INSTALLED",'
fi

# MongoDB
if command -v mongosh &>/dev/null; then
  if mongosh --eval "db.runCommand({ping:1})" --quiet 2>/dev/null; then
    echo '  "mongodb": "RUNNING"'
  else
    echo '  "mongodb": "NOT_RUNNING"'
  fi
else
  echo '  "mongodb": "NOT_INSTALLED"'
fi

echo "}"
