/** @type {import('next').NextConfig} */
const nextConfig = {
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

  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;

// Redirect for admin/invitations
module.exports.redirects = async () => {
  return [
    {
      source: '/admin/invitations',
      destination: '/admin/beta-testers',
      permanent: true,
    },
  ];
};