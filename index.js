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


console.log('proxy', proxy);

const COOKIE_PATH = path.resolve('./cookies.json');

(async () => {
  const { browser, page } = await initializeBrowser(proxy);

  // await page.goto('https://httpbin.org/ip', { waitUntil: 'domcontentloaded' });
  // const content = await page.content();
  // console.log('IP page content:', content);

  // await new Promise(resolve => setTimeout(resolve, 2000));
  await page.goto('https://seller.ozon.ru/app/finances/warehousing-cost', {
    waitUntil: 'domcontentloaded',
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
// await browser.close();
})();
