const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Quick test: find a project, create a task and comment')
  const project = await prisma.project.findFirst()
  if (!project) {
    console.log('No project found. Exiting.')
    return
  }
  console.log('Using project:', project.id, project.name)

  const alice = await prisma.user.findUnique({ where: { email: 'alice@example.com' } })
  if (!alice) {
    console.log('Seeded user alice not found')
    return
  }

  const task = await prisma.task.create({ data: { title: 'Quick test task', description: 'Created by quick_test.js', projectId: project.id, assigneeId: alice.id } })
  console.log('Created task', task.id)

  const comment = await prisma.comment.create({ data: { body: 'Test comment (quick_test)', taskId: task.id, authorId: alice.id } })
  console.log('Created comment', comment.id)

  const updated = await prisma.project.findUnique({ where: { id: project.id }, include: { tasks: { include: { comments: true, assignee: true } }, owner: true } })
  console.log('Project snapshot:', JSON.stringify(updated, null, 2))
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
