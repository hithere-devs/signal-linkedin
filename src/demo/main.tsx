import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, ChevronDown } from 'lucide-react';
import type { AnalysisResult, ExtensionSettings } from '../types';
import { DEFAULT_SETTINGS } from '../lib/defaults';
import { FILTER_MODES, shouldHidePost } from '../lib/filtering';
import { applyResultToDom, restorePost } from '../content/filter';
import { AppShell, Notice, PageHeading, ThresholdControl, Toggle } from '../ui/components';
import { applyTheme } from '../ui/appearance';
import '../ui/theme.css';
import './demo.css';

const POSTS = [
  {
    score: 86,
    category: 'technical',
    topic: 'Engineering',
    author: 'Engineering example',
    title: 'What production taught us about AI agents',
    body: 'We added task-level evals, a rollback path, and a hard limit on tool calls. The write-up includes the failure cases and a small test suite you can run yourself.',
    positive: [
      'Relevant to software engineering',
      'Specific implementation details',
      'Actionable testing approach',
    ],
    negative: [],
    ad: false,
    job: false,
  },
  {
    score: 68,
    category: 'startup',
    topic: 'Product building',
    author: 'Product example',
    title: 'The question that improved our design reviews',
    body: 'Before discussing a solution, we now ask: which constraint are we optimizing for? Writing it down made trade-offs easier to discuss and decisions easier to revisit.',
    positive: ['Practical process advice', 'Relevant professional topic'],
    negative: ['Limited supporting evidence'],
    ad: false,
    job: false,
  },
  {
    score: 24,
    category: 'engagement-bait',
    topic: 'General',
    author: 'Low-signal example',
    title: 'Success is a mindset. Agree?',
    body: 'Like if you agree. Comment YES and share this with five people in your network. Your next opportunity is one connection away.',
    positive: [],
    negative: ['Engagement bait', 'Little practical information'],
    ad: false,
    job: false,
  },
  {
    score: 18,
    category: 'ad',
    topic: 'Sponsored',
    author: 'Sponsored example',
    title: 'Everything you need for your next big idea',
    body: 'This is a fictional sponsored post. Toggle the ad filter to see how Signal handles it independently of the score.',
    positive: [],
    negative: ['Sponsored content'],
    ad: true,
    job: false,
  },
];

function DemoPost({
  post,
  index,
  settings,
}: {
  post: (typeof POSTS)[number];
  index: number;
  settings: ExtensionSettings;
}) {
  const ref = useRef<HTMLElement>(null);
  const [override, setOverride] = useState<'show' | 'hide' | undefined>();
  const [feedback, setFeedback] = useState(false);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const result: AnalysisResult = {
      hash: `sample-${index}`,
      score: post.score,
      classification: [post.category],
      isAd: post.ad,
      isJob: post.job,
      reasons: { positive: post.positive, negative: post.negative },
      confidence: 0.85,
      provider: 'heuristic',
      analyzedAt: Date.now(),
      dimensions: {
        relevance: Math.min(100, post.score + 6),
        infoDensity: post.score,
        actionability: Math.max(0, post.score - 3),
        originality: Math.max(0, post.score - 10),
        evidence: Math.max(0, post.score - 8),
        techDepth: post.score,
        careerValue: Math.max(0, post.score - 5),
        promotional: post.ad ? 100 : 0,
        personalStory: 0,
        engagementBait: post.score < 30 ? 90 : 0,
      },
    };
    applyResultToDom(
      root,
      result,
      {
        settings,
        feedbackAcknowledgement: 'Demo feedback acknowledged. Nothing was saved.',
        onOverride: (_hash, action) => setOverride(action),
        onFeedback: async () => {
          setFeedback(true);
        },
      },
      shouldHidePost(result, settings, override)
    );
    return () => {
      restorePost(root, settings.mode);
      root.querySelectorAll('[data-signal-badge]').forEach((node) => node.remove());
    };
  }, [settings, override, index, post]);
  return (
    <article ref={ref} className="native-demo-post">
      <div className="native-demo-meta">
        <span className="demo-author-initial">{post.author.charAt(0)}</span>
        <span>
          <strong>{post.author}</strong>
          <small>{post.topic}</small>
        </span>
      </div>
      <h2>{post.title}</h2>
      <p>{post.body}</p>
      <div className="native-demo-caption">
        Fictional post
        {feedback
          ? '. Feedback acknowledged in this demo only.'
          : '. Open the score badge to see the explanation.'}
      </div>
    </article>
  );
}

function Demo() {
  const [settings, setSettings] = useState<ExtensionSettings>(() =>
    structuredClone(DEFAULT_SETTINGS)
  );
  const [reset, setReset] = useState(0);
  useEffect(() => {
    const refresh = () => setSettings((current) => ({ ...current }));
    window.addEventListener('signal-appearance-change', refresh);
    return () => window.removeEventListener('signal-appearance-change', refresh);
  }, []);
  const patch = <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));
  return (
    <AppShell active="feed" settings={settings}>
      <PageHeading
        title="Take Signal for a scroll."
        description="Try the real score badges and filtering controls on a fictional feed."
      />
      <Notice>
        This is a demo. These controls do not change your saved settings or contact AI providers.
      </Notice>
      <div className="demo-layout">
        <section className="native-demo-feed" aria-label="Fictional example feed">
          {POSTS.map((post, index) => (
            <DemoPost key={`${reset}-${index}`} post={post} index={index} settings={settings} />
          ))}
        </section>
        <aside className="panel demo-controls">
          <div className="panel-heading">
            <div>
              <h2>Find your signal level</h2>
              <p>Move the slider and watch the feed.</p>
            </div>
          </div>
          <ThresholdControl
            value={settings.threshold}
            onChange={(value) => patch('threshold', value)}
          />
          <div className="form-field demo-mode-field">
            <label htmlFor="demo-mode">Filter mode</label>
            <select
              className="text-input"
              id="demo-mode"
              value={settings.mode}
              onChange={(event) => patch('mode', event.target.value as ExtensionSettings['mode'])}
            >
              {FILTER_MODES.map((mode) => (
                <option value={mode.value} key={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
            <p className="field-hint">
              {FILTER_MODES.find((mode) => mode.value === settings.mode)?.description}
            </p>
          </div>
          <Toggle
            label="Hide sponsored posts"
            checked={settings.hideAds}
            disabled={settings.mode === 'score'}
            onChange={(value) => patch('hideAds', value)}
          />
          <Toggle
            label="Filtering enabled"
            checked={settings.enabled}
            onChange={(value) => patch('enabled', value)}
          />
          <div className="demo-next">
            <a className="btn btn-primary full-width" href="settings.html#profile">
              Make the profile yours
              <ArrowRight size={14} />
            </a>
            <button
              className="btn btn-quiet full-width"
              onClick={() => {
                setSettings(structuredClone(DEFAULT_SETTINGS));
                setReset((value) => value + 1);
              }}
            >
              Reset this demo
            </button>
          </div>
          <p className="field-hint">
            Scores are illustrative. The installed extension scores actual posts against your
            profile.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
applyTheme();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Demo />
  </StrictMode>
);
