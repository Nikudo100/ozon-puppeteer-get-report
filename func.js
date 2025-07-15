// func.js
import puppeteer from 'puppeteer';
import fetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';
import fs from 'fs';
import path from 'path';

export async function initializeBrowser(proxy) {
  const downloadPath = path.resolve('./downloads');
  if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

  const proxyUrl = `socks5://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
  const agent = new SocksProxyAgent(proxyUrl);

  const browser = await puppeteer.launch({
    // headless: false,
    args: ['--window-size=1400,800,`--proxy-server=socks5://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`,'],
  });

  const [page] = await browser.pages();

  await page.setRequestInterception(true);

  page.on('request', async (request) => {
    const url = request.url();

    try {
      const response = await fetch(url, {
        method: request.method(),
        headers: request.headers(),
        body: request.postData(),
        agent,
      });

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);


      request.respond({
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: buffer,
      });
    } catch (err) {
      console.error('Fetch proxy error:', err.message);
      request.abort();
    }
  });

  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath,
  });

  return { browser, page };
}




// export async function initializeBrowser(proxy) {
//   const downloadPath = path.resolve('./downloads');
//   if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

//   const proxyUrl = `socks5://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;

//   const browser = await puppeteer.launch({
//     headless: false,
//     defaultViewport: null,
//     args: [
//       `--proxy-server=${proxyUrl}`, // авторизация встроена в URL
//       '--window-size=1400,800',
//       '--disable-dev-shm-usage',
//       '--no-sandbox',
//       '--disable-setuid-sandbox',
//       '--disable-gpu',
//     ],
//   });

//   const [page] = await browser.pages();

//   // Примечание: `page.authenticate()` можно не вызывать — авторизация уже встроена в URL
//   // Но если прокси не принимает авторизацию в URL — можно оставить:
//   try {
//     await page.authenticate({
//       username: proxy.username,
//       password: proxy.password,
//     });
//   } catch (e) {
//     console.warn('Authentication failed or not supported, continuing...');
//   }

//   const client = await page.target().createCDPSession();
//   await client.send('Page.setDownloadBehavior', {
//     behavior: 'allow',
//     downloadPath: downloadPath,
//   });

//   return { browser, page };
// }

// export async function initializeBrowser(proxy) {
//   const downloadPath = path.resolve('./downloads');
//   if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

//   const browser = await puppeteer.launch({
//     headless: false,
//     defaultViewport: null,
//     executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // укажи путь к Chrome, если нужно
//     args: [
//       `--proxy-server=socks5://${proxy.host}:${proxy.port}`,
//       '--window-size=1400,800',
//       '--no-sandbox',
//       '--disable-setuid-sandbox',
//       '--disable-dev-shm-usage',
//       '--disable-gpu',
//     ],
//   });

//   const [page] = await browser.pages();

//   // Аутентификация прокси
//   await page.authenticate({
//     username: proxy.username,
//     password: proxy.password,
//   });

//   // Настроим User-Agent и заголовки
//   await page.setUserAgent(
//     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
//   );
//   await page.setExtraHTTPHeaders({
//     'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
//   });

//   const client = await page.target().createCDPSession();
//   await client.send('Page.setDownloadBehavior', {
//     behavior: 'allow',
//     downloadPath,
//   });

//   return { browser, page };
// }
// export async function initializeBrowser(proxy) {
//   const downloadPath = path.resolve('./downloads');
//   if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

//   puppeteer.use(
//     ProxyPlugin({
//       address: proxy.host,
//       port: proxy.port,
//       credentials: {
//         username: proxy.username,
//         password: proxy.password
//       },
//       protocol: 'socks5' // SOCKS5 proxy!
//     })
//   );

//   const browser = await puppeteer.launch({
//     headless: false,
//     defaultViewport: null,
//     args: ['--window-size=1400,800'],
//   });

//   const [page] = await browser.pages();

//   const client = await page.target().createCDPSession();
//   await client.send('Page.setDownloadBehavior', {
//     behavior: 'allow',
//     downloadPath,
//   });

//   return { browser, page };
// }



