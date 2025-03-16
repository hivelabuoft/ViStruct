const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");

module.exports = {
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
        // Specify languages you need (here we use JSON for example)
        languages: ["json"],
      })
    );

    return config;
  },
};
