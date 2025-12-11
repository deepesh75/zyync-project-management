import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import bcrypt from 'bcrypt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, name, password, orgName, slug } = req.body
  if (!email || !orgName || !slug) return res.status(400).json({ error: 'email, orgName and slug required' })

  try {
    // create user
    const passwordHash = password ? await bcrypt.hash(password, 10) : null

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash
      }
    })

    // create organization
    const organization = await prisma.organization.create({
      data: {
        name: orgName,
        slug,
        members: { create: { userId: user.id, role: 'admin' } }
      }
    })

    // create a default project
    await prisma.project.create({ data: { name: `${orgName} - Default`, ownerId: user.id, organizationId: organization.id } })

    return res.status(201).json({ user, organization })
  } catch (err: any) {
    console.error('Signup error', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
