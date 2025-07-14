import path from 'path';

import {
  pressAndSaveFile,
  clickUntilPopoverOpens,
  handleCookies,
  closePopup,
  initializeBrowser,
  switchKabinet,
  checkAndSwitchCabinet,
  chekKabinet
} from './func.js'; // добавлен .js
// 🔄 Список кабинетов
const cabinets = ['DiDesign', 'Stik.Store'];

const COOKIE_PATH = path.resolve('./cookies.json');

const { browser, page } = await initializeBrowser();

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