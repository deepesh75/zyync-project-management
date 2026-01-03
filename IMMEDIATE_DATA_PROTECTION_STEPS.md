# 🚨 IMMEDIATE ACTION REQUIRED - Data Protection Setup

## Critical Steps to Protect User Data (Do Today!)

### Step 1: Verify Neon Database Backups (5 minutes)

1. **Login to Neon Console**
   ```
   https://console.neon.tech
   ```

2. **Check Your Project Settings**
   - Click on your project: `ep-aged-boat-a1tc9c50`
   - Go to **Settings** → **Backups**
   - Verify these are enabled:
     - ✅ Point-in-time restore (should be ON)
     - ✅ Backup retention period (check how many days)

3. **Upgrade if Needed**
   - **Current**: Likely on Free tier (0.5GB, 7-day history)
   - **Recommended**: Launch plan ($19/mo) for:
     - 30-day point-in-time restore
     - Database branching for safe testing
     - Better performance

4. **Test Recovery (Important!)**
   ```
   # Create a test branch to verify backups work
   1. In Neon Console, click "Branches"
   2. Click "New Branch"
   3. Select "Create from: Main branch"
   4. Choose a point in time (e.g., 1 hour ago)
   5. Name it "test-restore"
   6. Verify data exists in the branch
   7. Delete the test branch when done
   ```

### Step 2: Apply Soft Delete Migration (10 minutes)

**What this does**: Instead of permanently deleting data, mark it as deleted. You can restore it within 30 days.

1. **Run the migration**
   ```bash
   cd "/Users/bharathchoudhary/Documents/Deepesh/Deepesh SaaS Apps/project management app"
   
   # Generate Prisma client with new schema
   npx prisma generate
   
   # Push changes to database
   npx prisma db push
   ```

2. **Verify migration**
   ```bash
   # Check if columns were added
   npx prisma studio
   # Look for 'deleted', 'deletedAt', 'deletedBy' fields in Task, Project, Comment, Label tables
   ```

### Step 3: Update API Endpoints for Soft Deletes (15 minutes)

Replace hard deletes with soft deletes in your API routes:

**Example for tasks** (apply same pattern to projects, comments, labels):

```typescript
// File: src/pages/api/tasks/[id].ts
// BEFORE (line 437):
if (req.method === 'DELETE') {
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user?.email) return res.status(401).json({ error: 'Unauthorized' })
  await prisma.task.delete({ where: { id: String(id) } })
  return res.status(204).end()
}

// AFTER:
if (req.method === 'DELETE') {
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user?.email) return res.status(401).json({ error: 'Unauthorized' })
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  
  // Log the deletion
  await prisma.activity.create({
    data: {
      taskId: String(id),
      userId: user?.id,
      action: 'deleted',
      createdAt: new Date()
    }
  })
  
  // Soft delete instead of hard delete
  await prisma.task.update({ 
    where: { id: String(id) },
    data: {
      deleted: true,
      deletedAt: new Date(),
      deletedBy: user?.id
    }
  })
  
  return res.status(204).end()
}
```

### Step 4: Filter Out Deleted Items (10 minutes)

Update queries to exclude soft-deleted items:

```typescript
// Example: When fetching tasks for a project
// BEFORE:
const tasks = await prisma.task.findMany({
  where: { projectId: id }
})

// AFTER:
const tasks = await prisma.task.findMany({
  where: { 
    projectId: id,
    deleted: false  // Exclude soft-deleted tasks
  }
})
```

Apply this to:
- `/api/projects/[id].ts` (when fetching project with tasks)
- `/api/tasks.ts` (when listing tasks)
- Any other queries that fetch tasks, projects, comments, or labels

### Step 5: Create Restore API (Optional but Recommended)

Create endpoints to restore deleted items:

```typescript
// File: src/pages/api/tasks/[id]/restore.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import prisma from '../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query
  
  try {
    const task = await prisma.task.findUnique({
      where: { id: String(id) }
    })
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }
    
    if (!task.deleted) {
      return res.status(400).json({ error: 'Task is not deleted' })
    }
    
    // Restore the task
    const restored = await prisma.task.update({
      where: { id: String(id) },
      data: {
        deleted: false,
        deletedAt: null,
        deletedBy: null
      }
    })
    
    // Log the restoration
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    await prisma.activity.create({
      data: {
        taskId: String(id),
        userId: user?.id,
        action: 'restored',
        createdAt: new Date()
      }
    })
    
    return res.status(200).json(restored)
  } catch (error) {
    console.error('Error restoring task:', error)
    return res.status(500).json({ error: 'Failed to restore task' })
  }
}
```

### Step 6: Set Up Automated Cleanup (Optional)

