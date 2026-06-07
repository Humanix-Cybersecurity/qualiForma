// SPDX-License-Identifier: AGPL-3.0-or-later
// Étend les matchers vitest avec ceux de jest-axe (toHaveNoViolations).
import 'vitest';

declare module 'vitest' {
  interface Assertion<T = unknown> {
    toHaveNoViolations(): T;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}
