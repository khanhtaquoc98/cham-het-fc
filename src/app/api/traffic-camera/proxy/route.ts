import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let cachedCookie = '';
let cookieFetchTime = 0;

async function getOrFetchSessionCookie(): Promise<string> {
  const now = Date.now();
  // Cache session cookie for 10 minutes
  if (cachedCookie && now - cookieFetchTime < 10 * 60 * 1000) {
    return cachedCookie;
  }

  try {
    const res = await fetch('https://giaothong.hochiminhcity.gov.vn/map.aspx', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    });

    const cookies: string[] = [];
    if (res.headers.getSetCookie) {
      const setCookies = res.headers.getSetCookie();
      setCookies.forEach((c) => cookies.push(c.split(';')[0]));
    } else {
      const setCookie = res.headers.get('set-cookie');
      if (setCookie) {
        setCookie.split(',').forEach((c) => cookies.push(c.split(';')[0]));
      }
    }

    if (cookies.length > 0) {
      cachedCookie = cookies.join('; ');
      cookieFetchTime = now;
    }
  } catch (err) {
    console.error('Error fetching session cookie from map.aspx:', err);
  }

  return cachedCookie;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const urlObj = new URL(targetUrl);
    urlObj.searchParams.set('_t', Date.now().toString());

    let cookie = await getOrFetchSessionCookie();

    const requestHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      Referer: 'https://giaothong.hochiminhcity.gov.vn/map.aspx',
    };

    if (cookie) {
      requestHeaders['Cookie'] = cookie;
    }

    let response = await fetch(urlObj.toString(), {
      headers: requestHeaders,
      cache: 'no-store',
    });

    // If 403 Forbidden, force refresh session cookie and retry once
    if (response.status === 403) {
      cachedCookie = '';
      cookieFetchTime = 0;
      cookie = await getOrFetchSessionCookie();
      if (cookie) {
        requestHeaders['Cookie'] = cookie;
        response = await fetch(urlObj.toString(), {
          headers: requestHeaders,
          cache: 'no-store',
        });
      }
    }

    if (!response.ok) {
      return new NextResponse(`Failed to fetch camera image: ${response.status}`, {
        status: response.status,
      });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Error proxying traffic camera:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
