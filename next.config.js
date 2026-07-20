/** @type {import('next').NextConfig} */
const nextConfig = {
  // The @caistech react widgets ship compiled ESM without a top-level 'use client' banner;
  // Turbopack needs them transpiled through Next to resolve the client boundary + @elevenlabs/react.
  transpilePackages: ['@caistech/elevenlabs-convai', '@caistech/discovery-agent'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
