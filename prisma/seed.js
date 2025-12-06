const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')
  // Delete in dependency order: comments -> task labels -> tasks -> projects -> users -> labels
  await prisma.comment.deleteMany().catch(() => {})
  await prisma.taskLabel.deleteMany().catch(() => {})
  await prisma.task.deleteMany().catch(() => {})
  await prisma.project.deleteMany().catch(() => {})
  await prisma.user.deleteMany().catch(() => {})
  await prisma.label.deleteMany().catch(() => {})

  const bcrypt = require('bcryptjs')
  const alice = await prisma.user.create({ data: { email: 'alice@example.com', name: 'Alice', passwordHash: await bcrypt.hash('password123', 10) } })
  const bob = await prisma.user.create({ data: { email: 'bob@example.com', name: 'Bob', passwordHash: await bcrypt.hash('password123', 10) } })

  const proj = await prisma.project.create({ data: { name: 'Website Redesign', ownerId: alice.id } })

  const t1 = await prisma.task.create({ data: { title: 'Design landing page', description: 'Create wireframes', projectId: proj.id, assigneeId: bob.id, status: 'in-progress' } })
  const t2 = await prisma.task.create({ data: { title: 'Set up analytics', projectId: proj.id, assigneeId: alice.id } })

  await prisma.comment.create({ data: { body: 'Started working on wireframes', taskId: t1.id, authorId: bob.id } })

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
