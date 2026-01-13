const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createOrResetUser() {
  const email = 'deepesh1234.dc@gmail.com'
  const newPassword = 'Admin@123' // Change this to your desired password
  const name = 'Deepesh Choudhary'
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  
  // Try to find existing user
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })
  
  if (existingUser) {
    // Update existing user
    await prisma.user.update({
      where: { email },
      data: { 
        passwordHash: hashedPassword,
        emailVerified: true
      }
    })
    console.log('✅ Password reset successfully!')
  } else {
    // Create new user
    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashedPassword,
        emailVerified: true
      }
    })
    console.log('✅ User created successfully!')
  }
  
  console.log('Email:', email)
  console.log('Password:', newPassword)
  console.log('You can now sign in at https://www.zyync.com/auth/signin')
  
  await prisma.$disconnect()
}

createOrResetUser().catch(console.error)
