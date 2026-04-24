#!/usr/bin/env bash
set -euo pipefail

# SQLite Backup Script for HR System
# Creates a timestamped backup using SQLite's built-in .backup command.

DB_PATH="${HR_SYSTEM_DB_PATH:-backend/hr_system.db}"
DB_DIR=$(dirname "$DB_PATH")
BACKUP_DIR="$DB_DIR/backups"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/hr_system_${TIMESTAMP}.db"

echo "Backing up $DB_PATH -> $BACKUP_FILE"
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Keep only the 7 most recent backups.
count=0
ls -t "$BACKUP_DIR"/hr_system_*.db 2>/dev/null | while IFS= read -r file; do
    count=$((count + 1))
    if [ "$count" -gt 7 ]; then
        echo "Removing old backup: $file"
        rm -f "$file"
    fi
done

echo "Backup complete."
