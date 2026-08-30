import { useId, useState } from 'react';

interface Props {
  label: string;
  hint?: string;
  values: string[];
  onChange(values: string[]): void;
  placeholder?: string;
}

export default function TagEditor({ label, hint, values, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState('');
  const id = useId();

  const add = () => {
    const parts = draft
      .split(/[,;]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length) onChange([...new Set([...values, ...parts])].slice(0, 60));
    setDraft('');
  };

  return (
    <div className="tag-editor">
      <label htmlFor={id}>{label}</label>
      {hint && <p className="tag-hint">{hint}</p>}
      <div className="chips">
        {values.map((v) => (
          <span key={v} className="chip">
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>×</button>
          </span>
        ))}
      </div>
      <input
        id={id}
        className="text-input"
        maxLength={500}
        value={draft}
        placeholder={placeholder ?? 'Type and press Enter'}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
      />
    </div>
  );
}
