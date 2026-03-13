/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^octokit$': '<rootDir>/__mocks__/octokit.js',
    '^@/(.*)$': '<rootDir>/$1'
  }
};
