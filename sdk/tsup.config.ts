import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts"
    },
    format: ["esm"],
    dts: false,
    clean: true,
    platform: "node"
  },
  {
    entry: {
      browser: "src/browser.ts"
    },
    format: ["esm"],
    dts: false,
    clean: false,
    platform: "browser"
  }
]);