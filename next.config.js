/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: '/admin',
        destination: '/admin.html'
      },
      {
        source: '/admi',
        destination: '/admin.html'
      },
      {
        source: '/',
        destination: '/index.html'
      }
    ];
  }
};

module.exports = nextConfig;
