import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin-111 routes
  if (pathname.startsWith('/admin-111')) {
    const authHeader = request.headers.get('authorization');

    if (authHeader) {
      const [scheme, encoded] = authHeader.split(' ');
      if (scheme === 'Basic' && encoded) {
        const decoded = atob(encoded);
        const [username, password] = decoded.split(':');

        const validUser = process.env.ADMIN_USERNAME || 'xxx';
        const validPass = process.env.ADMIN_PASSWORD || 'xxx';

        if (username === validUser && password === validPass) {
          return NextResponse.next();
        }
      }
    }

    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Area"',
      },
    });
  }

  // User Dashboard & Login protection
  const session = request.cookies.get('session');

  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (pathname === '/login' || pathname === '/register') {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin-111/:path*', '/dashboard/:path*', '/login', '/register'],
};
