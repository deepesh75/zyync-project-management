import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '../../../lib/prisma'
import { compare } from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials) return null
        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (!user || !user.passwordHash) return null
        const valid = await compare(credentials.password, user.passwordHash)
        if (!valid) return null
        // Return user object for session
        return { id: user.id, name: user.name, email: user.email }
      }
    })
  ],
  session: {
    strategy: 'jwt' as const
  },
  pages: {
    signIn: '/auth/signin'
  },
  secret: process.env.NEXTAUTH_SECRET
}

export default NextAuth(authOptions)
