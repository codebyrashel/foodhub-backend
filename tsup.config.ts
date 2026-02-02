import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "api",
  external: ["pg-native"],
  skipNodeModulesBundle: true,
  shims: true,
  outExtension({ format }) {
    if (format === "esm") return { js: ".mjs" };
    return { js: ".js" };
  },
  clean: true,
});