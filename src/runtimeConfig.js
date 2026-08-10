import bundledConfig from './workbench.config.json';

const CONFIG_KEY = 'family-workbench:personal-config:v1';
const MODULES = new Set(['schedule', 'tasks', 'shopping', 'meals', 'notes']);
const TONES = new Set(['warm', 'calm', 'compact']);

function text(value, fallback, maximum) {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.trim().replace(/\s+/g, ' ').slice(0, maximum);
  return cleaned || fallback;
}

function list(value, maximum = 20) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maximum).map((item) => text(item, '', 120)).filter(Boolean);
}

function normalize(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('工作台配置无效');
  const modules = Array.isArray(raw.modules)
    ? [...new Set(raw.modules.filter((item) => MODULES.has(item)))]
    : [];
  if (!modules.length) throw new Error('工作台没有可用模块');
  const tasks = Array.isArray(raw.sampleItems?.tasks)
    ? raw.sampleItems.tasks.slice(0, 20).map((item) => ({
        text: text(typeof item === 'string' ? item : item?.text, '', 120),
        time: /^([01]\d|2[0-3]):[0-5]\d$/.test(item?.time || '') ? item.time : '',
      })).filter((item) => item.text)
    : [];
  return {
    name: text(raw.name, '我的家庭工作台', 40),
    tagline: text(raw.tagline, '把今天要做的事放在一个地方', 80),
    tone: TONES.has(raw.tone) ? raw.tone : 'warm',
    mode: 'personal',
    modules,
    sampleItems: {
      tasks,
      shopping: list(raw.sampleItems?.shopping),
      meals: list(raw.sampleItems?.meals),
    },
  };
}

function decodeSetup(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function resolveConfig() {
  if (bundledConfig.mode === 'family') return bundledConfig;
  const match = window.location.hash.match(/^#setup=([A-Za-z0-9_-]+)$/);
  if (match) {
    try {
      const config = normalize(decodeSetup(match[1]));
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      return config;
    } catch (error) {
      console.warn('无法读取手机工作台链接，将使用默认配置。', error);
    }
  }
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) return normalize(JSON.parse(saved));
  } catch (error) {
    console.warn('无法读取已保存的工作台配置。', error);
  }
  return normalize(bundledConfig);
}

export const runtimeConfig = resolveConfig();
