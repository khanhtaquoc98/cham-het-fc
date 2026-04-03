// This must run before next/jest loads Next.js modules
// Node 16 doesn't have Request/Response/Headers/fetch as globals
if (typeof globalThis.Request === 'undefined') {
  globalThis.Request = class Request {
    constructor(input, init) {
      this.url = input;
      this.method = (init && init.method) || 'GET';
      this.headers = new (globalThis.Headers || Map)();
    }
  };
}

if (typeof globalThis.Response === 'undefined') {
  globalThis.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.status = (init && init.status) || 200;
    }
  };
}

if (typeof globalThis.Headers === 'undefined') {
  globalThis.Headers = class Headers {
    constructor() { this._map = {}; }
    set(key, value) { this._map[key.toLowerCase()] = value; }
    get(key) { return this._map[key.toLowerCase()]; }
    has(key) { return key.toLowerCase() in this._map; }
    forEach(cb) { Object.entries(this._map).forEach(([k, v]) => cb(v, k, this)); }
  };
}

if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = () => Promise.resolve(new globalThis.Response(''));
}

module.exports = async () => {
  // Global setup - polyfills are set above
};
