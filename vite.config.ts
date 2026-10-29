import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "API_PROXY_");
  return {
    plugins: [react()],
    test: {
      globals: true,
      environment: "node"
    },
    server: {
      allowedHosts: true,
      proxy: env.API_PROXY_TARGET ? { "/api": { target: env.API_PROXY_TARGET, changeOrigin: true } } : undefined
    }
  };
});

