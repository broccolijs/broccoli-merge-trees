"use strict";

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  env: {
    node: true,
  },
  rules: {
    "quotes": "off", // note you must disable the base rule as it can report incorrect errors
    "no-unused-vars": "off", // note you must disable the base rule as it can report incorrect errors
    "@typescript-eslint/quotes": ["error", "double"],
    "@typescript-eslint/no-use-before-define": "off",
  },
  overrides: [
    {
      files: ["test/**/*.js"],
      plugins: ["mocha"],
      env: {
        mocha: true,
      },
      rules: {
        "mocha/no-exclusive-tests": "error",
        "mocha/handle-done-callback": "error",
        "@typescript-eslint/no-var-requires": "off"
      },
    },
  ],
};
