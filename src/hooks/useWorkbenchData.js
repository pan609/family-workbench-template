import { useCallback, useEffect, useRef, useState } from 'react';
import { backupEnvelope, initialData, normalizeData, normalizeImport } from '../data.js';
import { idbGet, idbPut } from '../storage.js';

function pairingToken(tokenKey) {
  const match = window.location.hash.match(/^#join=([A-Za-z0-9_-]{24,})$/);
  if (match) {
    localStorage.setItem(tokenKey, match[1]);
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    return match[1];
  }
  return localStorage.getItem(tokenKey) || '';
}

function familyHeaders(tokenKey) {
  const token = pairingToken(tokenKey);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function familyRequest(path, tokenKey, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { ...familyHeaders(tokenKey), ...(options.headers || {}) },
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

export function useWorkbenchData(config) {
  const familyMode = config.mode === 'family';
  const stateKey = `state:${config.workspaceId}`;
  const tokenKey = `family-workbench:pairing:${config.workspaceId}`;
  const [data, setDataState] = useState(() => initialData(config));
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
        const result = await familyRequest('/api/state', tokenKey, {
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
        .then(() => idbPut(stateKey, backupEnvelope(next)))
        .then(() => setStorageError(''))
        .catch(() => setStorageError('浏览器没有保存这次修改，请立即导出数据备份。'));
    }
  }, [familyMode, flushFamily]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (familyMode) {
          const result = await familyRequest('/api/state', tokenKey);
          revisionRef.current = result.revision;
          const next = result.data ? normalizeData(result.data) : initialData(config);
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
          const saved = await idbGet(stateKey);
          const next = saved ? normalizeImport(saved) : initialData(config);
          dataRef.current = next;
          if (active) setDataState(next);
          await idbPut(stateKey, backupEnvelope(next));
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
        const result = await familyRequest('/api/state', tokenKey);
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
