import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function InstallGuide({ capability }) {
  const [qrCode, setQrCode] = useState('');
  const unavailable = capability.isLocalAddress || !capability.isSecure;

  useEffect(() => {
    if (unavailable) return undefined;
    let active = true;
    QRCode.toDataURL(capability.freshUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#232722', light: '#fffdf8' },
      errorCorrectionLevel: 'M',
    }).then((value) => active && setQrCode(value)).catch(() => setQrCode(''));
    return () => { active = false; };
  }, [capability.freshUrl, unavailable]);

  if (capability.installed) {
    return <div className="install-complete"><strong>已经安装</strong><p>当前正在以独立应用方式运行。</p></div>;
  }

  return (
    <div className="install-guide">
      {unavailable ? (
        <div className="install-blocked" role="status">
          <strong>当前是本机预览地址</strong>
          <p>手机无法访问这个地址。完成 HTTPS 发布后，这里会自动显示可安装二维码。</p>
        </div>
      ) : (
        <div className="qr-panel">
          {qrCode ? <img src={qrCode} width="200" height="200" alt="在手机上打开家庭工作台的二维码" /> : <div className="qr-loading">正在生成二维码…</div>}
          <div><strong>用手机扫码打开安装专用页</strong><p>扫码适合在另一台手机创建同样配置；当前浏览器里的已有记录不会随二维码迁移。</p><code>{capability.freshUrl}</code></div>
        </div>
      )}

      {!unavailable && <a className="primary-button install-handoff-button" href={capability.url}>打开安装专用页</a>}

      <div className="install-platforms">
        <section data-current={capability.platform === 'ios' || undefined}>
          <h3>iPhone / iPad</h3>
          <ol><li>先点上方“打开安装专用页”</li><li>在 Safari 点“分享”</li><li>选“添加到主屏幕”</li><li>如看到“作为网页 App 打开”，保持开启并添加</li></ol>
        </section>
        <section data-current={capability.platform === 'android' || undefined}>
          <h3>Android</h3>
          <ol><li>先点上方“打开安装专用页”</li><li>在手机默认浏览器打开菜单</li><li>选“添加到主屏幕”或“安装应用”</li><li>确认添加</li></ol>
        </section>
      </div>
      <p className="install-footnote">同一手机从安装专用页添加时，会带入当前工作台和已有记录。安装不是云同步；换手机仍建议先导出备份。</p>
    </div>
  );
}
