import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function InstallGuide({ capability }) {
  const [qrCode, setQrCode] = useState('');
  const unavailable = capability.isLocalAddress || !capability.isSecure;

  useEffect(() => {
    if (unavailable) return undefined;
    let active = true;
    QRCode.toDataURL(capability.url, {
      width: 280,
      margin: 2,
      color: { dark: '#232722', light: '#fffdf8' },
      errorCorrectionLevel: 'M',
    }).then((value) => active && setQrCode(value)).catch(() => setQrCode(''));
    return () => { active = false; };
  }, [capability.url, unavailable]);

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
          <div><strong>用手机扫码打开</strong><p>打开后按对应系统步骤添加到主屏幕。</p><code>{capability.url}</code></div>
        </div>
      )}

      <div className="install-platforms">
        <section data-current={capability.platform === 'ios' || undefined}>
          <h3>iPhone / iPad</h3>
          <ol><li>使用 Safari 打开工作台</li><li>点“分享”</li><li>选“添加到主屏幕”</li><li>开启“作为网页 App 打开”并添加</li></ol>
        </section>
        <section data-current={capability.platform === 'android' || undefined}>
          <h3>Android</h3>
          <ol><li>使用 Chrome 打开工作台</li><li>点右上角菜单</li><li>选“安装应用”或“添加到主屏幕”</li><li>确认安装</li></ol>
          {capability.canPrompt && <button className="primary-button" type="button" onClick={capability.install}>立即安装</button>}
        </section>
      </div>
      <p className="install-footnote">安装不会自动把数据同步到其他设备。换手机前请先导出备份。</p>
    </div>
  );
}
