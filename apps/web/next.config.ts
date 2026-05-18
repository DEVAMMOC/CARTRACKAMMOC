import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/relatorios/exportar/pdf": ["./node_modules/pdfkit/js/data/**/*"],
  },
};

export default nextConfig;
