const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  webpack: (config, { isServer }) => {
    // For client-side, disable Node built-ins that Monaco might try to load.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }

    // Add the Monaco Editor plugin
    config.plugins.push(
      new MonacoWebpackPlugin({
        languages: ["json"],
      })
    );

    return config;
  },
};

module.exports = nextConfig;
