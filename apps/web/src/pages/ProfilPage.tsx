// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Card, CardHeader, Spinner, TextField, Textarea } from '@humanix/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, downloadFile, type Profile } from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { QrCode } from '../components/QrCode';

export function ProfilPage() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [handicap, setHandicap] = useState('');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  // Enrôlement MFA (TOTP)
  const [mfaEnroll, setMfaEnroll] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);

  async function startMfa() {
    if (!auth) return;
    setMfaError(null);
    try {
      setMfaEnroll(await api.mfaSetup(auth));
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : t('common.error'));
    }
  }
  async function confirmMfa(e: FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setMfaError(null);
    try {
      await api.mfaConfirm(auth, mfaCode);
      setMfaEnroll(null);
      setMfaCode('');
      setProfile((p) => (p ? { ...p, mfaEnabled: true } : p));
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  useEffect(() => {
    if (!auth) return;
    api.getProfile(auth).then((p) => {
      setProfile(p);
      setPrenom(p.prenom ?? '');
      setNom(p.nom ?? '');
      setHandicap(p.handicapAdaptations ?? '');
    }).catch(() => setError(t('common.error')));
  }, [auth, t]);

  async function saveIdentity(e: FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setSavedMsg(null);
    setError(null);
    try {
      const updated = await api.updateProfile(auth, { prenom, nom, handicapAdaptations: handicap });
      setProfile((p) => (p ? { ...p, ...updated } : p));
      setSavedMsg(t('common.saved'));
    } catch {
      setError(t('common.error'));
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (!auth) return;
    setPwdMsg(null);
    setPwdError(null);
    try {
      await api.changePassword(auth, currentPassword, newPassword);
      setPwdMsg(t('profile.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : t('common.error'));
    }
  }

  if (!profile) {
    return (
      <>
        <PageHeader title={t('profile.title')} />
        <Spinner label={t('common.loading')} />
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('profile.title')} />
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Identité */}
        <Card>
          <CardHeader title={t('profile.identity')} />
          {savedMsg ? <div className="mb-3"><Alert tone="success">{savedMsg}</Alert></div> : null}
          {error ? <div className="mb-3"><Alert tone="error">{error}</Alert></div> : null}
          <form onSubmit={saveIdentity} className="flex flex-col gap-4">
            <TextField label={t('profile.prenom')} value={prenom} onChange={setPrenom} autoComplete="given-name" />
            <TextField label={t('profile.nom')} value={nom} onChange={setNom} autoComplete="family-name" />
            <TextField
              label={t('profile.email')}
              value={profile.email}
              isReadOnly
              description={t('profile.emailReadonly')}
            />
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>{t('profile.role')} :</span>
              <Badge tone="brand">{t(`roles.${profile.role}`)}</Badge>
            </div>
            <Button type="submit" className="self-start">{t('common.save')}</Button>
          </form>
        </Card>

        {/* Accessibilité */}
        <Card>
          <CardHeader title={t('profile.accessibility')} />
          <form onSubmit={saveIdentity} className="flex flex-col gap-4">
            <Textarea
              label={t('profile.handicap')}
              description={t('profile.handicapHelp')}
              value={handicap}
              onChange={setHandicap}
              rows={5}
            />
            <Button type="submit" variant="secondary" className="self-start">{t('common.save')}</Button>
          </form>
        </Card>

        {/* Sécurité */}
        <Card>
          <CardHeader title={t('profile.security')} />
          <div className="mb-4 flex flex-col gap-3">
            <p className="flex items-center gap-2 text-sm text-slate-600">
              {t('profile.mfa')} :
              <Badge tone={profile.mfaEnabled ? 'success' : 'neutral'}>
                {profile.mfaEnabled ? t('profile.mfaEnabled') : t('profile.mfaDisabled')}
              </Badge>
            </p>
            {mfaError ? <Alert tone="error">{mfaError}</Alert> : null}
            {!profile.mfaEnabled && !mfaEnroll ? (
              <Button size="sm" variant="secondary" className="self-start" onPress={startMfa}>
                {t('profile.mfaEnable')}
              </Button>
            ) : null}
            {mfaEnroll ? (
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-sm text-slate-700">{t('profile.mfaScan')}</p>
                <div className="my-2"><QrCode value={mfaEnroll.otpauthUrl} alt={t('profile.mfaQrAlt')} size={180} /></div>
                <p className="break-all text-xs text-slate-500">
                  {t('profile.mfaSecret')} : <code className="font-mono">{mfaEnroll.secret}</code>
                </p>
                <form onSubmit={confirmMfa} className="mt-3 flex items-end gap-2">
                  <div className="flex-1">
                    <TextField label={t('profile.mfaCode')} value={mfaCode} onChange={setMfaCode} inputMode="numeric" isRequired />
                  </div>
                  <Button type="submit" size="sm">{t('profile.mfaConfirm')}</Button>
                </form>
              </div>
            ) : null}
          </div>
          {pwdMsg ? <div className="mb-3"><Alert tone="success">{pwdMsg}</Alert></div> : null}
          {pwdError ? <div className="mb-3"><Alert tone="error">{pwdError}</Alert></div> : null}
          <form onSubmit={savePassword} className="flex flex-col gap-4">
            <TextField
              label={t('profile.currentPassword')}
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
              isRequired
              autoComplete="current-password"
            />
            <TextField
              label={t('profile.newPassword')}
              description={t('profile.newPasswordHelp')}
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              isRequired
              autoComplete="new-password"
            />
            <Button type="submit" className="self-start">{t('profile.changePassword')}</Button>
          </form>
        </Card>

        {/* RGPD — droits de la personne */}
        <Card>
          <CardHeader title={t('profile.rgpd')} subtitle={t('profile.rgpdHelp')} />
          <Button
            variant="secondary"
            className="self-start"
            onPress={() => auth && downloadFile(auth, '/rgpd/me/export', 'mes-donnees.json')}
          >
            {t('profile.rgpdExport')}
          </Button>
        </Card>
      </div>
    </>
  );
}
