import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Este diretório vive dentro do repositório da aplicação SGRH, que tem o
  // seu próprio package-lock.json — sem isto, o Next.js infere a raiz do
  // workspace como a pasta de cima e tenta incluir ficheiros da app SGRH
  // (ex.: src/proxy.ts) que não pertencem a este site.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
