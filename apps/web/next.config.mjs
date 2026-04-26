/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Next 15 promoted typedRoutes out of experimental.
  typedRoutes: true,

  // InterwovenKit pulls in @cosmjs/* and cosmjs-types. Tell Next to
  // transpile these through SWC so deep imports resolve cleanly under
  // webpack 5's exports-field enforcement.
  transpilePackages: [
    '@initia/interwovenkit-react',
    '@cosmjs/amino',
    '@cosmjs/proto-signing',
    '@cosmjs/stargate',
    '@cosmjs/tendermint-rpc',
    '@cosmjs/encoding',
    '@cosmjs/math',
    'cosmjs-types',
  ],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'r2.provenance.app' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
