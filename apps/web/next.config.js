/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ogroniedu/contracts'],
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    // optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
