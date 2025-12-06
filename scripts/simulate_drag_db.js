// Use Prisma client directly to simulate moving a task (bypasses HTTP/auth).
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function run() {
  console.log('Connecting to DB via Prisma')
  const project = await prisma.project.findFirst({ include: { tasks: true } })
  if (!project) {
    console.error('No project found')
    process.exit(1)
  }
  console.log('Using project', project.id, project.name)
  const task = project.tasks[0]
  if (!task) {
    console.error('No tasks to move')
    process.exit(1)
  }
  const original = task.status
  const target = original === 'todo' ? 'in-progress' : 'todo'
  console.log(`Moving task ${task.id} ${original} -> ${target}`)
  const updated = await prisma.task.update({ where: { id: task.id }, data: { status: target } })
  console.log('Updated status:', updated.status)
  const refreshed = await prisma.project.findUnique({ where: { id: project.id }, include: { tasks: true } })
  const moved = refreshed.tasks.find((t) => t.id === task.id)
  console.log('Refreshed task status:', moved.status)
  // revert
  await prisma.task.update({ where: { id: task.id }, data: { status: original } })
  console.log('Reverted to', original)
  await prisma.$disconnect()
}

run().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(99) })
