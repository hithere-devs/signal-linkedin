import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Blend,
  Check,
  ChevronDown,
  ChevronsDownUp,
  Cloud,
  Cpu,
  EyeOff,
  Github,
  Info,
  KeyRound,
  ListFilter,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import type {
  AiConfig,
  CloudAuthResponse,
  CloudStatus,
  ExtensionSettings,
  UserProfile,
} from '../types';
import { AI_PRESETS } from '../ai/presets';
import { DEFAULT_WEIGHTS, sanitizeTagList } from '../lib/defaults';
import { FILTER_MODES } from '../lib/filtering';
import { downloadFile } from '../lib/insights';
import { isPreview, SOURCE_URL } from '../lib/environment';
import { requestHostAccess, requestImageAccess } from '../lib/permissions';
import { sendMessage } from '../lib/runtime';
import {
  AppShell,
  ConfirmDialog,
  LoadingState,
  Notice,
  PageHeading,
  SavedStatus,
  ThresholdControl,
  Toggle,
  type Section,
} from '../ui/components';
import SampleFeed from '../ui/SampleFeed';
import { errorMessage, useWorkspace } from '../ui/useWorkspace';
import TagEditor from './TagEditor';

const TITLES = {
  profile: ['Your signal profile', 'Tell Signal what matters to your work. Make the feed yours.'],
  feed: [
    'Keep the useful. Filter the rest.',
    'Choose your threshold, then see how it changes an example feed.',
  ],
  ai: ['Your AI connection', 'Local scoring comes built in. Add a provider only if you need one.'],
  account: [
    'Your workspace, wherever you browse',
    'Sync is optional. Signal works without an account.',
  ],
  privacy: [
    'Your data stays under your control',
    'Know what is stored, what can leave, and how to remove it.',
  ],
} as const;
const MODE_ICONS = { collapse: ChevronsDownUp, hide: EyeOff, blur: Blend, score: ListFilter };
const TOPIC_SUGGESTIONS = [
  'Engineering',
  'AI',
  'Product design',
  'Startups',
  'Research',
  'Leadership',
];
function readSection(): Exclude<Section, 'overview'> {
  const section = location.hash.slice(1);
  return section in TITLES ? (section as Exclude<Section, 'overview'>) : 'profile';
}
function validProvider(ai: AiConfig, requireConnection = false): string | null {
  if (!ai.enabled && !requireConnection) return null;
  if (!ai.baseUrl.trim() || !ai.model.trim())
    return 'Add a provider URL and model before connecting.';
  try {
    const url = new URL(ai.baseUrl);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password)
      return 'Keep credentials in the API key field, not in the URL.';
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local))
      return 'Use HTTPS for a remote provider, or HTTP for a server on this device.';
  } catch {
    return 'Enter a valid provider URL, such as https://api.example.com/v1.';
  }
  return null;
}