export async function checkSocks5Proxy({ host, port, username, password }) {
  const proxyUrl = `socks5h://${username}:${password}@${host}:${port}`;
  const agent = new SocksProxyAgent(proxyUrl);

  const options = {
    hostname: 'api64.ipify.org', // Use IPv6 compatible endpoint
    port: 443,
    path: '/',  // Simplified path without format parameter
    method: 'GET',
    agent,
    timeout: 5000,
    headers: {
      'Accept': 'text/plain' // Request plain text response
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      // Check if response status is successful
      if (res.statusCode !== 200) {
        console.error('Proxy check failed: Invalid status code', res.statusCode);
        resolve(false);
        return;
      }

      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        // Validate IP address format using regex
        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        if (ipRegex.test(data.trim())) {
          console.log('Current IP address:', data.trim());
          resolve(true);
        } else {
          console.error('Invalid IP address format received');
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.error('Proxy check failed:', err.message);
      resolve(false);
    });

    req.on('timeout', () => {
      console.error('Proxy check timed out');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

export async function handleCookies(page, COOKIE_PATH) {
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
}


// export async function initializeBrowser(proxy) {
//   const downloadPath = path.resolve('./downloads');
//   if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

//   const browser = await puppeteer.launch({
//     headless: false,
//     defaultViewport: null,
//     args: [
//       `--proxy-server=socks5://${proxy.host}:${proxy.port}`, // ✅ только хост:порт
//       '--window-size=1400,800',
//       '--disable-dev-shm-usage',
//       '--no-sandbox',
//       '--disable-setuid-sandbox',
//       '--disable-gpu',
//     ],
//   });

//   const [page] = await browser.pages();

//   // Прокси-авторизация отдельно:
//   await page.authenticate({
//     username: proxy.username,
//     password: proxy.password,
//   });

//   const client = await page.target().createCDPSession();
//   await client.send('Page.setDownloadBehavior', {
//     behavior: 'allow',
//     downloadPath: downloadPath,
//   });

//   return { browser, page };
// }

// export async function initializeBrowser() {
//   const downloadPath = path.resolve('./downloads');
//   if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

//   const browser = await puppeteer.launch({
//     executablePath: puppeteer.executablePath(),
//     headless: false,
//     defaultViewport: null,
//     args: [
//       '--window-size=1400,800',
//       '--disable-dev-shm-usage',
//       '--no-sandbox',
//       '--disable-setuid-sandbox',
//       '--disable-gpu'
//     ]
//   });

//   const [page] = await browser.pages();

//   const client = await page.target().createCDPSession();
//   await client.send('Page.setDownloadBehavior', {
//     behavior: 'allow',
//     downloadPath: downloadPath,
//   });

//   return { browser, page };
// }
export async function closePopup(page) {
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
}

export async function chekKabinet(page) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  const popoverSelector = '.popover-module_fixReferenceSize__16BR';
  const kabinet = await page.waitForSelector(`${popoverSelector}`, { timeout: 5000 });
  // Log the element details to see what we're working with
  const kabinetDetails = await kabinet.evaluate(el => ({
    tagName: el.tagName,
    className: el.className,
    ariaExpanded: el.getAttribute('aria-expanded'),
    innerHTML: el.innerHTML
  }));
  console.log('Popover element details: 1', kabinetDetails);
  let kabinetTitle = await kabinet.evaluate(el => el.textContent);
  console.log('Text content:', kabinetTitle);

  return { kabinet, kabinetTitle };
}
export async function switchKabinet(page) {
  const popoverSelector = '.popover-module_fixReferenceSize__16BR';
  const kabinet = await page.waitForSelector(`${popoverSelector}`);
  // Log the element details to see what we're working with
  const kabinetDetails = await kabinet.evaluate(el => ({
    tagName: el.tagName,
    className: el.className,
    ariaExpanded: el.getAttribute('aria-expanded'),
    innerHTML: el.innerHTML
  }));
  console.log('Popover element details: 1', kabinetDetails);
  let kabinetTitle = await kabinet.evaluate(el => el.textContent);
  console.log('Text content:', kabinetTitle);

  return { kabinet, kabinetTitle };
}

export async function checkAndSwitchCabinet(page, targetName) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  const selectorCurrentCompany = 'span.index_companyItem_wgEhc';

  await page.waitForSelector(selectorCurrentCompany, { timeout: 5000 });
  const currentName = await page.$eval(selectorCurrentCompany, el => el.textContent.trim());

  if (currentName === targetName) {
    console.log(`✅ Уже находимся в кабинете "${targetName}"`);
    return;
  }

  console.log(`🔁 Переключаемся с "${currentName}" на "${targetName}"`);

  // Наводим мышку, чтобы открыть поповер (вместо клика)
  const companyElement = await page.$(selectorCurrentCompany);
  if (!companyElement) {
    throw new Error('❌ Не найден элемент компании');
  }

  await companyElement.hover();

  // Ждём появления выпадающего списка
  const dropdownOptionSelector = '.data-content-module_label__lf_x';
  await page.waitForSelector(dropdownOptionSelector, { timeout: 5000 });

  const options = await page.$$(dropdownOptionSelector);
  let found = false;

  for (const option of options) {
    const text = await page.evaluate(el => el.textContent.trim(), option);
    if (text === targetName) {
      await option.hover(); // наведём мышку, чтобы не исчезло
      await option.click();
      found = true;
      break;
    }
  }

  if (!found) {
    throw new Error(`❌ Компания "${targetName}" не найдена в списке`);
  }

  // Ждём перехода
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  console.log(`✅ Переключение на "${targetName}" успешно`);
}

export async function clickUntilPopoverOpens(page) {
  const containerSelector = '.index_buttons_GAN3c';
  const popoverSelector = '.popover-module_fixReferenceSize__16BR';
  const buttonText = 'Скачать отчёт';

  await page.waitForSelector(containerSelector);

  // Find the specific popover within the container
  const target = await page.waitForSelector(`${containerSelector} ${popoverSelector}`);
  let ariaExpanded = await target.evaluate(el => el.getAttribute('aria-expanded'));

  // Log the element details to see what we're working with
  const elementDetails = await target.evaluate(el => ({
    tagName: el.tagName,
    className: el.className,
    ariaExpanded: el.getAttribute('aria-expanded'),
    innerHTML: el.innerHTML
  }));
  console.log('Popover element details: 1', elementDetails);

  while (ariaExpanded !== 'true') {
    await target.click();
    let ariaExpanded = await target.evaluate(el => el.getAttribute('aria-expanded'));
    if (ariaExpanded === 'true') {
      return;
    }
  }

  console.log('✅ Попап открыт (aria-expanded="true")');
}


export async function pressAndSaveFile(page, kabinetTitle) {
  try {
    const newkabinetTitle = kabinetTitle.replace(/[\\/:*?"<>|.]/g, '_');
    console.log('ИМЯ КАБИНЕТА ПРИ ЗАПИСИ: ', newkabinetTitle);

    const downloadPath = path.resolve('./downloads');
    const beforeFiles = new Set(fs.readdirSync(downloadPath));

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

    // Ждём появления нового файла
    const waitForDownload = async () => {
      const timeout = Date.now() + 30000; // 30 сек таймаут
      while (Date.now() < timeout) {
        const currentFiles = fs.readdirSync(downloadPath);
        const newFiles = currentFiles.filter(file => file.endsWith('.xlsx') && !beforeFiles.has(file));

        if (newFiles.length > 0) {
          const downloadedFileName = newFiles[0];
          const fullPath = path.join(downloadPath, downloadedFileName);

          // Проверяем, доступен ли файл для записи
          try {
            fs.accessSync(fullPath, fs.constants.R_OK | fs.constants.W_OK);
            return downloadedFileName;
          } catch (e) {
            // Файл занят, подождём
          }
        }

        await new Promise(res => setTimeout(res, 500));
      }
      throw new Error('Файл так и не стал доступен для переименования');
    };

    const downloadedFileName = await waitForDownload();

    const fileExt = path.extname(downloadedFileName);
    const baseName = downloadedFileName.replace(fileExt, '');
    const newFileName = `${baseName}_${newkabinetTitle}${fileExt}`;

    fs.renameSync(
      path.join(downloadPath, downloadedFileName),
      path.join(downloadPath, newFileName)
    );

    console.log('✅ Отчёт успешно загружен:', newFileName);
  } catch (err) {
    console.log('❌ Ошибка при загрузке отчёта:', err.message);
  }
}


