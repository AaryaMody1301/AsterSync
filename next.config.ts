import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.ASTERSYNC_RUNTIME === 'vercel' || process.env.VERCEL === '1' ? {
    typescript: {tsconfigPath: 'tsconfig.vercel.json'},
  } : {}),
};

export default nextConfig;
