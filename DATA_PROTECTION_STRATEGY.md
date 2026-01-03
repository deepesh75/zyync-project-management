# Data Protection & Retention Strategy

## Current Status ✅

### What's Already Protected:
1. **Database Cascading Deletes**: Your Prisma schema uses `onDelete: Cascade` for related data
2. **Neon PostgreSQL**: Production-grade database with built-in reliability
3. **Activity Logging**: You have an Activity model tracking changes to tasks
4. **Database Indexes**: Proper indexing for performance and data integrity

## Critical Improvements Needed 🚨

### 1. Soft Deletes (Immediate Priority)
**Problem**: Hard deletes permanently remove data with no recovery option.

**Solution**: Implement soft deletes for critical models:
- Tasks
- Projects
- Comments
- Labels
- Columns (within project configuration)

### 2. Neon Database Backups (Immediate)
**Neon Advantages**:
- ✅ Automatic backups (point-in-time recovery)
- ✅ Branch-based development (safe testing)
- ✅ High availability
- ✅ Automatic failover

**Action Items**:
- Enable Neon's automated backups (should be default)
- Set backup retention period (30 days minimum)
- Test restore process monthly
- Document recovery procedures

### 3. Data Validation & Constraints
**Current**: Basic Prisma validation
**Need**: Stronger API-level validation

### 4. Audit Trail Enhancement
**Current**: Activity model exists
**Need**: Expand to track ALL destructive operations

## Implementation Plan

### Phase 1: Immediate (This Week)

#### A. Enable Soft Deletes for Tasks
```typescript
// Add to Prisma schema
model Task {
  // ... existing fields
  deleted    Boolean   @default(false)
  deletedAt  DateTime?
  deletedBy  String?
  
  @@index([deleted])
}
```

#### B. Verify Neon Backups
1. Login to Neon Console
2. Navigate to your project
3. Check "Backups" section
4. Verify point-in-time restore is enabled
5. Set retention to 30 days (or max available)

#### C. Add Delete Confirmations (Already in UI)
- Ensure all delete actions show confirmation dialogs
- Display data impact (e.g., "This will delete 5 comments and 3 attachments")

### Phase 2: This Month

#### A. Implement Soft Delete Middleware
```typescript
// Global soft delete filter
prisma.$use(async (params, next) => {
  if (params.model === 'Task') {
    if (params.action === 'delete') {
      params.action = 'update'
      params.args['data'] = { 
        deleted: true, 
        deletedAt: new Date() 
      }
    }
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = { 
        ...params.args.where, 
        deleted: false 
      }
    }
  }
  return next(params)
})
```

#### B. Create Restore API Endpoints
```typescript
// /api/tasks/[id]/restore
// /api/projects/[id]/restore
```

#### C. Data Export Feature
Allow users to export their data:
- Projects → JSON
- Tasks → CSV
- All data → Full backup

### Phase 3: Long-term

#### A. Automated Database Backups (Beyond Neon)
```bash
# Cron job for daily backups to S3/Cloudflare R2
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz
```

#### B. Change Data Capture (CDC)
Track every data modification:
- What changed
- Who changed it
- When it changed
- Old vs new value

#### C. Data Retention Policies
- Soft-deleted items: 30 days before permanent deletion
- Archived projects: Keep indefinitely
- Activity logs: 1 year retention
- User data: Keep until account deletion + 90 days

## Neon-Specific Features to Use

### 1. **Branching** (Available Now)
```bash
# Create a branch for testing
neon branches create --project-id <your-project-id> --name testing

# Test destructive operations safely
# If something goes wrong, just delete the branch
```

### 2. **Point-in-Time Restore** (Available Now)
- Restore database to any point in the last 30 days
- Useful for accidental deletions
- Access via Neon Console

### 3. **Connection Pooling**
- Already using pooler in connection string ✅
- Prevents connection exhaustion
- Better reliability

## Monitoring & Alerts

