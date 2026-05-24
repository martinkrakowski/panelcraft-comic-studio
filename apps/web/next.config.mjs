/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@panelcraft/ui",
    "@panelcraft/types",
    "@panelcraft/shared"
  ],
  reactStrictMode: true,
};

export default nextConfig;
