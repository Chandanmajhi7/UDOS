//@ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Traces only the dependencies each route actually needs into .next/standalone —
  // the basis for a minimal Docker image (Dockerfile) instead of shipping the
  // full pnpm workspace node_modules into the runtime image.
  output: 'standalone',
};

module.exports = nextConfig;
