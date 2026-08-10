import { useRef } from 'react';
import { Icon } from './Icons.jsx';

const storageCopy = {
  checking: ['正在检查', '正在检查浏览器能否增强本地保存保护。'],
  persistent: ['已增强保护', '浏览器已允许持久保存，但手动清除网站数据仍会删除记录。'],
  'best-effort': ['普通本地保存', '浏览器没有授予持久存储，设备空间不足时仍可能被回收。'],
  unsupported: ['普通本地保存', '当前浏览器不支持持久存储申请，请依靠定期导出备份。'],
};

export function SettingsView({ onExport, onImport, onReset, onOpenInstall, storageStatus, onRequestStorage, backupLabel, mode, syncStatus }) {
  const inputRef = useRef(null);
  const [storageTitle, storageDetail] = storageCopy[storageStatus] || storageCopy.checking;
  const familyMode = mode === 'family';
  return (
    <section className="settings-view" aria-labelledby="settings-heading">
      <div className="page-intro">
        <p className="eyebrow">设备与本地数据</p>
        <h1 id="settings-heading">安装、备份与恢复</h1>
        <p>{familyMode ? '家庭记录保存在这台电脑，并通过家庭 Wi-Fi 同步到已配对的手机。' : '工作台主要在手机使用，并定期导出备份。数据不会自动上传。'}</p>
      </div>
      <div className="settings-list">
        {!familyMode && <article>
          <div><Icon name="phone" /><h2>安装到手机</h2><p>通过 HTTPS 地址或二维码添加到 iPhone、iPad 和 Android 主屏幕。</p></div>
          <button className="primary-button" type="button" onClick={onOpenInstall}>查看安装方法</button>
        </article>}
        {!familyMode && <article>
          <div><Icon name="list" /><h2>切换工作台</h2><p>返回公开入口，查看这台手机已经保存的其他工作台。</p></div>
          <a className="secondary-button" href="/">返回入口</a>
        </article>}
        {familyMode && <article>
          <div><Icon name="phone" /><h2>家庭电脑{syncStatus === 'online' ? '已连接' : '暂时离线'}</h2><p>电脑关机、休眠或关闭家庭共享后，家人将暂时无法访问；已有数据不会丢失。</p></div>
        </article>}
        {!familyMode && <article>
          <div><Icon name="shield" /><h2>{storageTitle}</h2><p>{storageDetail}</p></div>
          {storageStatus !== 'persistent' && <button className="secondary-button" type="button" onClick={onRequestStorage}>再次申请保护</button>}
        </article>}
        <article>
          <div><Icon name="download" /><h2>导出数据</h2><p>下载一个 JSON 备份文件，不会删除当前数据。{backupLabel}</p></div>
          <button className="secondary-button" type="button" onClick={onExport}>导出数据</button>
        </article>
        <article>
          <div><Icon name="upload" /><h2>{familyMode ? '迁入个人工作台' : '导入数据'}</h2><p>先检查文件，再由你确认是否替换{familyMode ? '家庭电脑中的共享数据' : '当前数据'}。</p></div>
          <button className="secondary-button" type="button" onClick={() => inputRef.current?.click()}>选择文件</button>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImport(file);
              event.target.value = '';
            }}
          />
        </article>
        <article className="danger-row">
          <div><Icon name="trash" /><h2>清空{familyMode ? '家庭共享' : '本机'}数据</h2><p>删除任务、采购、餐单和便签，需要再次确认。</p></div>
          <button className="danger-button" type="button" onClick={onReset}>清空数据</button>
        </article>
      </div>
      <aside className="privacy-note"><strong>{familyMode ? '家庭共享版 v0.6' : '个人版 v0.6'}</strong><span>{familyMode ? '真实记录保存在家庭电脑；手机清理缓存不会删除电脑中的记录。' : '每个 UUID 使用独立的 IndexedDB 记录；清除网站数据仍可能删除记录，请保留导出的备份。'}</span></aside>
    </section>
  );
}
