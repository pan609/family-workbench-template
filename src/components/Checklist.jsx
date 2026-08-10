import { Icon } from './Icons.jsx';

export function Checklist({ title, items, emptyText, onToggle, onRemove, showTime = false }) {
  return (
    <section className="checklist-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <span>{items.length} 项</span>
      </div>
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
