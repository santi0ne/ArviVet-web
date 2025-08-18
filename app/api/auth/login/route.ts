import { type NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validations/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = loginSchema.parse(body);

    // TODO: Implement actual authentication logic
    // This is a mock implementation
    const { email, password } = validatedData;

    // Mock authentication - replace with real authentication
    if (email === 'admin@arvi.com' && password === 'password123') {
      const mockUser = {
        id: '1',
        email: email,
        name: 'Usuario Admin',
      };

      const mockToken = 'mock-jwt-token-' + Date.now();

      return NextResponse.json({
        success: true,
        user: mockUser,
        token: mockToken,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Credenciales inválidas' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);

    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
