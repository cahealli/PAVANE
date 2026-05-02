/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@pavane/shared"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:7124/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
