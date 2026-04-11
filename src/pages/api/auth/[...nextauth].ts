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
            emailVerified: true
          }
        })
        if (!user || !user.passwordHash) return null
        
        // Check if email is verified
        if (!user.emailVerified) {
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
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string
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
