import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";
import { compare } from "bcrypt";
//import { Role } from "@prisma/client";

// Extend Next Auth types to include our custom properties
declare module "next-auth" {
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    username?: string | null;
    isParticipant?: boolean;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      username?: string | null;
      isParticipant?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: string;
    username?: string | null;
    isParticipant?: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        // First, try to find the user in the organizer table
        let user = await prisma.user.findUnique({
          where: {
            username: credentials.username,
          },
        });

        let isParticipant = false;

        // If not found in the organizer table, check the participant table
        if (!user) {
          const participant = await prisma.user_participant.findUnique({
            where: {
              username: credentials.username,
            },
          });

          if (participant && participant.password && participant.isActive) {
            user = {
              ...participant,
              role: 'PARTICIPANTS_MANAGER'
            };
            isParticipant = true;
          }
        }

        if (!user || !user.password || !user.isActive) {
          return null;
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        // For organizers, check role
        if (!isParticipant && !['ADMIN', 'OPERATOR', 'VIEWER'].includes(user.role as string)) {
          return null;
        }

        // Update last login time
        if (isParticipant) {
          await prisma.user_participant.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          });
        } else {
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          });
        }

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: isParticipant ? 'PARTICIPANTS_MANAGER' : user.role,
          username: user.username,
          isParticipant: isParticipant,
        };
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code"
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn callback triggered:', { provider: account?.provider, email: profile?.email });
      
      // Only process Google sign-ins
      if (account?.provider === 'google' && profile?.email) {
        try {
          // Check if user exists in participant table
          let participant = await prisma.user_participant.findUnique({
            where: { email: profile.email }
          });
          
          console.log('Participant lookup result:', participant ? 'Found existing user' : 'User not found, will create');
          
          // If not found, create a new participant user
          if (!participant) {
            participant = await prisma.user_participant.create({
              data: {
                name: profile.name || user.name,
                email: profile.email,
                username: profile.email.split('@')[0], // Use part of email as username
                isActive: true,
                lastLogin: new Date(),
              }
            });
            console.log('Created new participant user:', participant.id);
          } else {
            // Update last login time
            await prisma.user_participant.update({
              where: { id: participant.id },
              data: { lastLogin: new Date() }
            });
          }
          
          // Add participant info to the user object
          user.id = String(participant.id);
          user.role = 'PARTICIPANTS_MANAGER';
          user.isParticipant = true;
          
          return true;
        } catch (error) {
          console.error('Error in Google sign-in:', error);
          return false;
        }
      }
      
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || '';
        token.username = user.username || '';
        token.isParticipant = user.isParticipant || false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) || '';
        session.user.username = (token.username as string) || '';
        session.user.isParticipant = (token.isParticipant as boolean) || false;
      }
      return session;
    }
  },
  pages: {
    signIn: "/participants/auth/login",
    error: "/participants/auth/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  secret: process.env.NEXTAUTH_SECRET || "8Li3veTh1515MySeCr3t", // Match the secret used in mock-auth.ts
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
