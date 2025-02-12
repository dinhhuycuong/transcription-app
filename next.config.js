/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    images: {
      unoptimized: true,
    },
    basePath: '/transcription-app',
    assetPrefix: '/transcription-app/',
    trailingSlash: true,
  };
  
  module.exports = nextConfig;