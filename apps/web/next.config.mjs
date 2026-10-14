/** @type {import('next').NextConfig} */
export default {
  transpilePackages: ['@honorar/chain', '@honorar/kernel', '@honorar/verifier'],
  reactStrictMode: true,
  poweredByHeader: false,
  images: { formats: ['image/avif', 'image/webp'] },
};
