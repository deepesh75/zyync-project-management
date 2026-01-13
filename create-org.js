const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createOrganization() {
  const email = 'deepesh1234.dc@gmail.com'
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  })
  
  if (!user) {
    console.error('❌ User not found')
    return
  }
  
  // Check if user already has an organization
  const existingOrg = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    include: { organization: true }
  })
  
  if (existingOrg) {
    console.log('✅ Organization already exists!')
    console.log('Organization:', existingOrg.organization)
    await prisma.$disconnect()
    return
  }
  
  // Create organization
  const org = await prisma.organization.create({
    data: {
      name: 'Deepesh Workspace',
      slug: 'deepesh-workspace-' + Date.now(),
      seatsAllowed: 5,
      seatsUsed: 1,
      members: {
        create: {
          userId: user.id,
          role: 'admin'
        }
      }
    }
  })
  
  console.log('✅ Organization created successfully!')
  console.log('Organization ID:', org.id)
  console.log('Name:', org.name)
  console.log('Slug:', org.slug)
  
  await prisma.$disconnect()
}

createOrganization().catch(console.error)
