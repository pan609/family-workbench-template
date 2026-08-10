import { localISO } from './components/WeekStrip.jsx';

export const SCHEMA_VERSION = 2;

export function now() {
  return new Date().toISOString();
}

export function id(prefix) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

export function emptyData() {
  return { tasks: [], shopping: [], meals: [], note: '' };
}

export function initialData(config) {
  const today = localISO(new Date());
  return {
    tasks: (config.sampleItems?.tasks || []).map((item, index) => ({
      id: `task-example-${index}`,
      text: item.text,
      time: item.time || '',
      date: today,
      done: false,
      updatedAt: now(),
    })),
    shopping: (config.sampleItems?.shopping || []).map((text, index) => ({
      id: `shopping-example-${index}`,
      text,
      done: false,
      updatedAt: now(),
    })),
    meals: (config.sampleItems?.meals || []).map((text, index) => ({
      id: `meal-example-${index}`,
      text,
      date: today,
      done: false,
      updatedAt: now(),
    })),
    note: '',
  };
}

function safeText(value, maximum = 120) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

export function normalizeData(data) {
  if (!data || typeof data !== 'object') throw new Error('备份中缺少数据');
  const normalizeList = (items, kind) => {
    if (!Array.isArray(items) || items.length > 2000) throw new Error(`${kind}数据不完整或过多`);
    return items.map((item) => {
      const text = safeText(item?.text);
      if (!text) throw new Error(`${kind}中存在空白内容`);
      return {
        id: safeText(item.id, 100) || id(kind),
        text,
        done: Boolean(item.done),
        updatedAt: safeText(item.updatedAt, 40) || now(),
        ...(kind !== 'shopping' ? { date: safeText(item.date, 10) || localISO(new Date()) } : {}),
        ...(kind === 'task' ? { time: safeText(item.time, 5) } : {}),
      };
    });
  };
  return {
    tasks: normalizeList(data.tasks, 'task'),
    shopping: normalizeList(data.shopping, 'shopping'),
    meals: normalizeList(data.meals, 'meal'),
    note: safeText(data.note, 5000),
  };
}

export function normalizeImport(payload) {
  if (!payload || payload.app !== 'family-workbench' || ![1, SCHEMA_VERSION].includes(payload.schemaVersion)) {
    throw new Error('这不是受支持的家庭工作台备份');
  }
  return normalizeData(payload.data);
}

export function backupEnvelope(data) {
  return { app: 'family-workbench', schemaVersion: SCHEMA_VERSION, data };
}