### Set Up Alerts For:
1. **Failed Transactions**: Monitor and alert on DB errors
2. **Large Deletions**: Alert if >10 items deleted at once
3. **Backup Failures**: Immediate notification
4. **Database Performance**: Query timeouts, slow queries

### Recommended Services:
- Sentry (error tracking)
- Uptime Robot (uptime monitoring)
- Neon's built-in monitoring

## Data Recovery Procedures

### If Data is Accidentally Deleted:

#### Option 1: Soft Delete Recovery (If implemented)
```sql
-- Restore a soft-deleted task
UPDATE "Task" 
SET deleted = false, "deletedAt" = NULL 
WHERE id = 'task_id';
```

#### Option 2: Point-in-Time Restore (Neon)
1. Go to Neon Console
2. Select "Restore" from project menu
3. Choose timestamp before deletion
4. Create new branch with restored data
5. Export needed data
6. Import back to main branch

#### Option 3: Database Backup Restore
1. Access backup from chosen timestamp
2. Extract specific data needed
3. Re-insert into production database

## Best Practices

### For Users:
1. Archive projects instead of deleting
2. Regular exports of critical data
3. Use project templates for important structures

### For System:
1. **Never** expose hard delete endpoints publicly
2. Always require authentication for destructive operations
3. Rate limit deletion operations
4. Log all destructive operations
5. Require admin approval for bulk deletions

## Quick Wins (Do Now)

1. ✅ **Verify Neon backups are enabled**
   - Login to console.neon.tech
   - Check backup settings
   - Test restore process

2. ✅ **Add deletion logging**
   ```typescript
   // Log before delete
   await prisma.activity.create({
     data: {
       taskId: id,
       userId: session.user.id,
       action: 'deleted',
       oldValue: JSON.stringify(task),
       createdAt: new Date()
     }
   })
   ```

3. ✅ **Archive instead of delete for projects**
   ```typescript
   // Already have archived field - use it!
   await prisma.project.update({
     where: { id },
     data: { 
       archived: true, 
       archivedAt: new Date() 
     }
   })
   ```

4. ✅ **Add "Recently Deleted" section**
   - Show soft-deleted items
   - Allow restore within 30 days
   - Auto-purge after retention period

## Cost Considerations

### Neon Pricing for Data Protection:
- **Free Tier**: 0.5 GB storage, 7-day history
- **Launch ($19/mo)**: 10 GB storage, 7-day history, branches
- **Scale ($69/mo)**: 50 GB storage, 30-day history, unlimited branches
- **Business**: Custom retention, dedicated support

**Recommendation**: Start with Launch plan ($19/mo) for 30-day point-in-time restore.

## Testing Your Backup Strategy

### Monthly Drill:
1. Create a test task/project
2. Delete it (soft or hard)
3. Attempt recovery using each method
4. Document time to recover
5. Update procedures based on learnings

### Quarterly:
1. Full database restore to staging
2. Verify data integrity
3. Test application functionality
4. Document any issues

## Summary Checklist

- [ ] Verify Neon automated backups enabled
- [ ] Upgrade to Launch/Scale plan for 30-day retention
- [ ] Implement soft deletes for Task model
- [ ] Implement soft deletes for Project model
- [ ] Implement soft deletes for Comment model
- [ ] Add restore API endpoints
- [ ] Create "Recently Deleted" UI
- [ ] Add deletion audit logging
- [ ] Set up error monitoring (Sentry)
- [ ] Document recovery procedures
- [ ] Test restore process
- [ ] Schedule monthly backup drills
- [ ] Create data export feature
- [ ] Add bulk delete protections
- [ ] Set up deletion alerts

## Next Steps

1. **This Week**: Verify Neon backups, implement soft deletes for tasks
2. **This Month**: Complete soft delete implementation, add restore UI
3. **This Quarter**: Full backup testing, monitoring setup, export feature

---

**Remember**: The best backup is the one you've tested. Schedule regular restore drills!
