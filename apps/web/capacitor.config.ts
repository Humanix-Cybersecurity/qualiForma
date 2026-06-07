// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CapacitorConfig } from '@capacitor/cli';

// Packaging natif iOS/Android depuis la même base de code (ADR 0001).
const config: CapacitorConfig = {
  appId: 'app.humanix.suivi',
  appName: 'Humanix',
  webDir: 'dist',
};

export default config;
