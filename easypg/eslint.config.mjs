import svelte from "eslint-plugin-svelte";
import tseslint from "typescript-eslint";
import svelteConfig from "./svelte.config.js";

export default [
    {
        ignores: ["build/**", ".svelte-kit/**", "node_modules/**"]
    },
    ...tseslint.configs.recommended,
    ...svelte.configs["flat/recommended"],
    {
        languageOptions: {
            parserOptions: {
                projectService: false
            }
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }
            ],
            // Behavior-sensitive Svelte conventions in this codebase (routing
            // without resolve(), unkeyed each blocks, $state+$effect patterns):
            // surfaced as warnings, not CI failures
            "svelte/no-navigation-without-resolve": "warn",
            "svelte/require-each-key": "warn",
            "svelte/prefer-writable-derived": "warn"
        }
    },
    {
        files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
        languageOptions: {
            parserOptions: {
                // TypeScript parser for <script lang="ts"> blocks
                parser: tseslint.parser,
                svelteConfig
            }
        },
        // Svelte 5 runes ($props/$state/$derived) are invisible to the base
        // unused-vars rule; svelte-check already type-checks these files
        rules: {
            "@typescript-eslint/no-unused-vars": "off"
        }
    }
];
