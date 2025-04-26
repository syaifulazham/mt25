import { PrismaClient, user, user_role } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import * as jose from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// Types
export type AuthUser = {
  id: number;
  name: string;
  email: string; // Both user and user_participant have required email fields
  role: user_role;
  username?: string | null;
};

export type LoginCredentials = {
  username: string;
  password: string;
};

export type AuthResult = {
  success: boolean;
  message: string;
  user?: AuthUser;
  token?: string;
};

// Constants
const JWT_SECRET = process.env.JWT_SECRET || 'techlympics-2025-secret-key';
const TOKEN_EXPIRY = '8h';
const COOKIE_NAME = 'techlympics-auth';

// Helper functions
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await compare(password, hashedPassword);
}

// Edge-compatible JWT functions using jose
export async function generateToken(user: AuthUser): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  
  return await new jose.SignJWT({
    id: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<any> {
  if (!token) {
    console.log('No token provided to verifyToken');
    return null;
  }
  
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return payload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// Auth functions
export async function loginWithCredentials(credentials: LoginCredentials): Promise<AuthResult> {
  try {
    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username: credentials.username },
    });

    // Check if user exists and is active
    if (!user || !user.isActive) {
      return {
        success: false,
        message: 'Invalid username or password',
      };
    }

    // Check if user has a password (should always be true for organizers)
    if (!user.password) {
      return {
        success: false,
        message: 'Account cannot use password authentication',
      };
    }

    // Verify password
    const isPasswordValid = await verifyPassword(credentials.password, user.password);
    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Invalid username or password',
      };
    }

    // Check if user has organizer role
    if (!['ADMIN', 'OPERATOR', 'VIEWER'].includes(user.role)) {
      return {
        success: false,
        message: 'You do not have permission to access the organizer portal',
      };
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Create auth user object
    // Email is required in the schema but TypeScript needs a non-null assertion
    const authUser: AuthUser = {
      id: user.id,
      name: user.name || '',
      email: user.email!, // Non-null assertion since email is required in the schema
      role: user.role,
      username: user.username,
    };

    // No need to generate token here anymore, it will be generated in the API route
    return {
      success: true,
      message: 'Login successful',
      user: authUser,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'An error occurred during login',
    };
  }
}

// Get current user from cookies
export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const decoded = await verifyToken(token);
  if (!decoded) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      name: user.name || '',
      email: user.email!, // Non-null assertion since email is required in the schema
      role: user.role,
      username: user.username,
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

// Check if user has required role
export function hasRequiredRole(user: AuthUser | null | any, requiredRoles: user_role[] | string[]): boolean {
  if (!user) {
    return false;
  }
  
  // Handle both string roles and enum roles
  const userRole = typeof user.role === 'string' ? user.role : String(user.role);
  return requiredRoles.includes(userRole as any);
}

// Create initial admin user if no users exist
export async function createInitialAdmin(): Promise<void> {
  const userCount = await prisma.user.count();
  
  if (userCount === 0) {
    const defaultPassword = await hashPassword('admin123');
    
    await prisma.user.create({
      data: {
        name: 'System Administrator',
        email: 'admin@techlympics.my',
        username: 'admin',
        password: defaultPassword,
        role: user_role.ADMIN,
        updatedAt: new Date(),
      },
    });
    
    console.log('Created initial admin user');
  }
}
