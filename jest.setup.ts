import '@testing-library/jest-dom';

// Polyfills for Node 16 (Next.js 16 expects these globals)
if (typeof globalThis.Request === 'undefined') {
  // @ts-expect-error - minimal polyfill for jest environment
  globalThis.Request = class Request {
    url: string;
    method: string;
    constructor(input: string, init?: Record<string, unknown>) {
      this.url = input;
      this.method = (init?.method as string) || 'GET';
    }
  };
}

if (typeof globalThis.Response === 'undefined') {
  // @ts-expect-error - minimal polyfill for jest environment
  globalThis.Response = class Response {
    body: unknown;
    constructor(body?: unknown) {
      this.body = body;
    }
  };
}

if (typeof globalThis.Headers === 'undefined') {
  // @ts-expect-error - minimal polyfill for jest environment
  globalThis.Headers = class Headers {
    private map: Record<string, string> = {};
    set(key: string, value: string) { this.map[key] = value; }
    get(key: string) { return this.map[key]; }
  };
}

if (typeof globalThis.fetch === 'undefined') {
  // @ts-expect-error - minimal polyfill for jest environment
  globalThis.fetch = () => Promise.resolve(new Response());
}
