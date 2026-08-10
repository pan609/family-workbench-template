import { useEffect, useState } from 'react';
import { backupEnvelope, initialData, normalizeData } from '../data.js';
import { createSetupUrl } from '../runtimeConfig.js';
import { idbGet, idbPut } from '../storage.js';

export function InstallWorkspace({ config }) {
  const workbenchUrl = createSetupUrl(config);

  return (
    <main className="install-handoff-page" id="main-content">
      <article className="install-handoff-card">
        <p className="eyebrow">“{config.name}”的安装专用页</p>
        <h1>请停留在这一页添加到主屏幕</h1>
        <p className="install-handoff-lead">这一步会把当前工作台和已有记录安全交给主屏幕里的独立空间。不要返回公共入口后再添加。</p>
        <ol className="install-handoff-steps">
          <li><span>1</span><div><strong>iPhone / iPad</strong><p>点 Safari 的“分享”，选择“添加到主屏幕”；如看到“作为网页 App 打开”，请保持开启。</p></div></li>
          <li><span>2</span><div><strong>Android</strong><p>打开手机默认浏览器菜单，选择“添加到主屏幕”或“安装应用”。</p></div></li>
          <li><span>3</span><div><strong>从新图标打开</strong><p>第一次打开会自动接收工作台，随后进入简短的专属地址。</p></div></li>
        </ol>
        <div className="install-privacy-note"><strong>数据不会上传</strong><p>交接信息只放在网址的 <code>#</code> 后面，浏览器不会把这部分发送给服务器。</p></div>
        <div className="install-handoff-actions"><a className="secondary-button" href={workbenchUrl}>暂不安装，回到工作台</a></div>
      </article>
    </main>
  );
}

export function InstallBootstrap({ config, data }) {
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function transfer() {
      try {
        const key = `state:${config.workspaceId}`;
        const existing = await idbGet(key);
        if (!existing) {
          const transferred = data === undefined ? initialData(config) : normalizeData(data);
          await idbPut(key, backupEnvelope(transferred));
        }
        window.location.replace(`/workbench/${config.workspaceId}`);
      } catch (reason) {
        if (active) setError(reason?.message || '无法把工作台写入主屏幕空间');
      }
    }
    transfer();
    return () => { active = false; };
  }, [config, data]);

  if (error) {
    return (
      <main className="unavailable-page" id="main-content">
        <div className="unavailable-card"><p className="eyebrow">安装没有完成</p><h1>工作台交接失败</h1><p>{error}</p><small>请删除这个主屏幕图标，回到 Safari 的工作台重新点“安装”。现有浏览器记录不会被删除。</small></div>
      </main>
    );
  }

  return <main className="loading-screen" id="main-content" aria-busy="true"><strong>正在接收你的家庭工作台…</strong></main>;
}

export function InstallRepair() {
  return (
    <main className="install-handoff-page" id="main-content">
      <article className="install-handoff-card install-repair-card">
        <p className="eyebrow">检测到旧版主屏幕图标</p>
        <h1>这个图标没有绑定你的工作台</h1>
        <p className="install-handoff-lead">旧图标会进入公共入口，也无法拿到 Safari 里的本地记录。请只修复图标，不要清除 Safari 数据。</p>
        <ol className="install-handoff-steps">
          <li><span>1</span><div><strong>删除当前旧图标</strong><p>长按主屏幕图标并选择删除网页 App。</p></div></li>
          <li><span>2</span><div><strong>回到 Safari 中的专属工作台</strong><p>打开原来的工作台，进入“设置 → 安装到手机”。</p></div></li>
          <li><span>3</span><div><strong>先点“打开安装专用页”</strong><p>在安装专用页里再选择“添加到主屏幕”。</p></div></li>
        </ol>
        <p className="install-repair-warning">不要在公共入口直接添加到主屏幕。</p>
      </article>
    </main>
  );
}
