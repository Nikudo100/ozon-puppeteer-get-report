import path from 'path';
import {
  pressAndSaveFile,
  clickUntilPopoverOpens,
  handleCookies,
  closePopup,
  initializeBrowser,
  switchKabinet,
  checkAndSwitchCabinet,
  chekKabinet,
  checkSocks5Proxy
} from './func.js'; // добавлен .js
// 🔄 Список кабинетов
const cabinets = ['DiDesign', 'Stik.Store'];
import dotenv from 'dotenv';
import process from 'process';

// Load environment variables from .env file
dotenv.config();

const proxy = {
  host: process.env.PROXY_HOST || '',
  port: Number(process.env.PROXY_PORT) || 0,
  username: process.env.PROXY_LOGIN || '',
  password: process.env.PROXY_PASSWORD || ''
};

// Validate proxy configuration
if (!proxy.host || !proxy.port || !proxy.username || !proxy.password) {
  console.error('❌ Missing or invalid proxy configuration in environment variables');
  process.exit(1);
}

console.log('proxy', proxy);

const COOKIE_PATH = path.resolve('./cookies.json');

const isProxyOk = await checkSocks5Proxy(proxy);
if (!isProxyOk) {
  console.error('❌ Прокси SOCKS5 недоступен. Прерывание...');
  process.exit(1);
}

const { browser, page } = await initializeBrowser(proxy);

await page.goto('https://seller.ozon.ru/app/finances/warehousing-cost', {
  waitUntil: 'networkidle2',
});
await handleCookies(page, COOKIE_PATH);


await closePopup(page);
let { kabinet, kabinetTitle } = await chekKabinet(page)
await clickUntilPopoverOpens(page);
await pressAndSaveFile(page, kabinetTitle);
// Get the target cabinet name that is different from current one
const targetName = cabinets.find(cabinet => cabinet !== kabinetTitle);

// переключаем кабинеты
await checkAndSwitchCabinet(page, targetName);

await clickUntilPopoverOpens(page);
await pressAndSaveFile(page, targetName);

console.log('✅ Готово. Закрываем браузер...');
await browser.close();