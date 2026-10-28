import createNextIntlPlugin from 'next-intl/plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ogroniedu/contracts'],
  reactStrictMode: true,
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  experimental: {
    agentUpgrade: 'security',
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'clsx',
      'tailwind-merge',
      '@radix-ui/react-slot',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(self), microphone=(self), geolocation=(self), payment=(self "https://sandbox.sslcommerz.com" "https://securepay.sslcommerz.com" "https://seamless-epay.sslcommerz.com")',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://sandbox.sslcommerz.com https://securepay.sslcommerz.com https://seamless-epay.sslcommerz.com https://meet.jit.si",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://sandbox.sslcommerz.com https://securepay.sslcommerz.com https://seamless-epay.sslcommerz.com",
              "img-src 'self' blob: data: https: http:",
              "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
              "connect-src 'self' http://localhost:4000 ws://localhost:4000 https: wss:",
              "frame-src 'self' https://sandbox.sslcommerz.com https://securepay.sslcommerz.com https://seamless-epay.sslcommerz.com https://*.sslcommerz.com https://meet.jit.si",
              "frame-ancestors 'none'",
              "form-action 'self' https://sandbox.sslcommerz.com https://securepay.sslcommerz.com https://*.sslcommerz.com",
              "base-uri 'self'",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
