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


// console.log('proxy', proxy);

const COOKIE_PATH = path.resolve('./cookies.json');

(async () => {
  const { browser, page } = await initializeBrowser(proxy);
  // await new Promise(resolve => setTimeout(resolve, 1000));
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
  await handleCookies(page, COOKIE_PATH);
  await page.goto('https://seller.ozon.ru/app/finances/warehousing-cost', {
    waitUntil: 'networkidle2',
  });

  await page.screenshot({ path: './debug/before-wait.png' });
  await closePopup(page);
  await page.screenshot({ path: './debug/before-wait1.png' });
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
})();
