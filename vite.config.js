// Vite builds our React site. Nothing fancy needed here.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()] });
