# HR System SQLite Backups

This document explains how to back up the HR System SQLite database.

## Manual Backup

Run the provided backup script from the repository root:

```bash
./scripts/backup-sqlite.sh
```

The script reads the database path from the `HR_SYSTEM_DB_PATH` environment variable and defaults to `backend/hr_system.db`.

```bash
HR_SYSTEM_DB_PATH=/data/hr_system.db ./scripts/backup-sqlite.sh
```

Backups are stored in a `backups/` directory next to the database file (e.g., `backend/backups/`). Each backup is timestamped: `hr_system_YYYYMMDD_HHMMSS.db`. The script automatically removes backups older than the 7 most recent ones.

## Automated Scheduling

### Cron

Add a cron entry to run the backup periodically. For example, to run daily at 2:00 AM:

```bash
0 2 * * * cd /path/to/HR_System && ./scripts/backup-sqlite.sh >> /var/log/hr_system_backup.log 2>&1
```

Make sure the script is executable:

```bash
chmod +x scripts/backup-sqlite.sh
```

### systemd Timer

Create a systemd service and timer for more robust scheduling.

**1. Create the service unit** (`/etc/systemd/system/hr-system-backup.service`):

```ini
[Unit]
Description=HR System SQLite Backup

[Service]
Type=oneshot
WorkingDirectory=/path/to/HR_System
ExecStart=/path/to/HR_System/scripts/backup-sqlite.sh
Environment=HR_SYSTEM_DB_PATH=/path/to/hr_system.db
```

**2. Create the timer unit** (`/etc/systemd/system/hr-system-backup.timer`):

```ini
[Unit]
Description=Run HR System backup daily

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

**3. Enable and start the timer:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable hr-system-backup.timer
sudo systemctl start hr-system-backup.timer
```

Check the timer status with:

```bash
systemctl list-timers hr-system-backup.timer
```

## Restoring from Backup

To restore a backup, copy the desired backup file over the active database (stop the application first to avoid data corruption):

```bash
cp backend/backups/hr_system_20240115_143022.db backend/hr_system.db
```

Or use SQLite's restore command:

```bash
sqlite3 backend/hr_system.db ".restore 'backend/backups/hr_system_20240115_143022.db'"
```
