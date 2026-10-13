import createNextIntlPlugin from 'next-intl/plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ogroniedu/contracts'],
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    // optimizePackageImports: ['lucide-react'],
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
