import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { webpack }) => {
    // BullMQ optionally references @valkey/valkey-glide.
    // We don't use the Glide client, so ignore the missing module.
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@valkey\/valkey-glide$/,
      })
    );
    return config;
  },
};

export default nextConfig;
