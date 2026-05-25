const defaultApiUrl = 'http://localhost:3001';
const isAbsoluteUrl = (url) => /^https?:\/\//.test(url);
const apiUrl =
  process.env.NEXT_PUBLIC_API_URL &&
  isAbsoluteUrl(process.env.NEXT_PUBLIC_API_URL)
    ? process.env.NEXT_PUBLIC_API_URL
    : defaultApiUrl;
const { hostname, port, protocol } = new URL(apiUrl);
const cleanProtocol = protocol.replace(':', '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@panelcraft/ui",
    "@panelcraft/types",
    "@panelcraft/shared"
  ],
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: cleanProtocol,
        hostname,
        port: port || undefined,
      },
    ],
  },
};

export default nextConfig;
