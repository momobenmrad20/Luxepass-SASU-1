import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // doit correspondre à CORS_ORIGIN côté backend (config.ts, défaut http://localhost:3000 — à surcharger)
    host: true, // autorise les hôtes distants (LAN, tunnel, conteneur) en plus de localhost
  },
});
