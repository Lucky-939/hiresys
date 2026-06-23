# Database Backup Strategy: HireSys Interview Platform

This document outlines the backup and disaster recovery strategy for the PostgreSQL and Redis databases.

## 1. PostgreSQL Backups

### 1.1 Automated Continuous Archiving (Point-in-Time Recovery - PITR)
- **Tool**: WAL-G or pgBackRest
- **Frequency**: Continuous (WAL files shipped to S3 immediately)
- **Retention**: 30 days
- **Purpose**: Allows restoring the database to any exact second in the past 30 days, minimizing data loss to near-zero.

### 1.2 Daily Full Backups
- **Tool**: `pg_dump` or managed database provider snapshots (AWS RDS, GCP Cloud SQL)
- **Frequency**: Daily at 02:00 AM UTC (off-peak hours)
- **Retention**: 7 daily, 4 weekly, 12 monthly
- **Storage**: Encrypted S3 bucket (Standard storage class for recent, Glacier for monthly)
- **Purpose**: Fast recovery of the entire database state without needing to replay large amounts of WAL logs.

## 2. Redis Backups

Since Redis is primarily used for caching and session management (which can be regenerated), strict backup requirements are lower than PostgreSQL.

- **Strategy**: RDB (Redis Database) snapshots
- **Frequency**: Every 1 hour
- **Retention**: 24 hours
- **Storage**: Local disk or attached block storage.
- **Purpose**: Quick recovery of the background job queue (BullMQ) and rate limiter state in case of a crash.

## 3. Backup Verification & Testing

Backups are only as good as the ability to restore them.

- **Automated Verification**: A cron job runs weekly to pull the latest full backup and restore it to an isolated staging database.
- **Validation**: Basic row counts and schema validations are run against the restored database to ensure data integrity.
- **Alerting**: Any failure in the backup generation, WAL shipping, or automated restore testing triggers a P1 alert to the infrastructure team via PagerDuty/Slack.

## 4. Disaster Recovery (DR) Plan

In the event of a catastrophic database failure:

1. **Acknowledge Alert**: Engineer on call acknowledges the downtime.
2. **Assess State**: Determine if the primary database is completely unrecoverable.
3. **Failover**: If using a managed HA setup, trigger manual failover to the standby replica.
4. **Restore (If no standby)**: 
   - Provision a new database instance.
   - Restore the latest daily full backup.
   - Replay WAL logs up to the exact moment before the failure.
5. **Update Routing**: Update environment variables / DNS to point the application servers to the new database.
6. **Post-Mortem**: Document the incident, root cause, and recovery timeline.

## 5. Security

- All backups at rest in S3 must be encrypted using AES-256 (SSE-S3 or SSE-KMS).
- Access to the backup S3 bucket is restricted via IAM policies to only the backup service role and senior administrators.
- Backups must not be downloaded to local developer machines to comply with data privacy policies.
