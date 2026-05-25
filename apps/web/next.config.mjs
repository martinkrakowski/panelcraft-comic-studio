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
  // Signed cover/panel URLs are served directly by Supabase Storage. Match
  // any *.supabase.co project host scoped to the storage object path so we
  // don't depend on an env var that Next.js (rooted at apps/web/) wouldn't
  // pick up from the monorepo-level .env.
  {
    protocol: 'https',
    hostname: '**.supabase.co',
    pathname: '/storage/v1/object/**',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
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
