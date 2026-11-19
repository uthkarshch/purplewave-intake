const alias = { '^@/(.*)$': '<rootDir>/src/$1' };

const nodeProject = (displayName, ...dirs) => ({
  displayName,
  testEnvironment: 'node',
  testMatch: dirs.map((dir) => `<rootDir>/${dir}/**/*.test.ts`),
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
    nodeProject('server', 'server', 'shared'),
    nodeProject('integration', 'integration'),
  ],
};
