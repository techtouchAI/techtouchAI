module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^octokit$': '<rootDir>/__mocks__/octokit.ts'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!octokit|@octokit)'
  ],
};
