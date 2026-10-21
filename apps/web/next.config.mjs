import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const defaultApiUrl = 'http://localhost:3001';
const isAbsoluteUrl = (url) => /^https?:\/\//.test(url);
const apiUrl =
  process.env.NEXT_PUBLIC_API_URL &&
  isAbsoluteUrl(process.env.NEXT_PUBLIC_API_URL)
    ? process.env.NEXT_PUBLIC_API_URL
    : defaultApiUrl;
const { hostname, port, protocol } = new URL(apiUrl);
const cleanProtocol = protocol.replace(':', '');

const remotePatterns = [
  {
    protocol: cleanProtocol,
    hostname,
    port: port || undefined,
  },
  // Media is served by the API at /api/media/** (covered by the API-host
  // pattern above).
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: [
    "@panelcraft/ui",
    "@panelcraft/types",
    "@panelcraft/shared"
  ],
  reactStrictMode: true,
  images: {
    remotePatterns,
  },
};

export default nextConfig;
