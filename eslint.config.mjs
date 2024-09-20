import simpleImportSort from "eslint-plugin-simple-import-sort";
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

export default [...compat.extends("next/core-web-vitals"), {
    plugins: {
        "simple-import-sort": simpleImportSort,
    },

    rules: {
        "@next/next/no-img-element": "off",

        "simple-import-sort/imports": ["warn", {
            groups: [["^react", "^[a-zA-Z_]+"], ["^@?\\w"], ["^\\."]],
        }],
    },
}];