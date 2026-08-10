import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function FamilyShare({ syncStatus }) {
  const [inviteUrl, setInviteUrl] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [ownerDevice, setOwnerDevice] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/status', { cache: 'no-store' })
      .then((response) => response.json())
      .then(async (status) => {
        if (!active) return;
        setOwnerDevice(Boolean(status.ownerDevice));
        if (!status.ownerDevice) return;
        const invite = await fetch('/api/invite', { cache: 'no-store' }).then((response) => response.json());
        if (!active || !invite.url) return;
        setInviteUrl(invite.url);
        setQrCode(await QRCode.toDataURL(invite.url, {
          width: 280,
          margin: 2,
          color: { dark: '#232722', light: '#fffdf8' },
          errorCorrectionLevel: 'M',
        }));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <aside className="family-share" data-status={syncStatus} aria-labelledby="family-share-title">
      <div>
        <p className="eyebrow">家庭共享 · {syncStatus === 'online' ? '在线' : syncStatus === 'offline' ? '暂时离线' : '正在连接'}</p>
        <h2 id="family-share-title">{ownerDevice ? '邀请家人扫码加入' : '已连接家庭工作台'}</h2>
        <p>这台电脑关机、休眠或离开家庭 Wi-Fi 后，家人将暂时无法访问；已有数据不会丢失。</p>
        {syncStatus === 'offline' && <strong role="alert">请打开家庭电脑上的“家庭共享”，然后重新连接。</strong>}
        {inviteUrl && <code>{inviteUrl.replace(/#join=.*/, '#join=••••••')}</code>}
      </div>
      {ownerDevice && qrCode && <img src={qrCode} width="156" height="156" alt="家人加入家庭工作台的二维码" />}
    </aside>
  );
}
