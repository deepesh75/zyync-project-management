// Script to programmatically sign in using NextAuth credentials and then PATCH a task.
// Usage: node scripts/auth_and_move.js

const base = process.env.BASE_URL || 'http://localhost:3000'

async function http(path, opts = {}) {
  const url = base + path
  const res = await fetch(url, opts)
  const txt = await res.text()
  let body = null
  try { body = JSON.parse(txt) } catch (e) { body = txt }
  return { res, ok: res.ok, status: res.status, body }
}

async function run() {
  console.log('Base URL:', base)
  // get csrf token
  const cookieJar = []
  const csrf = await http('/api/auth/csrf')
  if (!csrf.ok) {
    console.error('Failed to get csrf', csrf.status, csrf.body)
    process.exit(1)
  }
  const csrfToken = csrf.body.csrfToken
  console.log('csrfToken:', !!csrfToken)

  // sign in with credentials
  const params = new URLSearchParams()
  params.append('csrfToken', csrfToken)
  params.append('email', process.env.TEST_EMAIL || 'alice@example.com')
  params.append('password', process.env.TEST_PASSWORD || 'password123')
  params.append('json', 'true')

  // include any set-cookie from csrf response
  const csrfSet = csrf.res.headers.get('set-cookie')
  if (csrfSet) cookieJar.push(csrfSet)

  const signRes = await fetch(base + '/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookieJar.map(c => c.split(';')[0]).join('; ') },
    body: params.toString(),
    redirect: 'manual'
  })

  const signText = await signRes.text()
  console.log('signin status', signRes.status)
  let signBody
  try { signBody = JSON.parse(signText) } catch (e) { signBody = signText }
  console.log('signin body', signBody)

  // collect cookies
  const signSet = signRes.headers.get('set-cookie')
  if (signSet) cookieJar.push(signSet)
  if (!cookieJar.length) {
    console.warn('No cookies received; authentication may have failed')
  }
  console.log('cookies present?', cookieJar.length)

  // fetch projects to pick a task
  const pRes = await http('/api/projects')
  if (!pRes.ok) {
    console.error('Failed to fetch projects', pRes.status, pRes.body)
    process.exit(2)
  }
  const project = pRes.body[0]
  if (!project) {
    console.error('No project found')
    process.exit(3)
  }
  const task = project.tasks[0]
  if (!task) {
    console.error('No task to move')
    process.exit(4)
  }

  const original = task.status
  const target = original === 'todo' ? 'in-progress' : 'todo'
  console.log(`Attempting to move task ${task.id} ${original} -> ${target}`)

  const cookieHeader = cookieJar.map(c => c.split(';')[0]).join('; ')
  console.log('cookieHeader:', cookieHeader)
  const patchRes = await fetch(base + `/api/tasks/${task.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader
    },
    body: JSON.stringify({ status: target })
  })

  const patchText = await patchRes.text()
  let patchBody
  try { patchBody = JSON.parse(patchText) } catch (e) { patchBody = patchText }
  console.log('patch status', patchRes.status, patchBody)

  // verify
  const refRes = await fetch(base + `/api/projects/${project.id}`, { headers: { 'Cookie': cookieHeader } })
  const refJson = await refRes.json().catch(() => null)
  const moved = refJson?.tasks?.find((t) => t.id === task.id)
  console.log('refreshed status', moved?.status)

  // revert
  const revertRes = await fetch(base + `/api/tasks/${task.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader }, body: JSON.stringify({ status: original })
  })
  console.log('revert status', revertRes.status)

}

run().catch((e) => { console.error(e); process.exit(99) })
