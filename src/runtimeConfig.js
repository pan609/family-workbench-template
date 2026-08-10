import bundledConfig from './workbench.config.json';

export const LEGACY_CONFIG_KEY = 'family-workbench:personal-config:v1';
export const WORKSPACE_CONFIG_PREFIX = 'family-workbench:workspace-config:v1:';
export const WORKSPACE_REGISTRY_KEY = 'family-workbench:workspace-registry:v1';
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export function normalizeConfig(raw, expectedWorkspaceId = '') {
  if (!raw || typeof raw !== 'object') throw new Error('工作台配置无效');
  const workspaceId = text(raw.workspaceId, '', 36).toLowerCase();
  if (!UUID_PATTERN.test(workspaceId)) throw new Error('工作台标识无效');
  if (expectedWorkspaceId && workspaceId !== expectedWorkspaceId.toLowerCase()) throw new Error('链接中的工作台标识不一致');
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
    workspaceId,
    name: text(raw.name, '我的家庭工作台', 40),
    tagline: text(raw.tagline, '把今天要做的事放在一个地方', 80),
    tone: TONES.has(raw.tone) ? raw.tone : 'warm',
    mode: raw.mode === 'family' ? 'family' : 'personal',
    personalDelivery: raw.personalDelivery === 'own-cloud' ? 'own-cloud' : 'public',
    cloudProvider: text(raw.cloudProvider, '', 20),
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

export function readWorkspaceRegistry() {
  try {
    const saved = JSON.parse(localStorage.getItem(WORKSPACE_REGISTRY_KEY));
    if (!Array.isArray(saved)) return [];
    return saved.filter((item) => UUID_PATTERN.test(item?.workspaceId || '') && typeof item?.name === 'string');
  } catch {
    return [];
  }
}

export function rememberWorkspace(config) {
  const item = {
    workspaceId: config.workspaceId,
    name: config.name,
    tagline: config.tagline,
    path: `/workbench/${config.workspaceId}`,
    lastOpenedAt: new Date().toISOString(),
  };
  const registry = readWorkspaceRegistry().filter((entry) => entry.workspaceId !== config.workspaceId);
  localStorage.setItem(WORKSPACE_REGISTRY_KEY, JSON.stringify([item, ...registry].slice(0, 30)));
}

export function saveWorkspaceConfig(config) {
  localStorage.setItem(`${WORKSPACE_CONFIG_PREFIX}${config.workspaceId}`, JSON.stringify(config));
  rememberWorkspace(config);
}

export function readLegacyConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(LEGACY_CONFIG_KEY));
    return saved && typeof saved === 'object' ? saved : null;
  } catch {
    return null;
  }
}

function readSavedConfig(workspaceId) {
  try {
    const saved = localStorage.getItem(`${WORKSPACE_CONFIG_PREFIX}${workspaceId}`);
    return saved ? normalizeConfig(JSON.parse(saved), workspaceId) : null;
  } catch {
    return null;
  }
}

function resolveRoute() {
  if (bundledConfig.mode === 'family') {
    try {
      return { kind: 'workbench', config: normalizeConfig(bundledConfig) };
    } catch (error) {
      return { kind: 'unavailable', reason: error.message };
    }
  }

  const pathMatch = window.location.pathname.match(/^\/workbench\/([0-9a-f-]{36})\/?$/i);
  if (!pathMatch) return { kind: 'landing' };
  const workspaceId = pathMatch[1].toLowerCase();
  if (!UUID_PATTERN.test(workspaceId)) return { kind: 'unavailable', reason: '链接中的工作台标识无效' };

  const setupMatch = window.location.hash.match(/^#setup=([A-Za-z0-9_-]+)$/);
  if (setupMatch) {
    try {
      const config = normalizeConfig(decodeSetup(setupMatch[1]), workspaceId);
      saveWorkspaceConfig(config);
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      return { kind: 'workbench', config };
    } catch (error) {
      return { kind: 'unavailable', workspaceId, reason: error.message };
    }
  }

  const config = readSavedConfig(workspaceId);
  if (!config) return { kind: 'unavailable', workspaceId, reason: '这台设备还没有保存此工作台的配置' };
  rememberWorkspace(config);
  return { kind: 'workbench', config };
}

export const runtimeRoute = resolveRoute();
