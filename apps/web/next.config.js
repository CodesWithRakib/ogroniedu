/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ogroniedu/contracts'],
  reactStrictMode: true,
  experimental: {
    // optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
