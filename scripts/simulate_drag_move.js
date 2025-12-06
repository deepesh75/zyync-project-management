// Simple script to simulate a drag/drop by calling the tasks PATCH API.
// Usage: node scripts/simulate_drag_move.js

const base = process.env.BASE_URL || 'http://localhost:3000'

async function http(path, opts = {}) {
  const url = base + path
  const res = await fetch(url, opts)
  const txt = await res.text()
  let body = null
  try { body = JSON.parse(txt) } catch (e) { body = txt }
  return { ok: res.ok, status: res.status, body }
}

async function run() {
  console.log('Base URL:', base)
  const pRes = await http('/api/projects')
  if (!pRes.ok) {
    console.error('Failed to fetch projects', pRes.status, pRes.body)
    process.exit(1)
  }
  const projects = pRes.body || []
  if (!projects.length) {
    console.error('No projects found')
    process.exit(1)
  }
  const project = projects[0]
  console.log('Using project:', project.id, project.name)
  const tasks = project.tasks || []
  if (!tasks.length) {
    console.error('No tasks in project to move')
    process.exit(1)
  }

  // pick first task and attempt to move it to a different column
  const task = tasks[0]
  const originalStatus = task.status
  const target = originalStatus === 'todo' ? 'in-progress' : 'todo'
  console.log(`Task ${task.id} status ${originalStatus} -> ${target}`)

  const patchRes = await http(`/api/tasks/${task.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: target })
  })
  if (!patchRes.ok) {
    console.error('PATCH failed', patchRes.status, patchRes.body)
    process.exit(2)
  }
  console.log('PATCH ok, server returned:', patchRes.body)

  // refetch project to verify
  const pRef = await http(`/api/projects/${project.id}`)
  if (!pRef.ok) {
    console.error('Failed to refetch project', pRef.status, pRef.body)
    process.exit(3)
  }
  const refreshed = pRef.body
  const moved = refreshed.tasks.find((t) => t.id === task.id)
  console.log('Refreshed task status:', moved?.status)

  // revert change to keep seed deterministic
  const revertRes = await http(`/api/tasks/${task.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: originalStatus })
  })
  if (!revertRes.ok) {
    console.warn('Failed to revert task status; you may want to fix it manually', revertRes.status, revertRes.body)
  } else {
    console.log('Reverted task to', originalStatus)
  }

  console.log('Done')
}

run().catch((err) => { console.error(err); process.exit(99) })
