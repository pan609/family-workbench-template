import { useCallback, useEffect, useRef, useState } from 'react';
import { runtimeConfig as config } from '../runtimeConfig.js';
import { backupEnvelope, initialData, normalizeData, normalizeImport } from '../data.js';

const DB_NAME = 'family-workbench-v2';
const STORE_NAME = 'states';
const STATE_KEY = `state:${config.name}`;
const LEGACY_KEY = `family-workbench:v1:${config.name}`;
const TOKEN_KEY = `family-workbench:pairing:${config.name}`;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('无法打开本机数据库'));
  });
}

async function idbGet(key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
    request.onsuccess = () => { db.close(); resolve(request.result); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

async function idbPut(key, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(value, key);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

let cachedToken;

function pairingToken() {
  if (cachedToken !== undefined) return cachedToken;
  const match = window.location.hash.match(/^#join=([A-Za-z0-9_-]{24,})$/);
  if (match) {
    localStorage.setItem(TOKEN_KEY, match[1]);
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    cachedToken = match[1];
    return cachedToken;
  }
  cachedToken = localStorage.getItem(TOKEN_KEY) || '';
  return cachedToken;
}

function familyHeaders() {
  const token = pairingToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function familyRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { ...familyHeaders(), ...(options.headers || {}) },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || payload.error || `请求失败：${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export function useWorkbenchData() {
  const familyMode = config.mode === 'family';
  const [data, setDataState] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState('');
  const [syncStatus, setSyncStatus] = useState(familyMode ? 'connecting' : 'local');
  const dataRef = useRef(data);
  const revisionRef = useRef(0);
  const pendingRef = useRef(null);
  const savingRef = useRef(false);
  const personalWriteRef = useRef(Promise.resolve());

  useEffect(() => { dataRef.current = data; }, [data]);

  const flushFamily = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    while (pendingRef.current) {
      const next = pendingRef.current;
      pendingRef.current = null;
      try {
        const result = await familyRequest('/api/state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseRevision: revisionRef.current, data: next }),
        });
        revisionRef.current = result.revision;
        setSyncStatus('online');
        setStorageError('');
      } catch (error) {
        if (error.status === 409 && error.payload?.data) {
          const current = normalizeData(error.payload.data);
          revisionRef.current = error.payload.revision;
          dataRef.current = current;
          setDataState(current);
          setStorageError('其他家人刚刚修改了工作台。已加载最新内容，请重试刚才的操作。');
          setSyncStatus('online');
        } else {
          pendingRef.current = next;
          setStorageError('家庭电脑连接已断开。请确认电脑开机、家庭共享已打开，并连接同一个 Wi-Fi。');
          setSyncStatus('offline');
        }
        break;
      }
    }
    savingRef.current = false;
  }, []);

  const setData = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(dataRef.current) : updater;
    dataRef.current = next;
    setDataState(next);
    if (familyMode) {
      pendingRef.current = next;
      window.setTimeout(flushFamily, 80);
    } else {
      personalWriteRef.current = personalWriteRef.current
        .catch(() => {})
        .then(() => idbPut(STATE_KEY, backupEnvelope(next)))
        .then(() => setStorageError(''))
        .catch(() => setStorageError('浏览器没有保存这次修改，请立即导出数据备份。'));
    }
  }, [familyMode, flushFamily]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (familyMode) {
          const result = await familyRequest('/api/state');
          revisionRef.current = result.revision;
          const next = result.data ? normalizeData(result.data) : initialData();
          dataRef.current = next;
          if (active) {
            setDataState(next);
            setSyncStatus('online');
            if (!result.data) {
              pendingRef.current = next;
              window.setTimeout(flushFamily, 0);
            }
          }
        } else {
          let saved = await idbGet(STATE_KEY);
          if (!saved) {
            const legacy = localStorage.getItem(LEGACY_KEY);
            if (legacy) saved = JSON.parse(legacy);
          }
          const next = saved ? normalizeImport(saved) : initialData();
          dataRef.current = next;
          if (active) setDataState(next);
          await idbPut(STATE_KEY, backupEnvelope(next));
        }
      } catch (error) {
        if (active) {
          setStorageError(familyMode
            ? '无法连接家庭电脑。请确认电脑开机、家庭共享已打开，并连接同一个 Wi-Fi。'
            : '无法读取本机数据。请不要继续录入，并检查浏览器存储权限。');
          setSyncStatus(familyMode ? 'offline' : 'local');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [familyMode, flushFamily]);

  useEffect(() => {
    if (!familyMode) return undefined;
    const timer = window.setInterval(async () => {
      if (savingRef.current) return;
      if (pendingRef.current) {
        flushFamily();
        return;
      }
      try {
        const result = await familyRequest('/api/state');
        if (result.revision > revisionRef.current && result.data) {
          const next = normalizeData(result.data);
          revisionRef.current = result.revision;
          dataRef.current = next;
          setDataState(next);
        }
        setSyncStatus('online');
        setStorageError('');
      } catch {
        setSyncStatus('offline');
        setStorageError('家庭电脑连接已断开。请确认电脑开机、家庭共享已打开，并连接同一个 Wi-Fi。');
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [familyMode, flushFamily]);

  return { data, setData, loading, storageError, syncStatus };
}
