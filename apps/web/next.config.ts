import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// One .env at the repo root serves the web app, the pipeline and the scripts.
const rootEnvPath = path.resolve(process.cwd(), "../../.env");
if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

// 25 MB per file (F2), plus room for the multipart boundaries and headers.
const UPLOAD_BODY_SIZE_LIMIT = "26mb";

const nextConfig: NextConfig = {
  // Don't advertise the framework in response headers.
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: UPLOAD_BODY_SIZE_LIMIT,
    },
  },
};

export default nextConfig;
