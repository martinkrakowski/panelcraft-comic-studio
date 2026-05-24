import type { H3Event } from 'h3';

/**
 * Resolve the real client IP for an incoming request.
 *
 * By default the trusted source is the TCP socket peer address. This is
 * spoof-resistant because the client cannot forge it. The forwarded
 * headers (`x-forwarded-for`, `x-real-ip`) are only honored when the
 * deployment opts in via `TRUST_PROXY=true` — meaning the server sits
 * behind a known reverse proxy that strips and rewrites those headers
 * (e.g. Cloudflare, an AWS ALB, an nginx ingress).
 *
 * Without this guard, any unauthenticated caller could send
 * `X-Forwarded-For: <victim>` to evade IP-based rate limiting or to
 * poison logs.
 *
 * @returns the resolved client IP, or `'unknown'` when none can be determined
 */
export function getClientIp(event: H3Event): string {
  const req = event.node.req;
  const trustProxy = process.env.TRUST_PROXY === 'true';

  if (trustProxy) {
    const fwd = req.headers['x-forwarded-for'];
    const fwdValue = Array.isArray(fwd) ? fwd[0] : fwd;
    const firstHop = fwdValue?.split(',')[0]?.trim();
    if (firstHop) return firstHop;

    const realIp = req.headers['x-real-ip'];
    const realValue = Array.isArray(realIp) ? realIp[0] : realIp;
    if (realValue) return realValue.trim();
  }

  return req.socket.remoteAddress || 'unknown';
}
