import { useState } from 'react';

export function QuickAdd({ onAdd }) {
  const [value, setValue] = useState('');

  function submit(event) {
    event.preventDefault();
    const text = value.trim();
    if (!text) return;
    onAdd(text);
    setValue('');
  }

  return (
    <section className="quick-add" aria-labelledby="quick-add-title">
      <h2 id="quick-add-title">快速记录</h2>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="quick-entry">要记录的家庭事项</label>
        <input
          id="quick-entry"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="例如：周四晚上买牛奶"
          autoComplete="off"
          maxLength={120}
        />
        <button className="primary-button" type="submit">添加</button>
      </form>
      <p className="input-hint">以“买”开头会放入采购清单；写“晚餐”会放入餐单。</p>
    </section>
  );
}
