const { chromium } = require('playwright');

async function fetchJSON(url) {
  const res = await fetch(url)
  return res.json()
}

async function main() {
  const base = process.env.BASE_URL || 'http://localhost:3000'
  // get a project and a task
  const projects = await fetchJSON(`${base}/api/projects`)
  if (!projects || !projects[0]) {
    console.error('No projects found at /api/projects')
    process.exit(2)
  }
  const project = projects[0]
  const projectId = project.id
  const todoTask = project.tasks.find(t => t.status === 'todo') || project.tasks[0]
  if (!todoTask) {
    console.error('No tasks available to move')
    process.exit(2)
  }
  console.log('Using project', projectId, 'task', todoTask.id, todoTask.title)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // sign in using seeded user
  await page.goto(`${base}/auth/signin`)
  await page.fill('input[placeholder="Email"]', 'alice@example.com')
  await page.fill('input[placeholder="Password"]', 'password123')
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button:has-text("Sign in")')
  ])
  console.log('Signed in')

  await page.goto(`${base}/projects/${projectId}`)
  await page.waitForSelector(`[data-task-id="${todoTask.id}"]`)

  // target column (in-progress)
  const targetSelector = '[data-column="in-progress"] ul'
  await page.waitForSelector(targetSelector)

  // perform drag and drop using Playwright helper
  const source = `[data-task-id="${todoTask.id}"]`
  console.log('Dragging', source, '->', targetSelector)
  await page.dragAndDrop(source, targetSelector, { force: true })

  // wait a moment for network request and UI update
  await page.waitForTimeout(1000)

  // fetch project to validate change
  const updated = await fetchJSON(`${base}/api/projects/${projectId}`)
  const moved = updated.tasks.find(t => t.id === todoTask.id)
  console.log('Task status after drop:', moved.status)

  if (moved.status === 'in-progress') {
    console.log('E2E drag test passed')
    await browser.close()
    process.exit(0)
  } else {
    console.error('E2E drag test failed: status not updated')
    await browser.close()
    process.exit(3)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
