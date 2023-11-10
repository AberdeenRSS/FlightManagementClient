/* eslint-env node */
require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
  "root": true,
  "extends": [
    "plugin:vue/vue3-essential",
    "eslint:recommended",
    "@vue/eslint-config-typescript/recommended"
  ],
  "overrides": [
    {
      "files": [
        "cypress/e2e/**.{cy,spec}.{js,ts,jsx,tsx}"
      ],
      "extends": [
        "plugin:cypress/recommended"
      ]
    }
  ],
  "rules": {
    "@typescript-eslint/no-non-null-assertion": "off",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["warn", {"varsIgnorePattern": "^_", "argsIgnorePattern": "^_" }],
    "vue/no-ref-as-operand": "off",
    "vue/multi-word-component-names": "off",
    "no-useless-escape": "off"
  }
}
