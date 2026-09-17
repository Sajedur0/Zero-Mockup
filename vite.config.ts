import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: { host: "0.0.0.0", allowedHosts: true },
  // `npx vite preview` serves the real production bundle, which is the only
  // build that reflects how the app feels on a phone.
  preview: { host: "0.0.0.0", allowedHosts: true },
});
