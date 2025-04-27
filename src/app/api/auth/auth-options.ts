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
    authenticated?: boolean;
    tokenExpiry?: number;
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
      authenticated?: boolean;
      tokenExpiry?: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: string;
    username?: string | null;
    isParticipant?: boolean;
    exp?: number;
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

        // First check for regular user
        const user = await prisma.user.findUnique({
          where: {
            username: credentials.username
          }
        });

        if (user) {
          if (!user.isActive) {
            throw new Error("User is inactive");
          }

          const passwordValid = await compare(credentials.password, user.password || '');
          
          if (!passwordValid) {
            return null;
          }

          // Update last login time
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          });

          // Convert the numeric id to string for NextAuth
          return {
            id: String(user.id),
            name: user.name,
            email: user.email,
            role: user.role,
            username: user.username,
            isParticipant: false
          };
        }

        // If not found as a regular user, check participant
        const participant = await prisma.user_participant.findUnique({
          where: {
            username: credentials.username
          }
        });

        if (participant) {
          if (!participant.isActive) {
            throw new Error("User is inactive");
          }

          if (participant.password) {
            const passwordValid = await compare(credentials.password, participant.password);
            
            if (!passwordValid) {
              return null;
            }

            // Update last login time
            await prisma.user_participant.update({
              where: { id: participant.id },
              data: { lastLogin: new Date() }
            });

            return {
              id: String(participant.id),
              name: participant.name,
              email: participant.email,
              username: participant.username,
              isParticipant: true
            };
          }
        }

        return null;
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      async profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          isParticipant: true // Google sign-in is only for participants
        };
      }
    })
  ],
  session: {
    // Important: use JWT strategy for sessions to ensure they work in production
    strategy: "jwt",
    // Extend session max age to 30 days
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        if (!profile?.email) {
          return false;
        }

        // Check if we have a user with this email
        let participant = await prisma.user_participant.findUnique({
          where: {
            email: profile.email
          }
        });

        // If not, create a new participant
        if (!participant) {
          try {
            participant = await prisma.user_participant.create({
              data: {
                email: profile.email,
                name: profile.name,
                username: profile.email, // Use email as username for now
                isActive: true,
                updatedAt: new Date()
              }
            });
          } catch (error) {
            console.error("Failed to create participant:", error);
            return false;
          }
        }

        // Update the user ID to match our DB ID
        user.id = String(participant.id);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
        token.isParticipant = user.isParticipant;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        // Make sure we copy all token data to the session
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.username = token.username;
        session.user.isParticipant = token.isParticipant;
        
        // Add debug token for easier troubleshooting
        session.user.authenticated = true;
        session.user.tokenExpiry = token.exp;
      }
      return session;
    }
  },
  pages: {
    // Use the new unified auth paths
    signIn: "/auth/participants/login",
    error: "/auth/participants/login",
    // The middleware will handle redirecting to the correct section login page
  },
  debug: process.env.NEXTAUTH_DEBUG === 'true',
  secret: process.env.NEXTAUTH_SECRET || "8Li3veTh1515MySeCr3t", // Match the secret used in mock-auth.ts
};
