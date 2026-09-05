import { useState } from 'react';
import { Check, ChevronDown, Eye, RotateCcw } from 'lucide-react';
import type { AnalysisResult, ExtensionSettings } from '../types';
import { shouldHidePost } from '../lib/filtering';

const EXAMPLES = [
  {
    id: 'engineering',
    score: 86,
    category: 'Engineering',
    title: 'What we learned shipping our first production AI agent',
    text: 'Our evals caught the easy failures. Production found the interesting ones. Here are the checks we added, the trade-offs, and a reproducible test setup.',
    reasons: [
      'Matches your engineering interests',
      'Specific, practical takeaways',
      'Includes a way to test the claims',
    ],
    ad: false,
  },
  {
    id: 'design',
    score: 68,
    category: 'Product building',
    title: 'A practical guide to reviewing system design decisions',
    text: 'Start with the constraint, document the alternatives, and write down what would make you change your mind.',
    reasons: ['Useful process advice', 'A relevant professional topic'],
    ad: false,
  },
  {
    id: 'bait',
    score: 24,
    category: 'Engagement bait',
    title: 'The secret to success? Never give up. Agree?',
    text: 'Like if you agree. Comment YES and share this with your network.',
    reasons: ['Asks for engagement without adding detail'],
    ad: false,
  },
  {
    id: 'sponsored',
    score: 18,
    category: 'Sponsored',
    title: 'The all-in-one platform for your next big idea',
    text: 'A fictional sponsored post to demonstrate the ad filter.',
    reasons: ['Sponsored content'],
    ad: true,
  },
];

export default function SampleFeed({ settings }: { settings: ExtensionSettings }) {
  const [revealed, setRevealed] = useState<string[]>([]);
  return (
    <section className="sample-feed" aria-labelledby="sample-title">
      <div className="sample-heading">
        <div>
          <h2 id="sample-title">Preview your filter</h2>
          <p>Example posts, not your LinkedIn feed.</p>
        </div>
        <button
          className="icon-button"
          title="Reset example reveals"
          aria-label="Reset example reveals"
          onClick={() => setRevealed([])}
          disabled={!revealed.length}
        >
          <RotateCcw size={15} />
        </button>
      </div>
      <div className="sample-posts">
        {EXAMPLES.map((post, index) => {
          const result = { score: post.score, isAd: post.ad, isJob: false } as AnalysisResult;
          const hidden = shouldHidePost(
            result,
            settings,
            revealed.includes(post.id) ? 'show' : undefined
          );
          const show = () => setRevealed((current) => [...current, post.id]);
          if (hidden && settings.mode === 'hide')
            return (
              <div key={post.id} className="sample-removed">
                <Eye size={12} />
                <span>{post.category} post removed from view</span>
              </div>
            );
          if (hidden && settings.mode === 'collapse')
            return (
              <article key={post.id} className="sample-collapsed">
                <span className="sample-low-score">{post.score}</span>
                <div>
                  <strong>{post.category}</strong>
                  <p>
                    {post.ad
                      ? 'Hidden by your sponsored-post preference'
                      : `Below your ${settings.threshold}-point threshold`}
                  </p>
                </div>
                <button className="btn btn-small" onClick={show}>
                  Show post
                </button>
              </article>
            );
          return (
            <article
              key={post.id}
              className={`sample-post${hidden && settings.mode === 'blur' ? ' is-blurred' : ''}`}
            >
              <div className="sample-post-content" inert={hidden && settings.mode === 'blur'}>
                <div className="sample-post-meta">
                  <span>{post.category}</span>
                  {settings.enabled && (
                    <span
                      className={`sample-score${post.score < settings.threshold ? ' low' : ''}`}
                    >
                      {post.score}
                      <small>/100</small>
                    </span>
                  )}
                </div>
                <h3>{post.title}</h3>
                <p>{post.text}</p>
                {index === 0 && settings.enabled && (
                  <details className="sample-explanation" open>
                    <summary>
                      Why this score?
                      <ChevronDown size={13} />
                    </summary>
                    <ul>
                      {post.reasons.map((reason) => (
                        <li key={reason}>
                          <Check size={12} />
                          {reason}
                        </li>
                      ))}
                    </ul>
                    <div className="sample-dimensions">
                      {[
                        ['Relevance', 92],
                        ['Actionability', 88],
                        ['Evidence', 78],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <span>
                            {label}
                            <strong>{value}</strong>
                          </span>
                          <div>
                            <i style={{ width: `${value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
              {hidden && settings.mode === 'blur' && (
                <div className="sample-blur-cover">
                  <span>Below your score threshold</span>
                  <button className="btn" onClick={show}>
                    <Eye size={14} />
                    Show post
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <p className="sample-footnote">
        Example scores are fixed so you can compare filter settings. Your real feed is scored
        against your profile.
      </p>
    </section>
  );
}