Create a cron job to permanently delete items after 30 days:

```typescript
// File: src/pages/api/cron/cleanup-deleted.ts
// Call this daily via Vercel Cron or similar

import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify this is actually a cron job (use a secret token)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Permanently delete tasks soft-deleted over 30 days ago
    const deletedTasks = await prisma.task.deleteMany({
      where: {
        deleted: true,
        deletedAt: {
          lt: thirtyDaysAgo
        }
      }
    })

    // Same for projects, comments, labels
    const deletedProjects = await prisma.project.deleteMany({
      where: { deleted: true, deletedAt: { lt: thirtyDaysAgo } }
    })

    const deletedComments = await prisma.comment.deleteMany({
      where: { deleted: true, deletedAt: { lt: thirtyDaysAgo } }
    })

    const deletedLabels = await prisma.label.deleteMany({
      where: { deleted: true, deletedAt: { lt: thirtyDaysAgo } }
    })

    return res.status(200).json({
      success: true,
      deleted: {
        tasks: deletedTasks.count,
        projects: deletedProjects.count,
        comments: deletedComments.count,
        labels: deletedLabels.count
      }
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    return res.status(500).json({ error: 'Cleanup failed' })
  }
}
```

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/cleanup-deleted",
    "schedule": "0 2 * * *"
  }]
}
```

## Testing Your Changes

### Test Soft Delete:
```bash
# 1. Create a test task in your app
# 2. Delete it
# 3. Check database - it should have deleted=true instead of being removed
npx prisma studio
# Look at Task table, find your task, verify deleted=true
```

### Test Restore:
```bash
# If you created the restore endpoint:
curl -X POST http://localhost:3000/api/tasks/[task-id]/restore \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

### Test Neon Point-in-Time Restore:
1. Create a test task
2. Note the current time
3. Delete the task (hard or soft)
4. In Neon Console, create a branch from 5 minutes ago
5. Connect to the branch and verify task exists
6. Delete the branch

## Monitoring

### Set Up Alerts:
1. **Error Tracking**: Sign up for Sentry (free tier)
   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```

2. **Database Monitoring**: Use Neon's built-in metrics
   - Check query performance
   - Monitor storage usage
   - Set up alerts for errors

### What to Monitor:
- Failed database operations
- Large bulk deletes (>10 items)
- Restore operations
- Backup failures

## Recovery Procedures

### If User Accidentally Deletes Data:

**Option 1: Soft Delete Recovery (If implemented)**
```sql
-- Find deleted items
SELECT * FROM "Task" WHERE deleted = true AND "deletedAt" > NOW() - INTERVAL '30 days';

-- Restore specific task
UPDATE "Task" SET deleted = false, "deletedAt" = NULL WHERE id = 'task_id';
```

**Option 2: Neon Point-in-Time Restore**
1. Note the time before deletion happened
2. Create a Neon branch from that timestamp
3. Extract the needed data
4. Re-insert into main branch

**Option 3: Contact Neon Support**
If critical data loss and other methods fail, Neon support can help restore from backups.

## Cost Summary

### Neon Database Plans:
- **Free**: $0/mo - 0.5GB, 7-day history ⚠️ Not recommended for production
- **Launch**: $19/mo - 10GB, 7-day history, branches ✅ Minimum for production
- **Scale**: $69/mo - 50GB, 30-day history, unlimited branches ⭐ Recommended
- **Business**: Custom - Extended retention, dedicated support

### Recommendations:
- **Start**: Launch plan ($19/mo)
- **Growing**: Scale plan ($69/mo) when you have >100 users
- **Monitoring**: Sentry free tier (covers most needs)

## Checklist

Complete today:
- [ ] Login to Neon Console and verify backups are enabled
- [ ] Test creating a database branch (verifies backups work)
- [ ] Run `npx prisma db push` to add soft delete columns
- [ ] Update at least the task DELETE endpoint to use soft deletes
- [ ] Test deleting and verifying task still exists with deleted=true
- [ ] Document recovery process for your team

Complete this week:
- [ ] Update all DELETE endpoints (projects, comments, labels)
- [ ] Add deleted=false filter to all queries
- [ ] Create restore API endpoints
- [ ] Add "Recently Deleted" section to UI
- [ ] Consider upgrading to Neon Scale plan

Complete this month:
- [ ] Set up Sentry error tracking
- [ ] Create automated cleanup cron job
- [ ] Test full recovery process
- [ ] Schedule monthly backup drills
- [ ] Create data export feature for users

## Questions?

Check the full strategy document: `DATA_PROTECTION_STRATEGY.md`

Remember: **The best backup is the one you've tested!**
