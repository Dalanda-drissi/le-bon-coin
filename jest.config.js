const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  setupFilesAfterEnv: ['<rootDir>/jest/setupFilesAfterEnv.js'],
  moduleNameMapper: {
    '\\.(s?css)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga|pdf|svg|avif)$': '<rootDir>/jest/moduleMapper/fileMock.js',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',

    '!src/test-utils/**',
    '!src/types/**',
    '!src/**/*.d.ts',
    '!src/pages/_app.tsx',
  ],

  coverageThreshold: {
    global: {
      statements: 88,
      branches: 76,
      functions: 90,
      lines: 90,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
