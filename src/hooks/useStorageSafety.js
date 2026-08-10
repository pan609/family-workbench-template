import { useCallback, useEffect, useState } from 'react';

export function useStorageSafety() {
  const [status, setStatus] = useState('checking');

  const requestPersistence = useCallback(async () => {
    if (!navigator.storage?.persisted || !navigator.storage?.persist) {
      setStatus('unsupported');
      return false;
    }
    try {
      if (await navigator.storage.persisted()) {
        setStatus('persistent');
        return true;
      }
      const granted = await navigator.storage.persist();
      setStatus(granted ? 'persistent' : 'best-effort');
      return granted;
    } catch {
      setStatus('best-effort');
      return false;
    }
  }, []);

  useEffect(() => {
    requestPersistence();
  }, [requestPersistence]);

  return { status, requestPersistence };
}
