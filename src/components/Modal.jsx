import { useEffect, useRef } from 'react';
import { Icon } from './Icons.jsx';

export function Modal({ title, children, onClose, actions, tone = 'normal' }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const first = panelRef.current?.querySelector('button');
    first?.focus();
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={panelRef} data-tone={tone}>
        <button className="icon-button modal-close" type="button" onClick={onClose} aria-label="关闭对话框">
          <Icon name="close" />
        </button>
        <div className="warning-mark" aria-hidden="true">!</div>
        <h2 id="modal-title">{title}</h2>
        <div className="modal-content">{children}</div>
        <div className="modal-actions">{actions}</div>
      </section>
    </div>
  );
}
