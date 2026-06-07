// SPDX-License-Identifier: AGPL-3.0-or-later
// Gate d'accessibilité (RGAA/WCAG AA, ADR 0004). axe-core sur les écrans publics +
// le design system. 0 violation critique/sérieuse exigée — le build CI échoue sinon.
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { createI18n } from '@humanix/i18n';
import { Alert, Button, TextField } from '@humanix/ui';
import { AuthProvider } from '../auth/AuthProvider';
import { LoginPage } from '../pages/LoginPage';
import { AccessibilitePage } from '../pages/AccessibilitePage';
import type { ReactElement } from 'react';

function renderWithProviders(ui: ReactElement) {
  const i18n = createI18n();
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('Accessibilité (axe-core, 0 violation)', () => {
  it('page de connexion', async () => {
    const { container } = renderWithProviders(<LoginPage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('déclaration d\'accessibilité', async () => {
    const { container } = renderWithProviders(<AccessibilitePage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('design system : champ texte avec erreur explicite', async () => {
    const { container } = render(
      <TextField label="Adresse e-mail" errorMessage="Adresse invalide." value="x" onChange={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('design system : bouton et alerte', async () => {
    const { container } = render(
      <div>
        <Button>Valider</Button>
        <Alert tone="error">Une erreur est survenue.</Alert>
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
