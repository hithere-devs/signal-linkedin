import { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { sanitizeTagList } from '../lib/defaults';

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
      .split(/[,;\n]/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length) onChange(sanitizeTagList([...values, ...parts]));
    setDraft('');
  };
  return (
    <div className="tag-editor">
      <div className="tag-label">
        <label htmlFor={id}>{label}</label>
        <span>{values.length}/60</span>
      </div>
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      <div className="tag-box">
        <div className="tag-chips">
          {values.map((value) => (
            <span key={value} className="chip">
              {value}
              <button
                type="button"
                aria-label={`Remove ${value}`}
                onClick={() => onChange(values.filter((item) => item !== value))}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
        <div className="tag-input-row">
          <input
            id={id}
            type="text"
            maxLength={500}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={hint ? `${id}-hint` : undefined}
            value={draft}
            placeholder={
              values.length >= 60 ? '60 topics added' : (placeholder ?? 'Add a topic...')
            }
            disabled={values.length >= 60}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                add();
              }
            }}
            onBlur={add}
          />
          <button
            type="button"
            className="icon-button"
            aria-label={`Add ${label.toLowerCase()}`}
            disabled={!draft.trim() || values.length >= 60}
            onMouseDown={(event) => event.preventDefault()}
            onClick={add}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
      <span className="tag-key-hint">Press Enter or use commas to add more than one.</span>
    </div>
  );
}