export default function App() {
  const { boot, setBoot, cloud, setCloud, error, setError, saving, reload, patchSetting } =
    useWorkspace();
  const [section, setSection] = useState(readSection);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ai, setAi] = useState<AiConfig | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [confirm, setConfirm] = useState<'clear' | 'account' | 'restore' | null>(null);
  const [welcome, setWelcome] = useState(new URLSearchParams(location.search).has('welcome'));
  const preview = isPreview();

  useEffect(() => {
    const change = () => {
      if (location.hash.slice(1) in TITLES) {
        setSection(readSection());
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    if (boot) {
      setProfile((current) => current ?? boot.profile);
      setAi((current) => current ?? boot.settings.ai);
    }
  }, [boot]);
  const profileDirty =
    !!boot && !!profile && JSON.stringify(boot.profile) !== JSON.stringify(profile);
  const aiDirty = !!boot && !!ai && JSON.stringify(boot.settings.ai) !== JSON.stringify(ai);
  useEffect(() => {
    if (!profileDirty && !aiDirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [profileDirty, aiDirty]);

  const saveProfile = async () => {
    if (!profile || busy) return;
    setBusy('profile');
    setError(null);
    setNotice(null);
    try {
      const saved = await sendMessage<UserProfile>({ type: 'setProfile', value: profile });
      setProfile(saved);
      setBoot((current) => (current ? { ...current, profile: saved } : current));
      setNotice('Profile saved. Refresh an open LinkedIn feed to rescore its posts.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(null);
    }
  };
  useEffect(() => {
    const save = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's' && section === 'profile') {
        event.preventDefault();
        if (profileDirty) void saveProfile();
      }
    };
    window.addEventListener('keydown', save);
    return () => window.removeEventListener('keydown', save);
  });

  const saveAi = async (test = false) => {
    if (!ai || busy) return;
    const validation = validProvider(ai, test);
    if (validation) {
      setError(validation);
      return;
    }
    if (preview && test) {
      setError(
        'Install the extension to test a provider. The web preview never contacts AI services.'
      );
      return;
    }
    setBusy(test ? 'test' : 'ai');
    setError(null);
    setNotice(null);
    setTestResult(null);
    try {
      if (!preview && (ai.enabled || test)) {
        if (!(await requestHostAccess(ai.baseUrl)))
          throw new Error(
            'Provider access was not granted. Your previous configuration is unchanged.'
          );
        if (ai.vision && !(await requestImageAccess()))
          throw new Error('Image access was not granted. Turn off image analysis or grant access.');
      }
      const saved = await sendMessage<ExtensionSettings>({
        type: 'setAi',
        value: { ...ai, baseUrl: ai.baseUrl.trim(), model: ai.model.trim() },
      });
      setAi(saved.ai);
      setBoot((current) => (current ? { ...current, settings: saved } : current));
      if (test) {
        const result = await sendMessage<{ ok: boolean; error?: string }>({ type: 'ai:test' });
        setTestResult({
          ok: result.ok,
          text: result.ok
            ? 'Connected. Your provider is ready.'
            : (result.error ?? 'Connection failed. Check the URL, model, and key.'),
        });
      } else setNotice('AI preferences saved.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(null);
    }
  };

  const cloudAction = async (action: string, message: Record<string, unknown>, success: string) => {
    if (busy) return;
    setBusy(action);
    setError(null);
    setNotice(null);
    try {
      if (!cloud?.origin || !(await requestHostAccess(cloud.origin)))
        throw new Error('Cloud access was not granted. Local scoring is still available.');
      const result = await sendMessage<CloudAuthResponse | CloudStatus>(message);
      setCloud('status' in result ? result.status : result);
      setNotice('status' in result ? (result.notice ?? success) : success);
      if (action === 'signin' || action === 'signup') setPassword('');
      const payload = await reload();
      if (action === 'restore' && payload) {
        setProfile(payload.profile);
        setAi(payload.settings.ai);
      }
      setConfirm(null);
    } catch (reason) {
      setError(errorMessage(reason));
      if (action === 'delete' || action === 'restore') setConfirm(null);
    } finally {
      setBusy(null);
    }
  };

  const exportData = async () => {
    setBusy('export');
    setError(null);
    try {
      const data = await sendMessage<Record<string, unknown>>({ type: 'data:export' });
      downloadFile(
        JSON.stringify(data, null, 2),
        `signal-backup-${new Date().toISOString().slice(0, 10)}.json`,
        'application/json'
      );
      setNotice('Export downloaded. It excludes API keys and account tokens.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(null);
    }
  };
  const destructiveAction = async () => {
    if (confirm === 'account')
      return cloudAction(
        'delete',
        { type: 'cloud:deleteAccount' },
        'Account and synced data deleted.'
      );
    if (confirm === 'restore')
      return cloudAction(
        'restore',
        { type: 'cloud:sync', direction: 'pull' },
        'Cloud settings restored.'
      );
    setBusy('clear');
    setError(null);
    try {
      await sendMessage({ type: 'data:clear' });
      const payload = await reload();
      if (payload) {
        setProfile(payload.profile);
        setAi(payload.settings.ai);
      }
      setConfirm(null);
      setNotice('Local data deleted. Signal is back to its default settings.');
    } catch (reason) {
      setError(errorMessage(reason));
      setConfirm(null);
    } finally {
      setBusy(null);
    }
  };

  const [title, description] = TITLES[section];
  if (!boot || !profile || !ai)
    return (
      <AppShell active={section}>
        <PageHeading title={title} description={description} />
        <LoadingState error={error} onRetry={() => void reload()} />
      </AppShell>
    );
  const settings = boot.settings;
  const updateProfile = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) =>
    setProfile((current) => (current ? { ...current, [key]: value } : current));
  const updateAi = (patch: Partial<AiConfig>) => {
    setAi((current) => (current ? { ...current, ...patch } : current));
    setTestResult(null);
  };

  return (
    <AppShell active={section} settings={settings}>
      <PageHeading title={title} description={description}>
        {section === 'feed' && <SavedStatus saving={saving} />}
      </PageHeading>
      {error && (
        <Notice error onDismiss={() => setError(null)}>
          {error}
        </Notice>
      )}
      {notice && <Notice onDismiss={() => setNotice(null)}>{notice}</Notice>}
      {profileDirty && section !== 'profile' && (
        <div className="draft-notice">
          Your profile has unsaved changes.<a href="#profile">Return to profile</a>
        </div>
      )}
      {aiDirty && section !== 'ai' && (
        <div className="draft-notice">
          Your AI configuration has unsaved changes.<a href="#ai">Return to AI connection</a>
        </div>
      )}

      {section === 'profile' && (
        <>
          {welcome && (
            <div className="welcome-note">
              <div>
                <h2>Make yourself at home.</h2>
                <p>
                  Start with your role and a few interests. You don't need an account or API key.
                </p>
              </div>
              <button className="btn btn-small" onClick={() => setWelcome(false)}>
                Got it
                <Check size={13} />
              </button>
            </div>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void saveProfile();
            }}
          >
            <fieldset disabled={busy === 'profile'} className="plain-fieldset">
              <div className="settings-layout">
                <div className="stack">
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>The work you care about</h2>
                        <p>Specific topics give Signal more to work with.</p>
                      </div>
                      <UserRound size={18} className="muted" />
                    </div>
                    <div className="form-field">
                      <label htmlFor="profile-role">Your role</label>
                      <input
                        id="profile-role"
                        className="text-input"
                        maxLength={160}
                        value={profile.role}
                        placeholder="e.g. Product designer"
                        onChange={(event) => updateProfile('role', event.target.value)}
                      />
                      <p className="field-hint">
                        What you do now, or the work you're moving toward.
                      </p>
                    </div>
                    <TagEditor
                      label="Interests"
                      hint="Topics you want more of in your feed"
                      values={profile.interests}
                      onChange={(value) => updateProfile('interests', value)}
                      placeholder="e.g. distributed systems"
                    />
                    <div className="topic-suggestions">
                      <span>A few ideas</span>
                      {TOPIC_SUGGESTIONS.filter(
                        (topic) =>
                          !profile.interests.some(
                            (item) => item.toLowerCase() === topic.toLowerCase()
                          )
                      ).map((topic) => (
                        <button
                          key={topic}
                          type="button"
                          onClick={() =>
                            updateProfile(
                              'interests',
                              sanitizeTagList([...profile.interests, topic])
                            )
                          }
                        >
                          + {topic}
                        </button>
                      ))}
                    </div>
                    <TagEditor
                      label="Skills and technologies"
                      hint="Tools you use, and things you're learning"
                      values={profile.skills}
                      onChange={(value) => updateProfile('skills', value)}
                    />
                  </section>
                  <details className="panel settings-disclosure">
                    <summary>
                      <span>
                        <strong>Career and opportunities</strong>
                        <small>Industries, goals, companies, and roles</small>
                      </span>
                      <ChevronDown size={16} />
                    </summary>
                    <div className="disclosure-content">
                      <TagEditor
                        label="Industries"
                        values={profile.industries}
                        onChange={(value) => updateProfile('industries', value)}
                      />
                      <TagEditor
                        label="Career goals"
                        values={profile.careerGoals}
                        onChange={(value) => updateProfile('careerGoals', value)}
                      />
                      <TagEditor
                        label="Companies you follow"
                        values={profile.companies}
                        onChange={(value) => updateProfile('companies', value)}
                        placeholder="e.g. Stripe, Figma"
                      />
                      <TagEditor
                        label="Roles you would consider"
                        values={profile.desiredRoles}
                        onChange={(value) => updateProfile('desiredRoles', value)}
                        placeholder="e.g. Staff engineer"
                      />
                    </div>
                  </details>
                  <details className="panel settings-disclosure">
                    <summary>
                      <span>
                        <strong>Fine-tune the edges</strong>
                        <small>Topics to avoid and people to prioritize</small>
                      </span>
                      <ChevronDown size={16} />
                    </summary>
                    <div className="disclosure-content">
                      <TagEditor
                        label="Topics to avoid"
                        hint="Posts dominated by these topics get a lower score."
                        values={profile.topicsToAvoid}
                        onChange={(value) => updateProfile('topicsToAvoid', value)}
                      />
                      <TagEditor
                        label="People to always show"
                        values={profile.followedPeople}
                        onChange={(value) => updateProfile('followedPeople', value)}
                        placeholder="Enter a name as it appears on LinkedIn"
                      />
                      <TagEditor
                        label="People to always hide"
                        values={profile.mutedPeople}
                        onChange={(value) => updateProfile('mutedPeople', value)}
                        placeholder="Enter a name as it appears on LinkedIn"
                      />
                    </div>
                  </details>
                </div>
                <aside className="settings-aside">
                  <div className="aside-note">
                    <ShieldCheck size={22} />
                    <h3>A profile for your feed.</h3>
                    <p>
                      This information helps score posts. It doesn't edit your LinkedIn profile or
                      publish anything.
                    </p>
                    <a className="text-link" href="#privacy">
                      How your data is handled
                      <ArrowRight size={13} />
                    </a>
                  </div>
                  <div className="aside-guide">
                    <h3>Give it a little context</h3>
                    <ul>
                      <li>
                        <Check size={13} />
                        <span>Name your role</span>
                      </li>
                      <li>
                        <Check size={13} />
                        <span>Add specific interests</span>
                      </li>
                      <li>
                        <Check size={13} />
                        <span>Use feedback on post badges</span>
                      </li>
                    </ul>
                    <p>Try "distributed systems" instead of just "technology".</p>
                  </div>
                  <a className="aside-link" href="#feed">
                    <span>See your filter in action</span>
                    <ArrowUpRight size={16} />
                  </a>
                </aside>
              </div>
            </fieldset>
            <div className="save-bar">
              <span>
                {profileDirty ? 'You have unsaved profile changes' : 'Your profile is up to date'}
                <small>Ctrl or ⌘ + S to save</small>
              </span>
              <div>
                {profileDirty && (
                  <button
                    className="btn btn-quiet"
                    type="button"
                    disabled={!!busy}
                    onClick={() => setProfile(boot.profile)}
                  >
                    Discard changes
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={!profileDirty || !!busy}
                >
                  {busy === 'profile' ? 'Saving...' : 'Save profile'}
                  <Check size={14} />
                </button>
              </div>
            </div>
          </form>
        </>
      )}

      {section === 'feed' && (
        <>
          <div className="feed-controls-layout">
            <SampleFeed settings={settings} />
            <div className="stack">
              <section className="panel feed-tuning">
                <div className="panel-heading">
                  <div>
                    <h2>Your signal level</h2>
                    <p>Keep posts that clear your relevance bar.</p>
                  </div>
                </div>
                <ThresholdControl
                  value={settings.threshold}
                  onChange={(value) => void patchSetting('threshold', value)}
                />
                <div className="feed-mode-section">
                  <h3>Handle the noise</h3>
                  <div className="feed-mode-grid" role="group" aria-label="Filtering mode">
                    {FILTER_MODES.map((mode) => {
                      const Icon = MODE_ICONS[mode.value];
                      return (
                        <button
                          type="button"
                          key={mode.value}
                          aria-pressed={settings.mode === mode.value}
                          className={settings.mode === mode.value ? 'active' : ''}
                          onClick={() => void patchSetting('mode', mode.value)}
                        >
                          <Icon size={19} strokeWidth={1.6} />
                          <strong>{mode.label}</strong>
                        </button>
                      );
                    })}
                  </div>
                  <p className="field-hint">
                    {FILTER_MODES.find((mode) => mode.value === settings.mode)?.description}
                  </p>
                </div>
                <Toggle
                  label="Hide sponsored posts"
                  description={
                    settings.mode === 'score'
                      ? 'Not applied in score-only mode'
                      : 'Ads are filtered regardless of their score.'
                  }
                  checked={settings.hideAds}
                  disabled={settings.mode === 'score'}
                  onChange={(value) => void patchSetting('hideAds', value)}
                />
              </section>
              <section className="panel feed-options">
                <Toggle
                  label="Filtering enabled"
                  description={
                    settings.enabled
                      ? 'Pause to show your feed without Signal.'
                      : 'Paused. Your preferences are saved.'
                  }
                  checked={settings.enabled}
                  onChange={(value) => void patchSetting('enabled', value)}
                />
                <div className="form-field">
                  <label htmlFor="job-treatment">Job opportunities</label>
                  <select
                    className="text-input"
                    id="job-treatment"
                    value={settings.jobTreatment}
                    onChange={(event) => void patchSetting('jobTreatment', event.target.value)}
                  >
                    <option value="show">Keep all job posts</option>
                    <option value="relevant">Score jobs like other posts</option>
                    <option value="hide">Hide all job posts</option>
                  </select>
                  <p className="field-hint">Explicit people preferences still take priority.</p>
                </div>
              </section>
            </div>
          </div>
          <details className="panel settings-disclosure scoring-explainer">
            <summary>
              <span>
                <strong>What goes into a score?</strong>
                <small>Seven dimensions, plus penalties for low-value content</small>
              </span>
              <ChevronDown size={16} />
            </summary>
            <div className="disclosure-content">
              <div className="weight-list">
                {Object.entries(DEFAULT_WEIGHTS).map(([key]) => (
                  <div key={key}>
                    <span>
                      {
                        {
                          relevance: 'Relevance',
                          infoDensity: 'Information density',
                          actionability: 'Actionability',
                          originality: 'Originality',
                          evidence: 'Evidence',
                          techDepth: 'Technical depth',
                          careerValue: 'Career value',
                        }[key]
                      }
                    </span>
                    <strong>
                      {Math.round(settings.weights[key as keyof typeof DEFAULT_WEIGHTS] * 100)}%
                    </strong>
                  </div>
                ))}
              </div>
              <p className="field-hint">
                Engagement bait, thin promotional content, and low-information stories receive
                penalties. Scores are a guide, not a judgment of the author.
              </p>
            </div>
          </details>
        </>
      )}

      {section === 'ai' && (
        <div className="settings-layout">
          <div className="stack">
            <div className="local-scoring-note">
              <ShieldCheck size={22} />
              <div>
                <h2>Local scoring is already working</h2>
                <p>
                  No setup, account, or API key required. A provider can add a second opinion on
                  ambiguous posts.
                </p>
              </div>
              <span className="badge-label">Built in</span>
            </div>
            {preview && (
              <Notice>
                Provider requests and API keys are disabled in this preview. Install Signal to
                connect an AI service.
              </Notice>
            )}
            <form
              className="panel"
              onSubmit={(event) => {
                event.preventDefault();
                void saveAi();
              }}
            >
              <fieldset className="plain-fieldset" disabled={!!busy}>
                <div className="panel-heading">
                  <div>
                    <h2>Add a provider</h2>
                    <p>Use a local model or an OpenAI-compatible API.</p>
                  </div>
                  <Cpu size={18} className="muted" />
                </div>
                <div className="form-field">
                  <label htmlFor="ai-preset">Provider</label>
                  <select
                    id="ai-preset"
                    className="text-input"
                    value={ai.preset ?? 'custom'}
                    onChange={(event) => {
                      const preset = AI_PRESETS.find((item) => item.id === event.target.value);
                      if (preset)
                        updateAi({
                          preset: preset.id,
                          ...(preset.id === 'custom'
                            ? {}
                            : { baseUrl: preset.baseUrl, model: preset.model }),
                        });
                    }}
                  >
                    {AI_PRESETS.map((preset) => (
                      <option value={preset.id} key={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                  <p className="field-hint">
                    {AI_PRESETS.find((preset) => preset.id === ai.preset)?.description}
                  </p>
                </div>
                <div className="form-field">
                  <label htmlFor="ai-url">Provider URL</label>
                  <input
                    className="text-input"
                    id="ai-url"
                    inputMode="url"
                    autoComplete="off"
                    maxLength={500}
                    value={ai.baseUrl}
                    placeholder="https://api.example.com/v1"
                    onChange={(event) => updateAi({ baseUrl: event.target.value })}
                  />
                </div>
                <div className="grid-2">
                  <div className="form-field">
                    <label htmlFor="ai-model">Model</label>
                    <input
                      className="text-input"
                      id="ai-model"
                      maxLength={200}
                      value={ai.model}
                      placeholder="Your provider's model name"
                      onChange={(event) => updateAi({ model: event.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="ai-key">API key</label>
                    <input
                      className="text-input"
                      id="ai-key"
                      type="password"
                      autoComplete="off"
                      maxLength={2048}
                      value={ai.apiKey}
                      disabled={preview}
                      placeholder={preview ? 'Disabled in preview' : 'Not needed for local models'}
                      onChange={(event) => updateAi({ apiKey: event.target.value })}
                    />
                  </div>
                </div>
                <div className="provider-toggles">
                  <Toggle
                    label="Enable AI analysis"
                    description="Selected post text and your profile are sent to this provider."
                    checked={ai.enabled}
                    onChange={(value) => updateAi({ enabled: value })}
                  />
                  <Toggle
                    label="Include post images"
                    description="Send up to two images when deeper analysis runs. Requires separate access."
                    checked={ai.vision}
                    onChange={(value) => updateAi({ vision: value })}
                  />
                </div>
                <div className="form-actions">
                  <button className="btn btn-primary" type="submit" disabled={!aiDirty || !!busy}>
                    {busy === 'ai' ? 'Saving...' : 'Save configuration'}
                  </button>
                  <button
                    className="btn"
                    type="button"
                    disabled={preview || !!busy || !ai.baseUrl || !ai.model}
                    onClick={() => void saveAi(true)}
                  >
                    {busy === 'test' ? 'Testing...' : aiDirty ? 'Save and test' : 'Test connection'}
                    <ArrowRight size={13} />
                  </button>
                </div>
              </fieldset>
              {testResult && (
                <div
                  className={`connection-result ${testResult.ok ? 'positive' : 'field-error'}`}
                  role="status"
                >
                  {testResult.ok ? <Check size={15} /> : <Info size={15} />}
                  {testResult.text}
                </div>
              )}
              {aiDirty && (
                <p className="field-hint unsaved-hint">
                  Configuration changes are not active until you save.
                </p>
              )}
            </form>
          </div>
          <aside className="settings-aside">
            <div className="aside-note">
              <LockKeyhole size={22} />
              <h3>Your key stays in this browser</h3>
              <p>
                API keys are excluded from cloud sync and data exports. Signal contacts only the
                provider you choose.
              </p>
            </div>
            <div className="aside-guide">
              <h3>Keep it on your machine</h3>
              <p>
                Ollama and LM Studio can run a model locally. Choose their preset, start the local
                server, then test the connection.
              </p>
              <a
                className="text-link"
                href={`${SOURCE_URL}#privacy-and-security`}
                target="_blank"
                rel="noreferrer"
              >
                Read the privacy notes
                <ArrowUpRight size={13} />
              </a>
            </div>
          </aside>
        </div>
      )}

      {section === 'account' && (
        <div className="settings-layout">
          <div className="stack">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Account and sync</h2>
                  <p>Your profile and preferences, across browsers.</p>
                </div>
                <Cloud size={20} className="muted" />
              </div>
              {!cloud ? (
                <div className="account-local">
                  <h3>Couldn't load sync status</h3>
                  <p>Your local settings are still available.</p>
                  <button className="btn" onClick={() => void reload()}>
                    Try again
                  </button>
                </div>
              ) : !cloud.configured ? (
                <div className="account-local">
                  <span className="local-account-icon">
                    <ShieldCheck size={30} strokeWidth={1.5} />
                  </span>
                  <h3>You're all set to work locally.</h3>
                  <p>
                    {preview
                      ? 'This preview does not connect to an account. In the extension, sync is available when the build includes a configured cloud service.'
                      : 'Cloud sync is not configured in this build. All filtering, profile controls, and local statistics still work.'}
                  </p>
                  <a
                    className="btn"
                    href={`${SOURCE_URL}/blob/main/docs/CLOUD_SETUP.md`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Self-hosting guide
                    <ArrowUpRight size={13} />
                  </a>
                </div>
              ) : cloud.signedIn ? (
                <div className="account-connected">
                  <div className="account-identity">
                    <span className="account-avatar">
                      <UserRound size={23} />
                    </span>
                    <div>
                      <strong>{cloud.user?.email}</strong>
                      <p>
                        {cloud.lastError
                          ? 'Sync needs attention'
                          : cloud.pending
                            ? 'Changes waiting to sync'
                            : cloud.lastSyncedAt
                              ? `Last synced ${new Date(cloud.lastSyncedAt).toLocaleString()}`
                              : 'Ready to sync'}
                      </p>
                    </div>
                    <span className="badge-label">Signed in</span>
                  </div>
                  {cloud.lastError && <Notice error>{cloud.lastError}</Notice>}
                  <div className="form-actions">
                    <button
                      className="btn btn-primary"
                      disabled={!!busy}
                      onClick={() =>
                        void cloudAction(
                          'sync',
                          { type: 'cloud:sync', direction: 'auto' },
                          'Sync complete.'
                        )
                      }
                    >
                      <RefreshCw size={14} />
                      {busy === 'sync' ? 'Syncing...' : 'Sync now'}
                    </button>
                    <button
                      className="btn btn-quiet"
                      disabled={!!busy}
                      onClick={() =>
                        void cloudAction(
                          'signout',
                          { type: 'cloud:signout' },
                          'Signed out. Your local profile is unchanged.'
                        )
                      }
                    >
                      Sign out
                    </button>
                  </div>
                  <details className="sync-advanced">
                    <summary>
                      Manual sync options
                      <ChevronDown size={13} />
                    </summary>
                    <p>Use these only when you want one copy to replace the other.</p>
                    <div className="form-actions">
                      <button
                        className="btn"
                        disabled={!!busy}
                        onClick={() =>
                          void cloudAction(
                            'push',
                            { type: 'cloud:sync', direction: 'push' },
                            'This browser was saved to the cloud.'
                          )
                        }
                      >
                        Upload this browser
                      </button>
                      <button
                        className="btn"
                        disabled={!!busy}
                        onClick={() => setConfirm('restore')}
                      >
                        Restore from cloud
                      </button>
                    </div>
                  </details>
                </div>
              ) : (
                <form
                  className="auth-form"
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    void cloudAction(
                      authMode,
                      { type: `cloud:${authMode}`, email, password },
                      authMode === 'signin' ? 'Signed in.' : 'Account created.'
                    );
                  }}
                >
                  <div className="auth-options" role="group" aria-label="Account action">
                    <button
                      type="button"
                      aria-pressed={authMode === 'signin'}
                      className={authMode === 'signin' ? 'active' : ''}
                      onClick={() => setAuthMode('signin')}
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      aria-pressed={authMode === 'signup'}
                      className={authMode === 'signup' ? 'active' : ''}
                      onClick={() => setAuthMode('signup')}
                    >
                      Create account
                    </button>
                  </div>
                  <div className="form-field">
                    <label htmlFor="account-email">Email address</label>
                    <input
                      id="account-email"
                      type="email"
                      className="text-input"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="account-password">Password</label>
                    <input
                      id="account-password"
                      type="password"
                      className="text-input"
                      autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                      minLength={8}
                      maxLength={128}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>
                  <div className="form-actions">
                    <button className="btn btn-primary" disabled={!!busy}>
                      {busy === authMode
                        ? 'Working...'
                        : authMode === 'signin'
                          ? 'Sign in'
                          : 'Create account'}
                    </button>
                    <button
                      className="text-link"
                      type="button"
                      disabled={!!busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
                      onClick={() =>
                        void cloudAction(
                          'recover',
                          { type: 'cloud:recover', email },
                          'Check your email for a recovery link.'
                        )
                      }
                    >
                      Forgot password?
                    </button>
                  </div>
                </form>
              )}
            </section>
            <div className="sync-inventory">
              <div>
                <Check size={17} />
                <h3>What syncs</h3>
                <p>
                  Your profile, preferences, feedback, post overrides, and up to 30 days of
                  aggregate statistics.
                </p>
              </div>
              <div>
                <LockKeyhole size={17} />
                <h3>What stays here</h3>
                <p>API keys, cached post text, and AI responses are not included in sync.</p>
              </div>
            </div>
          </div>
          <aside className="settings-aside">
            <div className="aside-note">
              <Github size={22} />
              <h3>Open source, including sync</h3>
              <p>The cloud service can be self-hosted. Local use doesn't depend on it.</p>
              <a
                className="text-link"
                href={`${SOURCE_URL}/tree/main/supabase`}
                target="_blank"
                rel="noreferrer"
              >
                See the implementation
                <ArrowUpRight size={13} />
              </a>
            </div>
          </aside>
        </div>
      )}

      {section === 'privacy' && (
        <div className="settings-layout">
          <div className="stack">
            <section className="panel privacy-summary">
              <div className="panel-heading">
                <div>
                  <h2>Local by default</h2>
                  <p>No analytics, ads, or tracking pixels.</p>
                </div>
                <ShieldCheck size={22} className="positive" />
              </div>
              <div className="privacy-row">
                <span className="privacy-icon">
                  <UserRound size={17} />
                </span>
                <div>
                  <h3>Profile and preferences</h3>
                  <p>Stored in this browser. Synced only when you connect an account.</p>
                </div>
              </div>
              <div className="privacy-row">
                <span className="privacy-icon">
                  <Cpu size={17} />
                </span>
                <div>
                  <h3>Post analysis</h3>
                  <p>
                    Scored locally unless AI is enabled. Then selected posts and your profile go to
                    your chosen provider.
                  </p>
                </div>
              </div>
              <div className="privacy-row">
                <span className="privacy-icon">
                  <KeyRound size={17} />
                </span>
                <div>
                  <h3>Keys and account tokens</h3>
                  <p>Kept out of exports. Your AI key is never included in cloud sync.</p>
                </div>
              </div>
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Take a copy with you</h2>
                  <p>
                    Download your profile, settings, feedback, and recent aggregate statistics as
                    JSON.
                  </p>
                </div>
                <ArrowDownToLine size={18} className="muted" />
              </div>
              <button className="btn" disabled={!!busy} onClick={() => void exportData()}>
                <ArrowDownToLine size={14} />
                {busy === 'export' ? 'Preparing export...' : 'Export my data'}
              </button>
              <p className="field-hint export-hint">
                No API keys, account tokens, or cached post text.
              </p>
            </section>
            <details className="panel settings-disclosure">
              <summary>
                <span>
                  <strong>Diagnostics</strong>
                  <small>For troubleshooting and contributors</small>
                </span>
                <ChevronDown size={16} />
              </summary>
              <div className="disclosure-content">
                <Toggle
                  label="Debug logging"
                  description="Write detailed diagnostic output on LinkedIn pages. Don't include private feed text in public bug reports."
                  checked={settings.debug}
                  onChange={(value) => void patchSetting('debug', value)}
                />
              </div>
            </details>
            <section className="panel data-removal">
              <h2>Start fresh</h2>
              <p>
                Delete your local profile, settings, statistics, feedback, and sign-in session. This
                does not delete an existing cloud account.
              </p>
              <div className="form-actions">
                <button
                  className="btn btn-danger"
                  disabled={!!busy}
                  onClick={() => setConfirm('clear')}
                >
                  <Trash2 size={14} />
                  Delete local data
                </button>
                {cloud?.signedIn && (
                  <button
                    className="btn btn-danger"
                    disabled={!!busy}
                    onClick={() => setConfirm('account')}
                  >
                    Delete cloud account
                  </button>
                )}
              </div>
            </section>
          </div>
          <aside className="settings-aside">
            <div className="aside-note">
              <LockKeyhole size={22} />
              <h3>Read the full policy</h3>
              <p>See exactly what Signal stores and what its optional connections send.</p>
              <a
                className="text-link"
                href={`${SOURCE_URL}/blob/main/PRIVACY.md`}
                target="_blank"
                rel="noreferrer"
              >
                Privacy policy
                <ArrowUpRight size={13} />
              </a>
            </div>
            <div className="aside-guide">
              <h3>Found a security issue?</h3>
              <p>
                Please use the private reporting instructions instead of posting credentials or feed
                content in an issue.
              </p>
              <a
                className="text-link"
                href={`${SOURCE_URL}/blob/main/SECURITY.md`}
                target="_blank"
                rel="noreferrer"
              >
                Security policy
                <ArrowUpRight size={13} />
              </a>
            </div>
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={
          confirm === 'account'
            ? 'Delete your cloud account?'
            : confirm === 'restore'
              ? 'Replace this browser with cloud data?'
              : 'Delete local Signal data?'
        }
        description={
          confirm === 'account'
            ? 'Your account and synced data will be permanently deleted. This cannot be undone.'
            : confirm === 'restore'
              ? 'This replaces your local profile, preferences, feedback, and statistics, including unsaved changes. Your local AI key is preserved.'
              : 'This removes your profile, settings, statistics, feedback, and sign-in session from this browser. Your cloud account is not deleted.'
        }
        actionLabel={
          confirm === 'restore'
            ? 'Restore from cloud'
            : confirm === 'account'
              ? 'Delete account'
              : 'Delete local data'
        }
        busy={!!busy}
        onConfirm={() => void destructiveAction()}
        onClose={() => setConfirm(null)}
      />
    </AppShell>
  );
}
