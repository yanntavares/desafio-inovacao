import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// CSP sem nonce (o nonce exige render dinâmico e não convive com cacheComponents). O que protege o
// token do localStorage é o connect-src: um script injetado não consegue enviá-lo a outro domínio.
// Sem upgrade-insecure-requests: a API local é http e seria trocada para https.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self' ${API_URL}${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: [{ key: "Content-Security-Policy", value: csp }] }];
  },
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
