import { useId, useRef, useState } from 'react';
import { Icon } from './Icons.jsx';

export function Checklist({
  title,
  items,
  emptyText,
  onToggle,
  onRemove,
  onAdd,
  addLabel = title,
  addPlaceholder = '输入内容',
  showTime = false,
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const inputId = useId();
  const toggleRef = useRef(null);

  function submit(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !onAdd) return;
    onAdd(text);
    setDraft('');
    setAdding(false);
    window.requestAnimationFrame(() => toggleRef.current?.focus());
  }

  return (
    <section className="checklist-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <div className="section-heading-actions">
          <span>{items.length} 项</span>
          {onAdd && (
            <button
              className="section-add-toggle"
              type="button"
              ref={toggleRef}
              aria-expanded={adding}
              aria-controls={`${inputId}-form`}
              onClick={() => setAdding((current) => !current)}
            >
              {adding ? '收起' : `＋ 添加${addLabel}`}
            </button>
          )}
        </div>
      </div>
      {adding && (
        <form className="section-add-form" id={`${inputId}-form`} onSubmit={submit}>
          <label className="sr-only" htmlFor={inputId}>添加{addLabel}</label>
          <input
            id={inputId}
            autoFocus
            autoComplete="off"
            maxLength={120}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setDraft('');
                setAdding(false);
              }
            }}
            placeholder={addPlaceholder}
          />
          <button className="primary-button" type="submit" disabled={!draft.trim()}>加入</button>
        </form>
      )}
      {items.length === 0 ? (
        <p className="empty-state">{emptyText}</p>
      ) : (
        <ul className="checklist">
          {items.map((item) => (
            <li key={item.id} data-complete={item.done || undefined}>
              <label className="check-control">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => onToggle(item.id)}
                />
                <span className="custom-check"><Icon name="check" size={16} /></span>
                <span className="item-copy">
                  {showTime && item.time && <time>{item.time}</time>}
                  <span>{item.text}</span>
                </span>
              </label>
              <button className="icon-button" type="button" onClick={() => onRemove(item.id)} aria-label={`删除：${item.text}`}>
                <Icon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
