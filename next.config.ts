import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ["192.168.1.23", "localhost", "127.0.0.1","0.0.0.0",],
};

export default nextConfig;
