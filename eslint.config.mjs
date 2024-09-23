import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

const config = [...compat.extends("next/core-web-vitals", "next/typescript"), {
    plugins: {
        "simple-import-sort": simpleImportSort,
        "unused-imports": unusedImports,
    },

    rules: {
        "@next/next/no-img-element": "off",

        "simple-import-sort/imports": ["warn", {
            groups: [["^react", "^[a-zA-Z_]+"], ["^@?\\w"], ["^\\."]],
        }],
        "no-unused-vars": "off",
        "unused-imports/no-unused-imports": "error",
        "unused-imports/no-unused-vars": [
            "warn",
            {
                "vars": "all",
                "varsIgnorePattern": "^_",
                "args": "after-used",
                "argsIgnorePattern": "^_"
            }
        ]
    },
}];

export default config