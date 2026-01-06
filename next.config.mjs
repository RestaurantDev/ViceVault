/** @type {import('next').NextConfig} */
const nextConfig = {
  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Fix for yahoo-finance2 and other Node.js modules in client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // Suppress yahoo-finance2 warnings in dev
  experimental: {
    serverComponentsExternalPackages: ["yahoo-finance2"],
  },

  // Image optimization
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
