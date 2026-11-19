const alias = { '^@/(.*)$': '<rootDir>/src/$1' };

const nodeProject = (displayName, dir) => ({
  displayName,
  testEnvironment: 'node',
  testMatch: [`<rootDir>/${dir}/**/*.test.ts`],
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
  moduleNameMapper: alias,
});

module.exports = {
  projects: [
    {
      displayName: 'app',
      preset: 'jest-expo',
      testMatch: ['<rootDir>/src/**/*.test.ts?(x)'],
      moduleNameMapper: alias,
    },
    nodeProject('server', 'server'),
    nodeProject('integration', 'integration'),
  ],
};
