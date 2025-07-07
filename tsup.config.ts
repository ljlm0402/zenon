import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/createStore.ts",
    "src/plugins/index.ts",
    "src/plugins/withLogger.ts",
    "src/plugins/withPersist.ts",
    "src/utils/compose.ts",
  ],
  dts: true,
  format: ["esm", "cjs"],
  outDir: "dist",
  clean: true,
});
