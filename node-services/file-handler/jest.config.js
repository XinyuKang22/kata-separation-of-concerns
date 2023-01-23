/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  collectCoverage: true,
  coverageThreshold: {
    global: {
      statements: 69,
      branches: 23,
      functions: 36,
      lines: 69,
    },
  },
};
