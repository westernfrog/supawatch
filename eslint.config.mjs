import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // These two rules ship with the React Compiler tooling, which this project
    // does not use (the compiler was removed for dev-server speed). They flag
    // idiomatic, safe patterns — latest-handler refs, mirror refs synced in an
    // effect, and inline handler arrays — so keep them visible as warnings
    // rather than failing the production build.
    rules: {
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
