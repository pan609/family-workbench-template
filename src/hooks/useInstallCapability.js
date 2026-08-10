import { useCallback, useEffect, useMemo, useState } from 'react';

function platformName() {
  const agent = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(agent)) return 'ios';
  if (/Android/.test(agent)) return 'android';
  return 'desktop';
}

export function useInstallCapability() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
  );

  useEffect(() => {
    function capturePrompt(event) {
      event.preventDefault();
      setPromptEvent(event);
    }
    function markInstalled() {
      setInstalled(true);
      setPromptEvent(null);
    }
    window.addEventListener('beforeinstallprompt', capturePrompt);
    window.addEventListener('appinstalled', markInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt);
      window.removeEventListener('appinstalled', markInstalled);
    };
  }, []);

  const hostname = window.location.hostname;
  const isLocalAddress = hostname === '127.0.0.1' || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '::1';
  const install = useCallback(async () => {
    if (!promptEvent) return 'manual';
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') setPromptEvent(null);
    return choice.outcome;
  }, [promptEvent]);

  return useMemo(() => ({
    platform: platformName(),
    installed,
    canPrompt: Boolean(promptEvent),
    isLocalAddress,
    isSecure: window.isSecureContext,
    url: window.location.href,
    install,
  }), [installed, promptEvent, isLocalAddress, install]);
}
