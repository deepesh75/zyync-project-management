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
        try {
          const user = await prisma.user.findUnique({ 
            where: { email: credentials.email },
            select: {
              id: true,
              name: true,
              email: true,
              passwordHash: true
            }
          })
          if (!user || !user.passwordHash) return null
          
          const valid = await compare(credentials.password, user.passwordHash)
          if (!valid) return null

          return { id: user.id, name: user.name, email: user.email }
        } catch (err) {
          console.error('[NextAuth] authorize error:', err)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: any }) {
      if (user) {
        token.id = user.id
        try {
          const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { tokenVersion: true } })
          token.tokenVersion = dbUser?.tokenVersion ?? 0
        } catch {
          token.tokenVersion = 0
        }
      } else if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({ where: { id: token.id as string }, select: { tokenVersion: true } })
          if (dbUser && dbUser.tokenVersion !== token.tokenVersion) {
            return {} as any
          }
          token.tokenVersion = dbUser?.tokenVersion ?? 0
        } catch {
          // tokenVersion column may not exist yet — allow session to continue
        }
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
