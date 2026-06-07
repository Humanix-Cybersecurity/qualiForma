// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests unitaires (sans base de données). Les tests d'isolation RLS utilisent
// test/jest-isolation.json (intégration, PostgreSQL requis).
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleNameMapper: {
    '^@humanix/domain$': '<rootDir>/../../../packages/domain/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
  },
};
