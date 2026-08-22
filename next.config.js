/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/app-standalone.html',
        permanent: false
      },
      {
        source: '/admin',
        destination: '/admin.html',
        permanent: false
      }
    ];
  }
};

module.exports = nextConfig;
