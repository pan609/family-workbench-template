import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { LandingPage } from './components/LandingPage.jsx';
import { WorkspaceUnavailable } from './components/WorkspaceUnavailable.jsx';
import { runtimeRoute } from './runtimeConfig.js';
import './styles.css';

const content = runtimeRoute.kind === 'workbench'
  ? <App config={runtimeRoute.config} />
  : runtimeRoute.kind === 'landing'
    ? <LandingPage />
    : <WorkspaceUnavailable reason={runtimeRoute.reason} />;

document.title = runtimeRoute.kind === 'workbench'
  ? runtimeRoute.config.name
  : runtimeRoute.kind === 'landing'
    ? '家庭工作台 Skill｜创建你的手机工作台'
    : '无法打开工作台｜家庭工作台';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {content}
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // The workbench remains usable online if service-worker registration is unavailable.
    });
  });
}
