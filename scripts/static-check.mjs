import { readFileSync, readdirSync } from 'node:fs';

const sourceRoot = new URL('../src/', import.meta.url);
const app = readdirSync(sourceRoot, { recursive: true })
  .filter((file) => /\.[jt]sx?$/.test(file))
  .map((file) => readFileSync(new URL(file, sourceRoot), 'utf8'))
  .join('\n');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));

const requiredAppText = ['快速记录', '导出数据', '无法导入这个文件', '现有数据没有被修改', '安装到手机', '打开安装专用页', '请停留在这一页添加到主屏幕', '旧版主屏幕图标', '当前是本机预览地址', '超过 7 天', '家庭电脑连接已断开', '关机、休眠', '这里是入口', '我的工作台', 'UUID 不是账号'];
for (const text of requiredAppText) {
  if (!app.includes(text)) throw new Error(`missing required UI text: ${text}`);
}
if (!css.includes(':focus-visible')) throw new Error('missing visible focus style');
if (!css.includes('prefers-reduced-motion')) throw new Error('missing reduced-motion support');
if (!app.includes('indexedDB.open')) throw new Error('personal mode must use IndexedDB');
if (!app.includes('#setup=')) throw new Error('personal shell must accept generated phone setup links');
if (!app.includes('state:${config.workspaceId}')) throw new Error('personal records must be isolated by workspace UUID');
if ('start_url' in manifest) throw new Error('manifest must not override the per-workspace install URL');
if ('id' in manifest) throw new Error('manifest identity must follow the per-workspace install URL');
if (manifest.display !== 'standalone') throw new Error('manifest must be standalone');
if (!manifest.icons.some((icon) => icon.sizes === '192x192')) throw new Error('missing 192px install icon');
if (!manifest.icons.some((icon) => icon.sizes === '512x512')) throw new Error('missing 512px install icon');
console.log('static checks passed');
