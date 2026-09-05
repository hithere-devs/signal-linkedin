import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleHelp,
  Cloud,
  Cpu,
  ExternalLink,
  Github,
  LockKeyhole,
  Moon,
  Play,
  SlidersHorizontal,
  Sun,
  UserRound,
  X,
} from 'lucide-react';
import type { ExtensionSettings } from '../types';
import { appVersion, isPreview, LINKEDIN_URL, SOURCE_URL } from '../lib/environment';
import { FILTER_PRESETS, thresholdName } from '../lib/filtering';
import { applyTheme, readTheme, saveTheme, type Theme } from './appearance';

export type Section = 'overview' | 'profile' | 'feed' | 'ai' | 'account' | 'privacy';
export const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: BarChart3, href: 'dashboard.html' },
  { id: 'profile', label: 'Signal profile', icon: UserRound, href: 'settings.html#profile' },
  { id: 'feed', label: 'Feed controls', icon: SlidersHorizontal, href: 'settings.html#feed' },
  { id: 'ai', label: 'AI connection', icon: Cpu, href: 'settings.html#ai' },
  { id: 'account', label: 'Account and sync', icon: Cloud, href: 'settings.html#account' },
  { id: 'privacy', label: 'Privacy and data', icon: LockKeyhole, href: 'settings.html#privacy' },
] as const;

export function SignalMark({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={`signal-mark${small ? ' small' : ''}`}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path
        d="M8 22v-5m8 5V12m8 10V7"
        stroke="var(--accent-ink)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ThemeButton() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    const update = () => {
      const next = readTheme();
      setTheme(next);
      applyTheme(next);
    };
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      onClick={() => {
        const next = theme === 'light' ? 'dark' : 'light';
        setTheme(next);
        saveTheme(next);
      }}
    >
      {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
    </button>
  );
}

export function AppShell({
  active,
  settings,
  children,
}: {
  active: Section;
  settings?: ExtensionSettings;
  children: ReactNode;
}) {
  const title = SECTIONS.find((section) => section.id === active)?.label;
  return (
    <div className="workspace">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById('main-content');
          main?.focus({ preventScroll: true });
          main?.scrollIntoView({ block: 'start' });
        }}
      >
        Skip to content
      </a>
      <aside className="sidebar">
        <a className="brand" href="dashboard.html" aria-label="Signal overview">
          <SignalMark />
          <span>Signal</span>
        </a>
        <div className="workspace-label">
          <span className="workspace-avatar">S</span>
          <span>
            {isPreview() ? 'Preview workspace' : 'Personal workspace'}
            <small>{isPreview() ? 'Sample data' : 'On this browser'}</small>
          </span>
          <LockKeyhole size={13} />
        </div>
        <nav className="main-nav" aria-label="Main navigation">
          {SECTIONS.map(({ id, label, icon: Icon, href }) => (
            <a
              key={id}
              href={href}
              className={active === id ? 'nav-link active' : 'nav-link'}
              aria-current={active === id ? 'page' : undefined}
            >
              <Icon size={18} strokeWidth={1.7} />
              <span>{label}</span>
              {active === id && <span className="nav-current" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a className="nav-link" href="demo.html">
            <Play size={17} strokeWidth={1.7} />
            <span>Try the demo</span>
            <ArrowUpRight size={14} />
          </a>
          <a className="nav-link" href={SOURCE_URL} target="_blank" rel="noreferrer">
            <Github size={17} strokeWidth={1.7} />
            <span>View source</span>
            <ArrowUpRight size={14} />
          </a>
          <div className="sidebar-footer">
            <span>
              Open source<small>v{appVersion()}</small>
            </span>
            <ThemeButton />
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="utility-bar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{title}</strong>
          </div>
          <div className="utility-actions">
            {settings && (
              <span className={`status-label ${settings.enabled ? 'positive' : 'muted'}`}>
                <span className="status-dot" />
                {settings.enabled
                  ? settings.mode === 'score'
                    ? 'Score only'
                    : 'Filtering active'
                  : 'Filtering paused'}
              </span>
            )}
            <a
              className="btn btn-primary btn-small"
              href={LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
            >
              Open LinkedIn
              <ArrowUpRight size={15} />
            </a>
          </div>
        </header>
        {isPreview() && (
          <div className="preview-banner">
            <CircleHelp size={15} />
            <span>Interactive preview. Activity is fictional; changes stay in this browser.</span>
            <a
              href={
                location.search.includes('empty')
                  ? location.pathname + location.hash
                  : location.pathname + '?empty=1' + location.hash
              }
            >
              {location.search.includes('empty') ? 'View sample data' : 'View empty state'}
            </a>
          </div>
        )}
        <main id="main-content" className="page-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="workspace-footer">
          <span>
            <LockKeyhole size={13} />
            Local scoring. Optional AI and sync.
          </span>
          <a href={`${SOURCE_URL}/issues`} target="_blank" rel="noreferrer">
            Feedback and support
            <ArrowUpRight size={12} />
          </a>
        </footer>
      </div>
    </div>
  );
}

export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className="page-heading-actions">{children}</div>}
    </div>
  );
}

