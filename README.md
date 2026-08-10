# 家庭工作台独立网址模板

这是 `$build-family-workbench` 的个人模式静态网页模板。部署后的根网址是 Skill 介绍与本机工作台入口；Skill 为每个工作台生成 `/workbench/<UUID>#setup=<配置>` 专属链接。点击下面任意按钮，登录对应平台并确认项目，即可获得自己的 HTTPS 入口。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpan609%2Ffamily-workbench-template&project-name=family-workbench&repository-name=family-workbench)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/pan609/family-workbench-template)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/pan609/family-workbench-template)

## 数据边界

- 云平台只托管 HTML、CSS、JavaScript、图标和离线缓存文件。
- 任务、采购、餐单和便签保存在当前手机浏览器的 IndexedDB。
- 配置、记录和备份提醒按 UUID 隔离；UUID 只是命名空间，不是账号或密码。
- 同一部手机可在根入口继续打开多个工作台；另一部手机不会因知道 UUID 而读到本机记录。
- 独立网址不会自动让多部手机同步数据。
- 换手机、换域名或删除网站前，先在工作台中导出 JSON 备份。

## 本地验证

```bash
npm install
npm run check
npm run build
```

构建产物位于 `dist/`。
