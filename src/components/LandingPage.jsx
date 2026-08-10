import { useState } from 'react';
import { backupEnvelope, initialData, normalizeImport } from '../data.js';
import { idbGet, idbPut } from '../storage.js';
import {
  normalizeConfig,
  readLegacyConfig,
  readWorkspaceRegistry,
  saveWorkspaceConfig,
} from '../runtimeConfig.js';

function newWorkspaceId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    return (token === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export function LandingPage() {
  const [workspaces] = useState(readWorkspaceRegistry);
  const [legacy] = useState(readLegacyConfig);
  const [migrationError, setMigrationError] = useState('');

  async function migrateLegacy() {
    try {
      const workspaceId = newWorkspaceId();
      const config = normalizeConfig({ ...legacy, workspaceId });
      const oldState = await idbGet(`state:${config.name}`);
      let state = oldState;
      if (!state) {
        const localState = localStorage.getItem(`family-workbench:v1:${config.name}`);
        if (localState) state = JSON.parse(localState);
      }
      if (state) {
        const normalized = normalizeImport(state);
        await idbPut(`state:${workspaceId}`, backupEnvelope(normalized));
      } else {
        await idbPut(`state:${workspaceId}`, backupEnvelope(initialData(config)));
      }
      const oldMeta = localStorage.getItem(`family-workbench:meta:v1:${config.name}`);
      if (oldMeta) localStorage.setItem(`family-workbench:meta:v1:${workspaceId}`, oldMeta);
      saveWorkspaceConfig(config);
      window.location.assign(`/workbench/${workspaceId}`);
    } catch (error) {
      setMigrationError(`旧版记录没有被修改。迁移失败：${error.message}`);
    }
  }

  return (
    <div className="landing-shell">
      <header className="landing-header">
        <a className="landing-brand" href="/" aria-label="家庭工作台首页"><span aria-hidden="true">⌇</span><strong>家庭工作台</strong></a>
        <span className="version-pill">公开入口 · v0.6</span>
      </header>
      <main className="landing-main">
        <section className="landing-hero">
          <p className="eyebrow">用一句白话，得到自己的手机工作台</p>
          <h1>这里是入口，<br />不是所有人共用的一张表。</h1>
          <p>家庭工作台 Skill 会根据你的生活习惯生成一个专属链接。链接里的 UUID 用来区分工作台；你的任务、采购、餐单和便签仍只保存在当前手机浏览器里。</p>
          <div className="landing-actions"><a className="primary-button" href="#how-it-works">怎么创建</a>{workspaces.length > 0 && <a className="secondary-button" href="#my-workspaces">继续使用</a>}</div>
        </section>

        {workspaces.length > 0 && (
          <section className="workspace-section" id="my-workspaces" aria-labelledby="my-workspaces-title">
            <div className="section-kicker"><p className="eyebrow">只在这台设备可见</p><h2 id="my-workspaces-title">我的工作台</h2></div>
            <div className="workspace-grid">
              {workspaces.map((item) => (
                <a className="workspace-card" href={item.path} key={item.workspaceId}>
                  <span>个人工作台</span><strong>{item.name}</strong><p>{item.tagline || '继续整理今天的生活'}</p><small>继续打开 →</small>
                </a>
              ))}
            </div>
          </section>
        )}

        {legacy && (
          <section className="legacy-migration" aria-labelledby="legacy-title">
            <div><p className="eyebrow">检测到旧版</p><h2 id="legacy-title">把“{legacy.name || '我的家庭工作台'}”迁移到专属链接</h2><p>会复制配置和本机记录到新的 UUID，不会删除旧数据。</p>{migrationError && <p className="migration-error" role="alert">{migrationError}</p>}</div>
            <button className="primary-button" type="button" onClick={migrateLegacy}>一键迁移</button>
          </section>
        )}

        <section className="how-section" id="how-it-works" aria-labelledby="how-title">
          <div className="section-kicker"><p className="eyebrow">创建方式</p><h2 id="how-title">不需要在这个网页里手工搭建</h2></div>
          <ol className="steps-grid">
            <li><span>01</span><strong>告诉 AI 你的需求</strong><p>例如：“帮我做一个温馨风格的个人工作台，要待办、采购和便签。”</p></li>
            <li><span>02</span><strong>Skill 生成专属链接</strong><p>链接形如 /workbench/你的 UUID。首次打开会把配置安全地留在本机。</p></li>
            <li><span>03</span><strong>添加到手机主屏幕</strong><p>之后像普通 App 一样打开；入口页会列出这台手机已保存的工作台。</p></li>
          </ol>
        </section>

        <section className="boundary-grid" aria-label="数据与链接说明">
          <article><strong>UUID 不是账号</strong><p>它只做工作台隔离。别人知道 UUID，也看不到你手机里的本地记录。</p></article>
          <article><strong>换手机不会自动同步</strong><p>新手机需重新打开原始专属链接，并通过导出备份迁移真实记录。</p></article>
          <article><strong>全家共享是另一种模式</strong><p>需要一台开机的家庭电脑作为共享主机；电脑关闭时手机会明确提示暂时不可用。</p></article>
        </section>
      </main>
      <footer className="landing-footer"><span>家庭工作台 Skill</span><span>手机优先 · 本地保存 · 不需要账号</span></footer>
    </div>
  );
}
