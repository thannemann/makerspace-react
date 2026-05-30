/** @type {import('jest').Config} */
module.exports = {
  collectCoverage: false,
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  coverageReporters: ['text', 'html'],
  transform: {
    '^.+\\.(j|t)sx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  testRegex: '/tests/unit/.*\\.spec\\.(j|t)sx?$',
  moduleNameMapper: {
    '^(api|app|ui|documents)[/](.*)$': '<rootDir>/src/$1/$2',
  },
  moduleFileExtensions: ['js', 'ts', 'tsx'],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {},
};
