import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = defineConfig([
  // Presets oficiais do Next.js
  ...nextVitals,
  ...nextTs,

  // Regras do projeto
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      // -----------------------------
      // ORGANIZAÇÃO DE IMPORTS
      // -----------------------------
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",

      // -----------------------------
      // FLEXIBILIDADE PARA DESENVOLVIMENTO
      // -----------------------------
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",

      "no-unused-vars": "off",

      "react/no-unescaped-entities": "off",

      // Evita erro em props não usadas temporariamente
      "react/jsx-no-undef": "off",
    },
  },

  // Arquivos ignorados
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
