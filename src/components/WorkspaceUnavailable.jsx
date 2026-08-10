export function WorkspaceUnavailable({ reason }) {
  return (
    <main className="unavailable-page">
      <div className="unavailable-card">
        <p className="eyebrow">无法打开这个工作台</p>
        <h1>这台手机还没有它的完整配置</h1>
        <p>{reason || '请使用 AI 最初交付的完整专属链接重新打开。'}。只复制不带 <code>#setup</code> 的短地址到新设备，无法恢复工作台配置或记录。</p>
        <div className="unavailable-actions"><a className="primary-button" href="/">返回家庭工作台入口</a></div>
        <small>如果这是换手机，请先在旧手机导出备份，再在新手机导入。UUID 不是云端账号，不会自动同步数据。</small>
      </div>
    </main>
  );
}
