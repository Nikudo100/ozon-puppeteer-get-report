import path from 'path';
import {
  pressAndSaveFile,
  clickUntilPopoverOpens,
  closePopup,
  // initializeBrowser,
  // switchKabinet,
  checkAndSwitchCabinet,
  chekKabinet,
  parseExcelToJson,
  // checkSocks5Proxy,
  register,
  saveCookies
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
  // const { browser, page } = await initializeBrowser(proxy);
  // await new Promise(resolve => setTimeout(resolve, 1000));
  // await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0');
  // await handleCookies(page, COOKIE_PATH);

  await new Promise((resolve) => setTimeout(resolve, 1000)); // задержка 1 секунда
  // Регистрация нового аккаунта
  const { browser, page } = await register();
  
  await new Promise((resolve) => setTimeout(resolve, 3000)); // задержка 3 секунда
  
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
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  // переключаем кабинеты
  console.log('targetName:',targetName);
  await checkAndSwitchCabinet(page, targetName);
  console.log('Ждем 2',targetName);
  await delay(2000);
  await clickUntilPopoverOpens(page);
  console.log('Ждем 2',targetName);
  await delay(2000);
  await pressAndSaveFile(page, targetName);

  await saveCookies(page);

  console.log('✅ Готово. Закрываем браузер...');
  await browser.close();

  console.log('✅ Парсим файлы...');
  parseExcelToJson();
})();
