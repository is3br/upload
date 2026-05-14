import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Change "media-vault" to your actual GitHub repository name
const REPO_NAME = "upload";

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === "production" ? `/${REPO_NAME}/` : "/",
});
