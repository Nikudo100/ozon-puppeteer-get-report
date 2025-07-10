const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const COOKIE_PATH = path.resolve(__dirname, 'cookies.json');

(async () => {
  const downloadPath = path.resolve(__dirname, 'downloads');
  if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

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

  // Загрузка или сохранение куки
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

  try {
    // Задержка на 1 секунду (аналог page.waitForTimeout)
    await new Promise(resolve => setTimeout(resolve, 1000));
  
    const result = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const declineButton = buttons.find(btn =>
        btn.textContent.trim().toLowerCase().includes("don't show again") ||
        btn.textContent.trim().toLowerCase().includes("больше не показывать")
      );
      if (declineButton) {
        declineButton.click();
        return true;
      }
      return false;
    });

    if (result) {
      console.log('✅ Всплывающее окно закрыто');
    } else {
      console.log('ℹ️ Всплывающее окно не найдено (по тексту)');
    }
  } catch (err) {
    console.log('⚠️ Ошибка при попытке закрыть попап:', err.message);
  }



// 👉 Ищем и нажимаем "Скачать отчёт"
console.log('👉 Ищем и нажимаем "Скачать отчёт"...');

// Ждём, пока появится кнопка с нужным текстом
await page.waitForXPath(
  "//button[.//span[text()='Скачать отчёт'] or .//span[text()='Download report']]",
  { timeout: 10000 }
);

// Получаем и нажимаем кнопку
const [downloadBtn] = await page.$x(
  "//button[.//span[text()='Скачать отчёт'] or .//span[text()='Download report']]"
);
if (downloadBtn) {
  await downloadBtn.click();
  console.log('✅ Кнопка "Скачать отчёт" нажата');
} else {
  console.error('❌ Не удалось найти кнопку "Скачать отчёт"');
}

  // Выбираем "По товарам"
  console.log('👉 Выбираем "По товарам"...');
  await page.waitForSelector('label input[value="ByProducts"]', { timeout: 10000 });
  await page.click('label input[value="ByProducts"]');

  // Нажимаем финальную кнопку "Скачать"
  console.log('👉 Нажимаем "Скачать"...');
  await page.waitForSelector('span:text("Скачать")', { timeout: 10000 });
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const target = buttons.find(btn =>  {
      const text = btn.textContent.trim().toLowerCase();
      return text.includes('скачать') || text.includes('download');
    });
    // const target = buttons.find(btn => btn.textContent.trim() === 'Скачать');
    if (target) target.click();
  });
 

  // Ждём загрузки файла
  console.log('⏳ Ждём загрузку...');
  await page.waitForTimeout(15000);

  // Поиск последнего .xlsx файла
  const files = fs.readdirSync(downloadPath).filter(f => f.endsWith('.xlsx'));
  if (files.length === 0) {
    console.error('❌ Excel файл не найден');
    await browser.close();
    return;
  }

  const latestFile = files
    .map(f => ({ name: f, time: fs.statSync(path.join(downloadPath, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time)[0].name;

  const filePath = path.join(downloadPath, latestFile);
  console.log(`✅ Найден файл: ${latestFile}`);

  // Чтение Excel и парсинг в JSON
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = xlsx.utils.sheet_to_json(sheet);

  const jsonPath = path.join(__dirname, 'parsed.json');
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), 'utf8');
  console.log(`📦 JSON сохранён: ${jsonPath}`);

  await browser.close();
})();
