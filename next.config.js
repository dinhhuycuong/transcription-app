/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    images: {
      unoptimized: true,
    },
    // Replace 'your-repo-name' with your actual GitHub repository name
    basePath: '/transcription-app',
  };
  
  module.exports = nextConfig;