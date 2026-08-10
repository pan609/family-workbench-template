# 家庭工作台独立网址模板

这是 `$build-family-workbench` 的个人模式静态网页模板。部署后的根网址是 Skill 介绍与本机工作台入口；Skill 为每个工作台生成 `/workbench/<UUID>#setup=<配置>` 专属链接。工作台里的“安装到手机”会再生成 `/install/<UUID>#install=<配置和当前记录>` 安装专用链接，避免 iOS 主屏幕网页 App 与 Safari 不共享本地存储时回到公共入口。点击下面任意按钮，登录对应平台并确认项目，即可获得自己的 HTTPS 入口。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpan609%2Ffamily-workbench-template&project-name=family-workbench&repository-name=family-workbench)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/pan609/family-workbench-template)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/pan609/family-workbench-template)

## 数据边界

- 云平台只托管 HTML、CSS、JavaScript、图标和离线缓存文件。
- 任务、采购、餐单和便签保存在当前手机浏览器的 IndexedDB。
- 同一手机从安装专用页添加到主屏幕时，配置和当前记录通过 URL 的 `#` 片段交接给独立网页 App；片段不会随 HTTP 请求发送到托管平台。
- 配置、记录和备份提醒按 UUID 隔离；UUID 只是命名空间，不是账号或密码。
- 同一部手机可在根入口继续打开多个工作台；另一部手机不会因知道 UUID 而读到本机记录。
- 独立网址不会自动让多部手机同步数据。
- 换手机、换域名或删除网站前，先在工作台中导出 JSON 备份。

## 添加到手机主屏幕

不要从公共入口直接添加。先打开自己的工作台，点顶部“安装到手机”或进入“设置 → 安装到手机”，再从安装专用页执行系统的“添加到主屏幕”。旧版图标仍指向公共入口时，需要删除旧图标并重新添加一次；不要清除 Safari 网站数据。

## 本地验证

```bash
npm install
npm run check
npm run build
```

构建产物位于 `dist/`。
