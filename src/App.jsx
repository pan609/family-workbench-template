import { useCallback, useEffect, useMemo, useState } from 'react';
import { Checklist } from './components/Checklist.jsx';
import { FamilyShare } from './components/FamilyShare.jsx';
import { Icon } from './components/Icons.jsx';
import { InstallGuide } from './components/InstallGuide.jsx';
import { Modal } from './components/Modal.jsx';
import { QuickAdd } from './components/QuickAdd.jsx';
import { SettingsView } from './components/SettingsView.jsx';
import { localISO, WeekStrip, weekDays } from './components/WeekStrip.jsx';
import { useInstallCapability } from './hooks/useInstallCapability.js';
import { useStorageSafety } from './hooks/useStorageSafety.js';
import { useWorkbenchData } from './hooks/useWorkbenchData.js';
import { emptyData, id, normalizeImport, now, SCHEMA_VERSION } from './data.js';

const BACKUP_INTERVAL = 7 * 24 * 60 * 60 * 1000;

const navItems = [
  { id: 'today', label: '今天', icon: 'today' },
  { id: 'week', label: '本周', icon: 'week' },
  { id: 'lists', label: '清单', icon: 'list' },
  { id: 'settings', label: '设置', icon: 'settings' },
];

function App({ config }) {
  const metaKey = `family-workbench:meta:v1:${config.workspaceId}`;
  const { data, setData, loading, storageError, syncStatus } = useWorkbenchData(config);
  const installCapability = useInstallCapability();
  const { status: storageStatus, requestPersistence } = useStorageSafety();
  const [view, setView] = useState('today');
  const [selectedDate, setSelectedDate] = useState(localISO(new Date()));
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(null);
  const [backupMeta, setBackupMeta] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(metaKey));
      return saved && typeof saved === 'object' ? saved : { createdAt: now(), lastExportAt: '', dismissedAt: '' };
    } catch {
      return { createdAt: now(), lastExportAt: '', dismissedAt: '' };
    }
  });

  const enabled = (module) => config.modules.includes(module);
  const selectedTasks = data.tasks.filter((item) => item.date === selectedDate);
  const selectedMeals = data.meals.filter((item) => item.date === selectedDate);
  const hasUserData = data.tasks.length + data.shopping.length + data.meals.length > 0 || Boolean(data.note.trim());
  const backupReference = Date.parse(backupMeta.lastExportAt || backupMeta.createdAt) || Date.now();
  const dismissedRecently = Date.now() - (Date.parse(backupMeta.dismissedAt) || 0) < 24 * 60 * 60 * 1000;
  const backupDue = hasUserData && Date.now() - backupReference >= BACKUP_INTERVAL && !dismissedRecently;
  const backupLabel = backupMeta.lastExportAt
    ? `上次备份：${new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(backupMeta.lastExportAt))}。`
    : '尚未导出过备份。';

  useEffect(() => {
    document.title = config.name;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(metaKey, JSON.stringify(backupMeta));
    } catch {
      // The existing storage warning covers local write failures.
    }
  }, [backupMeta, metaKey]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updateList = useCallback((key, updater) => {
    setData((current) => ({ ...current, [key]: updater(current[key]) }));
  }, [setData]);

  if (loading) {
    return <main className="loading-screen" aria-busy="true"><strong>正在打开家庭工作台…</strong></main>;
  }

  function dateFromText(text) {
    const match = text.match(/周([一二三四五六日天])/);
    if (!match) return selectedDate;
    const indexes = { 一: 0, 二: 1, 三: 2, 四: 3, 五: 4, 六: 5, 日: 6, 天: 6 };
    return weekDays()[indexes[match[1]]].iso;
  }

  function addFromText(rawText) {
    const text = rawText.replace(/周[一二三四五六日天]/, '').trim();
    const targetDate = dateFromText(rawText);
    const time = text.match(/(?:[01]\d|2[0-3]):[0-5]\d/)?.[0] || '';
    const clean = text.replace(time, '').replace(/^(采购|买|晚餐|吃)[:：\s]*/, '').trim() || text;
    const timestamp = now();

    if (enabled('shopping') && /^(采购|买)/.test(text)) {
      updateList('shopping', (items) => [...items, { id: id('shopping'), text: clean, done: false, updatedAt: timestamp }]);
      setToast('已加入采购清单');
      return;
    }
    if (enabled('meals') && /^(晚餐|吃)/.test(text)) {
      updateList('meals', (items) => [...items, { id: id('meal'), text: clean, date: targetDate, done: false, updatedAt: timestamp }]);
      setToast('已加入餐单');
      return;
    }
    if (!enabled('tasks') && !enabled('schedule')) {
      if (enabled('shopping')) {
        updateList('shopping', (items) => [...items, { id: id('shopping'), text: clean, done: false, updatedAt: timestamp }]);
        setToast('已加入采购清单');
        return;
      }
      if (enabled('meals')) {
        updateList('meals', (items) => [...items, { id: id('meal'), text: clean, date: targetDate, done: false, updatedAt: timestamp }]);
        setToast('已加入餐单');
        return;
      }
    }
    updateList('tasks', (items) => [...items, { id: id('task'), text: clean, time, date: targetDate, done: false, updatedAt: timestamp }]);
    setSelectedDate(targetDate);
    setToast('已加入待办');
  }

  function toggle(key, itemId) {
    updateList(key, (items) => items.map((item) => item.id === itemId ? { ...item, done: !item.done, updatedAt: now() } : item));
  }

  function remove(key, itemId) {
    updateList(key, (items) => items.filter((item) => item.id !== itemId));
    setToast('已删除');
  }

  function exportData() {
    const payload = {
      app: 'family-workbench',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: now(),
      config: { workspaceId: config.workspaceId, name: config.name, tone: config.tone, modules: config.modules },
      data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `family-workbench-${localISO(new Date())}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setBackupMeta((current) => ({ ...current, lastExportAt: now(), dismissedAt: '' }));
    setToast('备份已导出');
  }

  async function importData(file) {
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('文件超过 2 MB');
      const payload = JSON.parse(await file.text());
      const nextData = normalizeImport(payload);
      setModal({ type: 'confirm-import', fileName: file.name, nextData });
    } catch (error) {
      setModal({ type: 'import-error', fileName: file.name, detail: error.message });
    }
  }

  function renderModal() {
    if (!modal) return null;
    if (modal.type === 'import-error') {
      return (
        <Modal
          title="无法导入这个文件"
          tone="warning"
          onClose={() => setModal(null)}
          actions={<><button className="secondary-button" onClick={() => setModal(null)}>保留现有数据</button><button className="primary-button" onClick={() => { setModal(null); setView('settings'); }}>重新选择文件</button></>}
        >
          <p>文件格式不正确，现有数据没有被修改。</p>
          <code>{modal.fileName}</code>
          <small>{modal.detail}</small>
        </Modal>
      );
    }
    if (modal.type === 'confirm-import') {
      const next = modal.nextData;
      return (
        <Modal
          title="确认替换本地数据"
          onClose={() => setModal(null)}
          actions={<><button className="secondary-button" onClick={() => setModal(null)}>取消</button><button className="primary-button" onClick={() => { setData(next); setModal(null); setToast('数据已导入'); }}>确认导入</button></>}
        >
          <p>导入后将替换当前浏览器中的数据。建议先导出一份备份。</p>
          <code>{modal.fileName}</code>
          <small>{next.tasks.length} 项待办 · {next.shopping.length} 项采购 · {next.meals.length} 项餐单</small>
        </Modal>
      );
    }
    if (modal.type === 'install') {
      return (
        <Modal
          title="安装到手机"
          onClose={() => setModal(null)}
          actions={<button className="secondary-button" onClick={() => setModal(null)}>完成</button>}
        >
          <InstallGuide capability={installCapability} />
        </Modal>
      );
    }
    return (
      <Modal
        title="确认清空本地数据"
        tone="warning"
        onClose={() => setModal(null)}
        actions={<><button className="secondary-button" onClick={() => setModal(null)}>取消</button><button className="danger-button" onClick={() => { setData(emptyData()); setModal(null); setToast('本地数据已清空'); }}>确认清空</button></>}
      >
        <p>这会删除当前浏览器里的所有内容。未导出的数据无法恢复。</p>
      </Modal>
    );
  }

  function nav() {
    return navItems.map((item) => (
      <button key={item.id} type="button" onClick={() => setView(item.id)} aria-current={view === item.id ? 'page' : undefined}>
        <Icon name={item.icon} /><span>{item.label}</span>
      </button>
    ));
  }

  return (
    <div className="app" data-tone={config.tone}>
      <header className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true">⌇</span><div><strong>{config.name}</strong><small>{config.tagline}</small></div></div>
        <nav className="desktop-nav" aria-label="主要导航">{nav()}</nav>
      </header>

      {view !== 'settings' && <WeekStrip selectedDate={selectedDate} onSelect={(date) => { setSelectedDate(date); setView('today'); }} />}

      <main id="main-content">
        {config.mode === 'family' && <FamilyShare syncStatus={syncStatus} />}
        {storageError && <div className="status-banner" role="alert">{storageError}</div>}
        {backupDue && (
          <aside className="backup-reminder" aria-labelledby="backup-reminder-title">
            <div><strong id="backup-reminder-title">该备份一次了</strong><span>距离创建或上次备份已经超过 7 天。导出不会删除当前数据。</span></div>
            <div><button className="secondary-button" type="button" onClick={() => setBackupMeta((current) => ({ ...current, dismissedAt: now() }))}>稍后提醒</button><button className="primary-button" type="button" onClick={exportData}>立即备份</button></div>
          </aside>
        )}
        {view === 'today' && (
          <TodayView
            selectedDate={selectedDate}
            enabled={enabled}
            tasks={selectedTasks}
            shopping={data.shopping}
            meals={selectedMeals}
            note={data.note}
            onAdd={addFromText}
            onToggle={toggle}
            onRemove={remove}
            onNote={(note) => setData((current) => ({ ...current, note }))}
          />
        )}
        {view === 'week' && <WeekView tasks={data.tasks} meals={data.meals} enabled={enabled} onSelect={(date) => { setSelectedDate(date); setView('today'); }} />}
        {view === 'lists' && <ListsView data={data} enabled={enabled} onToggle={toggle} onRemove={remove} />}
        {view === 'settings' && (
          <SettingsView
            onExport={exportData}
            onImport={importData}
            onReset={() => setModal({ type: 'reset' })}
            onOpenInstall={() => setModal({ type: 'install' })}
            storageStatus={storageStatus}
            onRequestStorage={requestPersistence}
            backupLabel={backupLabel}
            mode={config.mode}
            syncStatus={syncStatus}
          />
        )}
      </main>

      <nav className="mobile-nav" aria-label="主要导航">{nav()}</nav>
      <div className="toast" role="status" aria-live="polite" data-visible={Boolean(toast) || undefined}>{toast}</div>
      {renderModal()}
    </div>
  );
}

function TodayView({ selectedDate, enabled, tasks, shopping, meals, note, onAdd, onToggle, onRemove, onNote }) {
  const dateLabel = useMemo(() => new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(`${selectedDate}T12:00:00`)), [selectedDate]);
  return (
    <div className="today-layout">
      <div className="primary-column">
        <div className="page-intro"><p className="eyebrow">{dateLabel}</p><h1>今天先做这些</h1></div>
        {(enabled('tasks') || enabled('schedule') || enabled('shopping') || enabled('meals')) && <QuickAdd onAdd={onAdd} />}
        {(enabled('tasks') || enabled('schedule')) && <Checklist title="待办" items={tasks} emptyText="今天还没有待办，先记下一件最重要的事。" showTime onToggle={(itemId) => onToggle('tasks', itemId)} onRemove={(itemId) => onRemove('tasks', itemId)} />}
      </div>
      <aside className="utility-column">
        {enabled('shopping') && <Checklist title="采购" items={shopping} emptyText="没有要买的东西。" onToggle={(itemId) => onToggle('shopping', itemId)} onRemove={(itemId) => onRemove('shopping', itemId)} />}
        {enabled('meals') && <Checklist title="晚餐" items={meals} emptyText="今天还没安排晚餐。" onToggle={(itemId) => onToggle('meals', itemId)} onRemove={(itemId) => onRemove('meals', itemId)} />}
        {enabled('notes') && <section className="notes-section"><div className="section-heading"><h2>便签</h2><span>自动保存</span></div><label className="sr-only" htmlFor="personal-note">个人家庭便签</label><textarea id="personal-note" value={note} onChange={(event) => onNote(event.target.value.slice(0, 5000))} placeholder="临时记点什么……" /></section>}
      </aside>
    </div>
  );
}

function WeekView({ tasks, meals, enabled, onSelect }) {
  const days = weekDays();
  return (
    <section className="week-view" aria-labelledby="week-heading">
      <div className="page-intro"><p className="eyebrow">一周总览</p><h1 id="week-heading">本周</h1><p>只看安排和餐单，点一天回到详细清单。</p></div>
      <div className="week-grid">
        {days.map((day) => {
          const dayTasks = tasks.filter((item) => item.date === day.iso);
          const dayMeals = meals.filter((item) => item.date === day.iso);
          return <button className="week-column" key={day.iso} onClick={() => onSelect(day.iso)}><strong>{day.name}</strong><small>{day.month}/{day.day}</small>{(enabled('tasks') || enabled('schedule')) && dayTasks.slice(0, 4).map((item) => <span key={item.id}>{item.time && <time>{item.time}</time>}{item.text}</span>)}{enabled('meals') && dayMeals.slice(0, 2).map((item) => <em key={item.id}>晚餐 · {item.text}</em>)}{dayTasks.length + dayMeals.length === 0 && <i>暂无安排</i>}</button>;
        })}
      </div>
    </section>
  );
}

function ListsView({ data, enabled, onToggle, onRemove }) {
  return (
    <section className="lists-view" aria-labelledby="lists-heading">
      <div className="page-intro"><p className="eyebrow">所有内容</p><h1 id="lists-heading">清单</h1><p>集中整理待办、采购和餐单。</p></div>
      <div className="lists-grid">
        {(enabled('tasks') || enabled('schedule')) && <Checklist title="全部待办" items={data.tasks} emptyText="还没有待办。" showTime onToggle={(id) => onToggle('tasks', id)} onRemove={(id) => onRemove('tasks', id)} />}
        {enabled('shopping') && <Checklist title="全部采购" items={data.shopping} emptyText="采购清单是空的。" onToggle={(id) => onToggle('shopping', id)} onRemove={(id) => onRemove('shopping', id)} />}
        {enabled('meals') && <Checklist title="全部餐单" items={data.meals} emptyText="还没有餐单。" onToggle={(id) => onToggle('meals', id)} onRemove={(id) => onRemove('meals', id)} />}
      </div>
    </section>
  );
}

export default App;
