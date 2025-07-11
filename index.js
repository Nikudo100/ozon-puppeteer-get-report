const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const COOKIE_PATH = path.resolve(__dirname, 'cookies.json');

async function main() {
  const downloadPath = path.resolve(__dirname, 'downloads');
  if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

  const browser = await puppeteer.launch({
    executablePath: puppeteer.executablePath(),
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
    await new Promise(resolve => setTimeout(resolve, 1000));
  
    const result = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const declineButton = buttons.find(btn =>
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


  async function clickUntilPopoverOpens(page) {
    const containerSelector = '.index_buttons_GAN3c';
    const popoverSelector = '.popover-module_fixReferenceSize__16BR';
    const buttonText = 'Скачать отчёт';
  
    await page.waitForSelector(containerSelector);
  
    let ariaExpanded = await page.$eval(popoverSelector, el => el.getAttribute('aria-expanded'));
    let attempts = 0;
    const maxAttempts = 10;
  
    while (ariaExpanded !== 'true') {
      if (attempts >= maxAttempts) {
        throw new Error('Попап не открылся после максимального количества попыток');
      }
      attempts++;
  
      const buttons = await page.$$(`${containerSelector} button`);
  
      let clicked = false;
  
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.innerText.trim(), btn);
        if (text.includes(buttonText)) {
          await btn.click();
          console.log('Кликнули на кнопку "Скачать отчёт", попытка #' + attempts);
          clicked = true;
          break;
        }
      }
      if (attempts == 2){
        return
      }
      if (!clicked) {
        throw new Error('Кнопки "Скачать отчёт" не найдены в контейнере');
      }
  
      await new Promise(resolve => setTimeout(resolve, 1000));
  
      ariaExpanded = await page.$eval(popoverSelector, el => el.getAttribute('aria-expanded'));
      console.log('Текущее aria-expanded:', ariaExpanded);
    }
  
    console.log('Попап открыт (aria-expanded="true")');
  }
  
  // Используй эту функцию в нужном месте твоего кода
  await clickUntilPopoverOpens(page);
  
  try {
    // await page.waitForSelector('.modal-module_modalContent_', { timeout: 15000 });
    // console.log('✅ Попап загрузки отчёта появился');

    const radioByProducts = await page.waitForSelector('input[type="radio"][value="ByProducts"]');
    await radioByProducts.click();
    console.log('✅ Выбран вариант "По товарам"');

    const buttons = await page.$$('.index_downloadReportConfirmButton_2P5UK');

    let foundDownloadButton = false;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent.trim(), btn);
      if (text === 'Скачать') {
        await btn.click();
        console.log('✅ Кнопка "Скачать" нажата');
        foundDownloadButton = true;
        break;
      }
    }

    if (!foundDownloadButton) {
      throw new Error('Не найдена кнопка "Скачать" в попапе');
    }

    console.log('⏳ Ожидаем завершения загрузки...');
    await new Promise(resolve => setTimeout(resolve, 6000));

    const downloadedFileName = fs.readdirSync(downloadPath)
      .filter(file => file.endsWith('.xlsx'))
      .sort((a, b) => {
        return fs.statSync(path.join(downloadPath, b)).mtime.getTime() -
               fs.statSync(path.join(downloadPath, a)).mtime.getTime();
      })[0];

    if (!downloadedFileName) {
      throw new Error('Загрузка не удалась — XLSX файл не найден');
    }

    console.log('✅ Отчёт успешно загружен:', downloadedFileName);
  } catch (err) {
    console.log('❌ Ошибка при загрузке отчёта:', err.message);
  }
}

main().catch(console.error);
