module.exports = {
  testEnvironment: 'node',
  cacheDirectory: '<rootDir>/.jest-cache',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/services/**/*.js',
    'src/controllers/**/*.js',
    'src/middlewares/**/*.js',
    'src/utils/**/*.js'
  ],
  coverageDirectory: 'coverage',
  testTimeout: 30000,
  // 串行执行，避免 SQLite 测试库并发冲突
  maxWorkers: 1
};
