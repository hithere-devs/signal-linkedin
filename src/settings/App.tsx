import { useEffect, useState } from 'react';
import type {
  BootstrapPayload,
  CloudAuthResponse,
  CloudStatus,
  ExtensionSettings,
  UserProfile
} from '../types';
import { AI_PRESETS } from '../ai/presets';
import { requestHostAccess, requestImageAccess } from '../lib/permissions';
import { sendMessage } from '../lib/runtime';
import TagEditor from './TagEditor';

const JOBS: Array<{ value: ExtensionSettings['jobTreatment']; label: string }> = [
  { value: 'show', label: 'Show all job posts' },
  { value: 'relevant', label: 'Score relevant jobs normally, filter the rest' },
  { value: 'hide', label: 'Hide all job posts' }
];

function formatSyncTime(value: number | null): string {
  if (!value) return 'Not synced yet';
  return `Last synced ${new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(value)}`;
}

export default function App() {
  const isWelcome = new URLSearchParams(location.search).has('welcome');
  const [boot, setBoot] = useState<BootstrapPayload | null>(null);
  const [profileDraft, setProfileDraft] = useState<UserProfile | null>(null);
  const [cloud, setCloud] = useState<CloudStatus | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [aiTest, setAiTest] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      sendMessage<BootstrapPayload>({ type: 'bootstrap' }),
      sendMessage<CloudStatus>({ type: 'cloud:status' })
    ])
      .then(([payload, cloudStatus]) => {
        setBoot(payload);
        setProfileDraft(payload.profile);
        setCloud(cloudStatus);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, []);

  const flash = () => {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1600);
  };

  const fail = (reason: unknown) => {
    setError(reason instanceof Error ? reason.message : String(reason));
  };

  const saveProfile = async () => {
    if (!profileDraft || busy) return;
    setBusy('profile');
    setError(null);
    try {
      const saved = await sendMessage<UserProfile>({ type: 'setProfile', value: profileDraft });
      setProfileDraft(saved);
      setBoot((current) => current ? { ...current, profile: saved } : current);
      flash();
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(null);
    }
  };

  const patchSetting = async (key: keyof ExtensionSettings, value: unknown) => {
    if (busy) return;
    const previous = boot?.settings;
    setBoot((current) => current ? { ...current, settings: { ...current.settings, [key]: value } } : current);
    setError(null);
    try {
      const saved = await sendMessage<ExtensionSettings>({ type: 'setSetting', key, value });
      setBoot((current) => current ? { ...current, settings: saved } : current);
      flash();
    } catch (reason) {
      if (previous) setBoot((current) => current ? { ...current, settings: previous } : current);
      fail(reason);
    }
  };

  const setAiDraft = (value: Partial<ExtensionSettings['ai']>) => {
    setBoot((current) => current
      ? { ...current, settings: { ...current.settings, ai: { ...current.settings.ai, ...value } } }
      : current);
  };

  const patchAi = async (value: Partial<ExtensionSettings['ai']>) => {
    if (busy) return;
    const previous = boot?.settings.ai;
    setAiDraft(value);
    setError(null);
    try {
      const saved = await sendMessage<ExtensionSettings>({ type: 'setAi', value });
      setBoot((current) => current ? { ...current, settings: saved } : current);
      flash();
    } catch (reason) {
      if (previous) setAiDraft(previous);
      fail(reason);
    }
  };

  const ensureCloudAccess = async () => {
    if (!cloud?.origin) throw new Error('Cloud sync is not configured in this build.');
    const granted = await requestHostAccess(cloud.origin);
    if (!granted) throw new Error('Cloud access was not granted.');
  };

  const runCloudAction = async (
    label: string,
    message: Record<string, unknown>,
    success?: string
  ) => {
    if (busy) return;
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      await ensureCloudAccess();
      const result = await sendMessage<CloudAuthResponse | CloudStatus>(message);
      if ('status' in result) {
        setCloud(result.status);
        setNotice(result.notice ?? success ?? null);
      } else {
        setCloud(result);
        setNotice(success ?? null);
      }
      if (label === 'signin' || label === 'signup') setPassword('');
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(null);
    }
  };

  if (!boot || !profileDraft || !cloud) {
    return (
      <div className="page">
        <div className="loading" role="status">{error ? `Could not load Signal: ${error}` : 'Loading Signal…'}</div>
      </div>
    );
  }

  const settings = boot.settings;

  const chooseAiPreset = (id: string) => {
    const preset = AI_PRESETS.find((item) => item.id === id);
    if (!preset) return;
    void patchAi({
      preset: id,
      ...(id === 'custom' ? {} : { baseUrl: preset.baseUrl, model: preset.model })
    });
  };

  const toggleAi = async (enabled: boolean) => {
    try {
      if (enabled && settings.ai.baseUrl && !(await requestHostAccess(settings.ai.baseUrl))) {
        throw new Error('Host access is required to contact your AI provider.');
      }
      await patchAi({ enabled });
    } catch (reason) {
      fail(reason);
    }
  };

  const toggleVision = async (enabled: boolean) => {
    try {
      if (enabled && !(await requestImageAccess())) throw new Error('Image access was not granted.');
      await patchAi({ vision: enabled });
    } catch (reason) {
      fail(reason);
    }
  };

  const testAi = async () => {
    setAiTest('Testing connection…');
    setError(null);
    try {
      if (!(await requestHostAccess(settings.ai.baseUrl))) throw new Error('Host access was not granted.');
      const result = await sendMessage<{ ok: boolean; error?: string }>({ type: 'ai:test' });
      setAiTest(result.ok ? 'Connected' : result.error ?? 'Connection failed');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      setAiTest(message);
    }
  };

  const exportData = async () => {
    try {
      const data = await sendMessage<Record<string, unknown>>({ type: 'data:export' });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `signal-data-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      fail(reason);
    }
  };

  const clearData = async () => {
    if (!confirm('Delete local Signal settings, profile, stats, and sign-in session? Synced cloud data will remain until you delete your account.')) return;
    try {
      await sendMessage({ type: 'data:clear' });
      location.reload();
    } catch (reason) {
      fail(reason);
    }
  };

  const deleteAccount = async () => {
    if (!confirm('Permanently delete your Signal account and synced data? This cannot be undone.')) return;
    await runCloudAction('delete', { type: 'cloud:deleteAccount' }, 'Account deleted.');
  };

  return (
    <div className="page">
      <header>
        <h1><span className="mark" aria-hidden="true" /> Signal Settings</h1>
        <span className={`saved ${savedFlash ? 'visible' : ''}`} aria-live="polite">Saved</span>
      </header>

      {(error || notice) && (
        <div className={`notice ${error ? 'notice-error' : ''}`} role={error ? 'alert' : 'status'}>
          <span>{error ?? notice}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => { setError(null); setNotice(null); }}>×</button>
        </div>
      )}

      {isWelcome && !error && !notice && (
        <div className="welcome" role="status">
          <strong>Set up your feed in two minutes.</strong>
          <span>Adjust the starter profile below, choose a threshold from the toolbar popup, then open LinkedIn.</span>
          <button className="btn" onClick={() => void sendMessage({ type: 'openPage', page: 'demo' }).catch(fail)}>Preview Signal on a demo feed</button>
        </div>
      )}

      <section className="card account-card">
        <div className="section-title-row">
          <div>
            <h2>Account and sync</h2>
            <p className="section-hint">Keep your profile, preferences, feedback, and recent stats in sync. AI keys never leave this browser.</p>
          </div>
          {cloud.signedIn && <span className="status-pill">Synced</span>}
        </div>

        {!cloud.configured ? (
          <div className="empty-state">
            <strong>Cloud sync is not configured</strong>
            <p>Add the Supabase project URL and anon key at build time. Local filtering still works normally.</p>
          </div>
        ) : cloud.signedIn ? (
          <div className="account-signed-in">
            <div>
              <strong>{cloud.user?.email}</strong>
              <p>{cloud.pending ? 'Changes are waiting to sync' : formatSyncTime(cloud.lastSyncedAt)}</p>
              {cloud.lastError && <p className="inline-error">{cloud.lastError}</p>}
            </div>
            <div className="row wrap-row">
              <button className="btn btn-primary" disabled={!!busy} onClick={() => runCloudAction('sync', { type: 'cloud:sync', direction: 'auto' }, 'Sync complete.')}>Sync now</button>
              <button className="btn" disabled={!!busy} onClick={() => runCloudAction('push', { type: 'cloud:sync', direction: 'push' }, 'This browser was saved to the cloud.')}>Upload this browser</button>
              <button className="btn" disabled={!!busy} onClick={() => runCloudAction('pull', { type: 'cloud:sync', direction: 'pull' }, 'Cloud settings were restored.')}>Restore from cloud</button>
              <button className="btn" disabled={!!busy} onClick={() => runCloudAction('signout', { type: 'cloud:signout' }, 'Signed out.')}>Sign out</button>
            </div>
          </div>
        ) : (
          <form
            className="auth-form"
            onSubmit={(event) => {
              event.preventDefault();
              void runCloudAction(authMode, { type: `cloud:${authMode}`, email, password });
            }}
          >
            <div className="auth-tabs" role="tablist" aria-label="Account action">
              <button type="button" role="tab" aria-selected={authMode === 'signin'} className={authMode === 'signin' ? 'active' : ''} onClick={() => setAuthMode('signin')}>Sign in</button>
              <button type="button" role="tab" aria-selected={authMode === 'signup'} className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>Create account</button>
            </div>
            <div className="grid-2 auth-fields">
              <div className="field">
                <label htmlFor="account-email">Email</label>
                <input id="account-email" className="text-input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="account-password">Password</label>
                <input id="account-password" className="text-input" type="password" minLength={8} maxLength={128} autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} required value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
            </div>
            <div className="row">
              <button className="btn btn-primary" type="submit" disabled={!!busy}>{authMode === 'signup' ? 'Create account' : 'Sign in'}</button>
              <button className="text-button" type="button" disabled={!!busy || !email} onClick={() => runCloudAction('recover', { type: 'cloud:recover', email })}>Forgot password?</button>
            </div>
          </form>
        )}
      </section>

      <section className="card">
        <h2>Professional profile</h2>
        <p className="section-hint">Posts are scored against this profile. Specific interests and goals produce better results.</p>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="profile-role">Your role</label>
            <input id="profile-role" className="text-input" maxLength={160} value={profileDraft.role} onChange={(event) => setProfileDraft({ ...profileDraft, role: event.target.value })} />
          </div>
        </div>
        <TagEditor label="Industries" values={profileDraft.industries} onChange={(value) => setProfileDraft({ ...profileDraft, industries: value })} />
        <TagEditor label="Skills and technologies" hint="Languages, frameworks, and tools you use or want to learn" values={profileDraft.skills} onChange={(value) => setProfileDraft({ ...profileDraft, skills: value })} />
        <TagEditor label="Interests" hint="Topics worth your attention, such as AI startups, fundraising, or design systems" values={profileDraft.interests} onChange={(value) => setProfileDraft({ ...profileDraft, interests: value })} />
        <TagEditor label="Career goals" values={profileDraft.careerGoals} onChange={(value) => setProfileDraft({ ...profileDraft, careerGoals: value })} />
        <button className="btn btn-primary" disabled={busy === 'profile'} onClick={saveProfile}>{busy === 'profile' ? 'Saving…' : 'Save profile'}</button>
      </section>

      <section className="card">
        <h2>Companies and roles</h2>
        <TagEditor label="Companies you care about" hint="Job posts and news about these companies get a stronger boost" values={profileDraft.companies} onChange={(value) => setProfileDraft({ ...profileDraft, companies: value })} placeholder="OpenAI, Stripe, Vercel" />
        <TagEditor label="Roles you would consider" values={profileDraft.desiredRoles} onChange={(value) => setProfileDraft({ ...profileDraft, desiredRoles: value })} placeholder="Founding Engineer, AI Engineer" />
        <TagEditor label="Topics to avoid" hint="Posts dominated by these topics receive a strong penalty" values={profileDraft.topicsToAvoid} onChange={(value) => setProfileDraft({ ...profileDraft, topicsToAvoid: value })} placeholder="crypto, real estate" />
        <TagEditor label="People to always show" values={profileDraft.followedPeople} onChange={(value) => setProfileDraft({ ...profileDraft, followedPeople: value })} />
        <TagEditor label="People to always hide" values={profileDraft.mutedPeople} onChange={(value) => setProfileDraft({ ...profileDraft, mutedPeople: value })} />
        <button className="btn btn-primary" disabled={busy === 'profile'} onClick={saveProfile}>{busy === 'profile' ? 'Saving…' : 'Save preferences'}</button>
      </section>

      <section className="card">
        <h2>Feed behavior</h2>
        <div className="field">
          <label htmlFor="job-treatment">Job posts</label>
          <select id="job-treatment" className="text-input" value={settings.jobTreatment} onChange={(event) => void patchSetting('jobTreatment', event.target.value)}>
            {JOBS.map((job) => <option key={job.value} value={job.value}>{job.label}</option>)}
          </select>
        </div>
        <ToggleRow label="Hide sponsored content" sub="Remove LinkedIn ads from the feed" checked={settings.hideAds} onChange={(value) => void patchSetting('hideAds', value)} />
        <ToggleRow label="Debug logging" sub="Write detailed diagnostic output on LinkedIn pages" checked={settings.debug} onChange={(value) => void patchSetting('debug', value)} />
      </section>

      <section className="card">
        <h2>AI provider <span className="optional">optional</span></h2>
        <p className="section-hint">Signal works offline with local heuristics. For deeper analysis, connect an OpenAI-compatible endpoint. Your API key stays in this browser and is never synced.</p>
        <ToggleRow label="Enable AI analysis" checked={settings.ai.enabled} onChange={(value) => void toggleAi(value)} />
        <div className="field">
          <label htmlFor="ai-preset">Provider preset</label>
          <select id="ai-preset" className="text-input" value={settings.ai.preset ?? 'custom'} onChange={(event) => chooseAiPreset(event.target.value)}>
            {AI_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </select>
          <p className="field-hint">{AI_PRESETS.find((preset) => preset.id === (settings.ai.preset ?? 'custom'))?.description}</p>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="ai-url">Base URL</label>
            <input id="ai-url" className="text-input" inputMode="url" placeholder="https://api.openai.com/v1" value={settings.ai.baseUrl} onChange={(event) => setAiDraft({ baseUrl: event.target.value })} onBlur={() => void patchAi({ baseUrl: settings.ai.baseUrl })} />
          </div>
          <div className="field">
            <label htmlFor="ai-model">Model</label>
            <input id="ai-model" className="text-input" placeholder="gpt-4o-mini" value={settings.ai.model} onChange={(event) => setAiDraft({ model: event.target.value })} onBlur={() => void patchAi({ model: settings.ai.model })} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="ai-key">API key</label>
          <input id="ai-key" className="text-input" type="password" autoComplete="off" placeholder="sk-…" value={settings.ai.apiKey} onChange={(event) => setAiDraft({ apiKey: event.target.value })} onBlur={() => void patchAi({ apiKey: settings.ai.apiKey })} />
        </div>
        <ToggleRow label="Vision" sub="Send up to two post images to your provider when deep analysis runs" checked={settings.ai.vision} onChange={(value) => void toggleVision(value)} />
        <div className="row">
          <button className="btn" onClick={testAi}>Test connection</button>
          {aiTest && <span className={`test-result ${aiTest === 'Connected' ? 'ok' : ''}`} role="status">{aiTest}</span>}
        </div>
      </section>

      <section className="card danger">
        <h2>Data controls</h2>
        <p className="section-hint">Export excludes your AI key and sign-in tokens. Deleting local data does not delete an existing cloud account.</p>
        <div className="row wrap-row">
          <button className="btn" onClick={exportData}>Export my data</button>
          <button className="btn btn-danger" onClick={clearData}>Delete local data</button>
          {cloud.signedIn && <button className="btn btn-danger" disabled={!!busy} onClick={deleteAccount}>Delete account</button>}
        </div>
      </section>

      <footer>Signal v{chrome.runtime.getManifest().version} · Local-first feed intelligence</footer>
    </div>
  );
}

function ToggleRow({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange(value: boolean): void }) {
  return (
    <label className="toggle-row">
      <span>
        <span className="toggle-label">{label}</span>
        {sub && <span className="toggle-sub">{sub}</span>}
      </span>
      <span className="switch">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span className="slider-ui" aria-hidden="true" />
      </span>
    </label>
  );
}
