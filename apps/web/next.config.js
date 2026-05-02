/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@pavane/shared"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