export function Notice({
  children,
  error = false,
  onDismiss,
}: {
  children: ReactNode;
  error?: boolean;
  onDismiss?: () => void;
}) {
  return (
    <div className={`notice${error ? ' notice-error' : ''}`} role={error ? 'alert' : 'status'}>
      <span>{children}</span>
      {onDismiss && (
        <button
          className="icon-button"
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function LoadingState({
  error,
  onRetry,
  compact = false,
}: {
  error?: string | null;
  onRetry(): void;
  compact?: boolean;
}) {
  return (
    <div
      className={`loading-state${compact ? ' compact' : ''}`}
      role={error ? 'alert' : 'status'}
      aria-busy={!error}
    >
      {error ? (
        <>
          <CircleHelp size={24} />
          <h2>Signal couldn't load</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={onRetry}>
            Try again
          </button>
        </>
      ) : (
        <>
          <span className="sr-only">Loading Signal</span>
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-panel" />
          <div className="skeleton skeleton-panel short" />
        </>
      )}
    </div>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange(value: boolean): void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label className={`toggle-row${disabled ? ' disabled' : ''}`} htmlFor={id}>
      <span>
        <span className="toggle-label">{label}</span>
        {description && (
          <span className="toggle-description" id={`${id}-hint`}>
            {description}
          </span>
        )}
      </span>
      <span className="switch">
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-describedby={description ? `${id}-hint` : undefined}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="switch-track" aria-hidden="true" />
      </span>
    </label>
  );
}

export function ThresholdControl({
  value,
  onChange,
  disabled = false,
  compact = false,
}: {
  value: number;
  onChange(value: number): void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const id = useId();
  return (
    <div className={`threshold-control${compact ? ' compact' : ''}`}>
      <div className="threshold-value">
        <span>
          {value}
          <small>/100</small>
        </span>
        <strong>{thresholdName(value)}</strong>
      </div>
      <label className="sr-only" htmlFor={id}>
        Minimum post score
      </label>
      <input
        id={id}
        className="range"
        type="range"
        min="0"
        max="100"
        step="1"
        value={value}
        disabled={disabled}
        aria-valuetext={`${value} out of 100, ${thresholdName(value)}`}
        style={{ '--range-value': `${value}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="range-labels">
        <span>More variety</span>
        <span>More selective</span>
      </div>
      <div className="preset-group" role="group" aria-label="Score presets">
        {FILTER_PRESETS.map((preset) => (
          <button
            type="button"
            key={preset.label}
            title={preset.description}
            disabled={disabled}
            aria-pressed={value === preset.threshold}
            className={value === preset.threshold ? 'active' : ''}
            onClick={() => onChange(preset.threshold)}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <BarChart3 size={25} strokeWidth={1.5} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children && <div className="empty-actions">{children}</div>}
    </div>
  );
}

export function ConfirmDialog({
  title,
  description,
  actionLabel,
  open,
  busy,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  actionLabel: string;
  open: boolean;
  busy?: boolean;
  onConfirm(): void;
  onClose(): void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !busy) onClose();
      }}
    >
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-description`}>{description}</p>
      <div className="dialog-actions">
        <button className="btn" autoFocus disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-danger" disabled={busy} onClick={onConfirm}>
          {busy ? 'Working...' : actionLabel}
        </button>
      </div>
    </dialog>
  );
}

export function SavedStatus({ saving }: { saving: boolean }) {
  return (
    <span className="saved-status" role="status">
      {saving ? (
        'Saving...'
      ) : (
        <>
          <Check size={13} />
          Changes saved
        </>
      )}
    </span>
  );
}

export function ExternalLinkIcon() {
  return <ExternalLink size={14} aria-hidden="true" />;
}
