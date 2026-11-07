const createJestConfig = require("next/jest");

const createConfig = createJestConfig({ dir: "./" });

module.exports = createConfig({
  testEnvironment: "jsdom",
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
});
