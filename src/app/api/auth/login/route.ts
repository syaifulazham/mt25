import { NextRequest, NextResponse } from 'next/server';
import { loginWithCredentials, generateToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'techlympics-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Attempt login
    const result = await loginWithCredentials({ username, password });
    console.log('Login result:', { success: result.success, user: result.user ? { id: result.user.id, role: result.user.role } : null });

    if (result.success && result.user) {
      // Generate token
      const token = await generateToken(result.user);

      // Set auth cookie
      const cookieStore = cookies();
      
      // Set cookie with more permissive settings for development
      cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 8, // 8 hours
        path: '/',
        sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
      });

      console.log('Auth cookie set successfully');

      // Return success without including the token in the response body
      return NextResponse.json({
        success: true,
        message: 'Login successful',
        user: result.user,
      });
    }

    // Return error response
    return NextResponse.json(
      { success: false, message: result.message },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
