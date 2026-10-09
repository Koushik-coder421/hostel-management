import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        // Manual scratch/test scripts, not shipped application code
        ignores: ["dist/**", "node_modules/**", "src/scratch/**"]
    },
    ...tseslint.configs.recommended,
    {
        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }
            ]
        }
    }
);
