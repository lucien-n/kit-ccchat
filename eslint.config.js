import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import ts from "typescript-eslint";
import svelteConfig from "./client/svelte.config.js";

/** Bans the em dash everywhere, including comments and JSX-ish text, which no
 *  stock rule reaches. */
const house = {
  rules: {
    "no-em-dash": {
      meta: {
        type: "problem",
        docs: { description: "em dashes are banned" },
        messages: { found: "Em dash is banned. Use a colon, a full stop, or brackets." },
      },
      create(context) {
        const src = context.sourceCode;
        // Built, not written: a literal here would make the rule flag itself.
        const EM_DASH = String.fromCharCode(0x2014);
        const report = (node, text) => {
          if (text.includes(EM_DASH)) context.report({ node, messageId: "found" });
        };
        return {
          Program() {
            for (const c of src.getAllComments()) report(c, c.value);
          },
          Literal(node) {
            if (typeof node.value === "string") report(node, node.value);
          },
          TemplateElement(node) {
            report(node, node.value.raw);
          },
        };
      },
    },
  },
};

export default ts.config(
  {
    ignores: [
      "**/node_modules/**",
      "client/build/**",
      "client/.svelte-kit/**",
      "server/drizzle/**",
      "server/data/**",
      "data/**",
      // Vendored by the shadcn-svelte CLI. Re-adding a component overwrites any
      // fix made here, so lint what we own.
      "client/src/lib/components/ui/**",
    ],
  },

  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,

  { plugins: { house }, rules: { "house/no-em-dash": "error" } },

  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      // Empty catch is the idiom here for "best effort, carry on".
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },

  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: {
        // Without this the script block is read as plain JS and every type
        // annotation is a parse error.
        parser: ts.parser,
        extraFileExtensions: [".svelte"],
        svelteConfig,
      },
    },
  },

  {
    files: ["server/**/*.ts", "shared/**/*.ts"],
    languageOptions: { globals: globals.node },
  },

  {
    files: ["server/tests/**/*.ts"],
    rules: {
      // The harness erases types on purpose: it pokes at responses the app owns
      // and asserts on shapes, which is the job.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
