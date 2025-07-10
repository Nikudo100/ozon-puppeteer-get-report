const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const COOKIE_PATH = path.resolve(__dirname, 'cookies.json');

(async () => {
  const downloadPath = path.resolve(__dirname, 'downloads');
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath);
  }

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--window-size=1200,800',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu'
    ]
  });

  const [page] = await browser.pages();

  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath,
  });

  await page.goto('https://seller.ozon.ru/app/finances/warehousing-cost', {
    waitUntil: 'networkidle2',
  });

  // Загружаем куки, если есть
  if (fs.existsSync(COOKIE_PATH) && fs.readFileSync(COOKIE_PATH, 'utf-8').trim() !== '') {
    const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH));
    await page.setCookie(...cookies);
    console.log('✅ Загружены сохранённые куки');
    await page.reload({ waitUntil: 'networkidle2' });
  } else {
    console.log('🔐 Авторизуйтесь вручную, затем нажмите ENTER в терминале');
    await new Promise(resolve => process.stdin.once('data', () => resolve()));
    const cookies = await page.cookies();
    fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookies, null, 2));
    console.log('✅ Куки сохранены');
  }

  // Шаг 1 — открыть выпадающее меню "Скачать отчёт"
  console.log('👉 Нажимаем "Скачать отчёт"...');
  await page.waitForSelector('button span:text("Скачать отчёт")', { timeout: 10000 });
  await page.click('button span:text("Скачать отчёт")');

  // Шаг 2 — выбрать пункт "По товарам"
  console.log('👉 Выбираем "По товарам"...');
  await page.waitForSelector('label input[value="ByProducts"]', { timeout: 10000 });
  await page.click('label input[value="ByProducts"]');

  // Шаг 3 — нажать кнопку "Скачать"
  console.log('👉 Нажимаем финальную кнопку "Скачать"...');
  await page.waitForSelector('span:text("Скачать")', { timeout: 10000 });
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const target = buttons.find(btn => btn.textContent.trim() === 'Скачать');
    if (target) target.click();
  });

  console.log('⏳ Ждём завершения загрузки...');
  await page.waitForTimeout(10000); // можно заменить на мониторинг изменений в папке

  console.log(`✅ Готово. Проверь папку ${downloadPath}`);
  await browser.close();
})();
