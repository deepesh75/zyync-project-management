import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '../../../lib/prisma'
import { compare } from 'bcryptjs'
import type { JWT } from 'next-auth/jwt'

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
        const user = await prisma.user.findUnique({ 
          where: { email: credentials.email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            emailVerified: true,
            createdAt: true
          }
        })
        if (!user || !user.passwordHash) return null
        
        // Email verification is only enforced for accounts created after the
        // feature was introduced (2026-01-01). Legacy users are treated as verified.
        const verificationFeatureDate = new Date('2026-01-01T00:00:00Z')
        const isLegacyUser = user.createdAt < verificationFeatureDate
        if (!user.emailVerified && !isLegacyUser) {
          throw new Error('Please verify your email before signing in. Check your inbox for the verification link.')
        }
        
        const valid = await compare(credentials.password, user.passwordHash)
        if (!valid) return null
        // Return user object for session
        return { id: user.id, name: user.name, email: user.email }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: any }) {
      if (user) {
        token.id = user.id
        // Get user's current token version
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { tokenVersion: true } })
        token.tokenVersion = dbUser?.tokenVersion || 0
      } else if (token.id) {
        // On token refresh, verify token version hasn't been invalidated
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string }, select: { tokenVersion: true } })
        if (dbUser && dbUser.tokenVersion !== token.tokenVersion) {
          // Token has been invalidated (user was removed from org, etc)
          // Return invalid token to force re-authentication
          return {} as any
        }
        token.tokenVersion = dbUser?.tokenVersion || 0
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string
        (session.user as any).tokenVersion = token.tokenVersion as number
      }
      return session
    }
  },
  session: {
    strategy: 'jwt' as const
  },
  pages: {
    signIn: '/auth/signin'
  },
  secret: process.env.NEXTAUTH_SECRET
}

export default NextAuth(authOptions)
