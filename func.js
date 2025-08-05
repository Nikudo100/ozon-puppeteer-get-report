// func.js
import iconv from 'iconv-lite';
import fetch from 'node-fetch';
import dayjs from 'dayjs';
import { SocksProxyAgent } from 'socks-proxy-agent';
import XLSX from 'xlsx'
import puppeteer from 'puppeteer';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

// Path to cookies file
// const COOKIES_FILE = new URL('cookies.json', import.meta.url).pathname;


// Функция для получения кода или данных из консоли
function askForInput(message) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(message, (input) => {
            rl.close();
            resolve(input);
        });
    });
}

// Функция для проверки наличия и загрузки куков
async function loadCookies() {
const COOKIES_FILE = path.resolve('./cookies.json');

  try {
        if (fs.existsSync(COOKIES_FILE)) {
            const cookiesString = fs.readFileSync(COOKIES_FILE, 'utf8');
            const cookies = JSON.parse(cookiesString);
            console.log(`Загружено ${cookies.length} куки из файла`);
            return cookies;
        }
    } catch (error) {
        console.error('Ошибка при загрузке куков:', error.message);
    }
    console.log('Файл с куками не найден или поврежден');
    return null;
}

// Функция для сохранения куков
export async function saveCookies(page) {
  const COOKIES_FILE = path.resolve('./cookies.json');
    try {
        const cookies = await page.cookies();
        fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
        console.log(`Сохранено ${cookies.length} куки в файл ${COOKIES_FILE}`);
    } catch (error) {
        console.error('Ошибка при сохранении куков:', error.message);
    }
}

// Функция для проверки успешности входа
async function checkLoginSuccess(page) {
  await page.screenshot({ path: './debug/checkLoginSuccess.png' });
    try {
        // Проверяем наличие текста "Ваш единый аккаунт на Ozon"
        const accountText = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, div, span'));
            for (const el of elements) {
                if (el.textContent && el.textContent.includes('Ваш единый аккаунт на Ozon')) {
                    return el.textContent;
                }
            }
            return '';
        });
        
        if (accountText) {
            console.log('Успешный вход! Обнаружен текст:', accountText);
            return true;
        }
        
        console.log('Текст "Ваш единый аккаунт на Ozon" не найден');
        return false;
    } catch (error) {
        console.error('Ошибка при проверке входа:', error.message);
        return false;
    }
}
export async function register() {
  const browser = await puppeteer.launch({
      headless: 'new',
      ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
      args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-infobars',
          '--window-position=0,0',
          '--ignore-certificate-errors',
          '--ignore-certificate-errors-spki-list',
          '--disable-blink-features=AutomationControlled',
          '--disable-accelerated-2d-canvas',
          '--hide-scrollbars',
          '--disable-notifications',
          '--disable-extensions',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials',
          // '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ]
  });

  const browserWSEndpoint = browser.wsEndpoint();
  console.log('Запущен Chromium из:', browser.process().spawnfile);
  try {
      let isLoggedIn = false;
      const page = await browser.newPage();
      
      // Эмуляция реального браузера
      await page.setExtraHTTPHeaders({
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      });

      await page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'webdriver', {
              get: () => false
          });
      });

      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      // Загружаем куки, если они есть
      const cookies = await loadCookies();
      
      if (cookies) {
          await page.setCookie(...cookies);
          console.log('Куки успешно установлены');
          console.log('Ждем 4 секунду после сохранением куков');
          await delay(4000); // Ждем секунду перед сохранением куков
          // Переходим на страницу и проверяем, авторизованы ли мы
          await page.goto('https://www.ozon.ru/ozonid', {
              // waitUntil: 'networkidle0',
              timeout: 30000
          });
          
          // Проверяем успешность входа
          isLoggedIn = await checkLoginSuccess(page);
          if (isLoggedIn) {
              console.log('Вход выполнен успешно с использованием сохраненных куков');
              // Обновляем куки после успешного входа
            
              await saveCookies(page);
              console.log('Ждем 2 секунду после сохранением куков');
              await delay(2000); // Ждем секунду перед сохранением куков
              return { browser, page }; // Возвращаем объекты для дальнейшей работы
          } else {
              console.log('Не удалось войти с использованием сохраненных куков, выполняем полную авторизацию');
          }
      }
      console.log('ждем 4 сек');
      await new Promise((resolve) => setTimeout(resolve, 4000)); // задержка 3 секунда
      // Если куки не помогли или их нет, выполняем полную авторизацию
      await page.goto('https://id.ozon.ru/ozonid', {
          waitUntil: 'networkidle0',
          timeout: 30000
      });

      await page.screenshot({ path: './debug/waitForSelectorLoging.png' });
      isLoggedIn = await checkLoginSuccess(page);
      if (isLoggedIn) {
          console.log('Вход выполнен успешно с использованием сохраненных куков');
          // Обновляем куки после успешного входа
        
          await saveCookies(page);
          console.log('Ждем 2 секунду после сохранением куков');
          await delay(2000); // Ждем секунду перед сохранением куков
          return { browser, page }; // Возвращаем объекты для дальнейшей работы
      } else {
          console.log('Не удалось войти с использованием сохраненных куков, выполняем полную авторизацию');
      }

      // Ждем загрузки селектора страны и кликаем
      await page.waitForSelector('.d45_3_2-a');
      await delay(Math.random() * 1000 + 500);
      await page.click('.d45_3_2-a');
      
      // Выбираем Россию (+7)
      await page.waitForSelector('div[role="listbox"]');
      await page.evaluate(() => {
          const items = Array.from(document.querySelectorAll('div[role="option"]'));
          const russia = items.find(item => item.textContent.includes('+7'));
          if (russia) russia.click();
      });
      await delay(Math.random() * 1000 + 500);
      
      // Ждем появления поля ввода телефона и кликаем на него
      await page.waitForSelector('input[type="tel"][name="autocomplete"]');
      await page.click('input[type="tel"][name="autocomplete"]');
      await delay(Math.random() * 300 + 200);

      // Вводим номер телефона по частям, как человек
      const phoneNumber = '953 10 10 521';
      const parts = phoneNumber.split(' ');
      for (const part of parts) {
          await page.keyboard.type(part, {delay: Math.random() * 100 + 50});
          await delay(Math.random() * 200 + 100);
      }

      await delay(Math.random() * 500 + 300);
      
      // Нажимаем кнопку "Войти"
      await page.click('button[type="submit"]');
      await delay(Math.random() * 1000 + 500);

      // Проверяем наличие QR-кода и обходим его при необходимости
      try {
          await page.waitForSelector('.bq02_4_0-a', { timeout: 5000 });
          console.log('Обнаружен QR-код, нажимаем "Войти другим способом"');
          await page.click('.ach4_47');
          await delay(Math.random() * 1000 + 500);
      } catch (e) {
          console.log('QR-код не обнаружен, продолжаем...');
      }

      // Проверяем, перенаправлены ли мы на страницу входа по почте
      try {
          const emailLoginText = await page.evaluate(() => {
              const headline = document.querySelector('.tsHeadline600Large');
              return headline ? headline.textContent : '';
          });

          if (emailLoginText.includes('Войдите по почте')) {
              console.log('Перенаправлено на вход по почте');
              
              // Запрашиваем почту из консоли
              const email = await askForInput('Введите почту: ');
              
              // Ждем появления поля для ввода почты и вводим её
              await page.waitForSelector('input[type="email"][name="email"]');
              await page.click('input[type="email"][name="email"]');
              await delay(Math.random() * 300 + 200);
              
              // Вводим почту с задержками между символами
              for (let i = 0; i < email.length; i++) {
                  await page.keyboard.type(email[i], {delay: Math.random() * 100 + 50});
                  if (i % 3 === 0) await delay(Math.random() * 100 + 50);
              }
              
              await delay(Math.random() * 500 + 300);
              
              // Нажимаем кнопку "Войти" для отправки кода на почту
              await page.click('button[type="submit"]');
              await delay(Math.random() * 1000 + 500);
          }
      } catch (e) {
          console.log('Страница входа по почте не обнаружена:', e.message);
      }

      // Запрашиваем код из консоли для телефона или почты
      let codeInputSelector;
      
      // Проверяем, какое поле для ввода кода появилось
      const otpSelector = 'input[type="number"][name="otp"]';
      const extraOtpSelector = 'input[type="number"][name="extraOtp"]';
      
      try {
          await Promise.race([
              page.waitForSelector(otpSelector, { timeout: 5000 }),
              page.waitForSelector(extraOtpSelector, { timeout: 5000 })
          ]);
          
          // Определяем, какое поле появилось
          const hasOtp = await page.$(otpSelector) !== null;
          const hasExtraOtp = await page.$(extraOtpSelector) !== null;
          
          if (hasOtp) {
              console.log('Обнаружено поле для ввода кода из СМС');
              codeInputSelector = otpSelector;
              const phoneCode = await askForInput('Введите код из СМС: ');
              await page.type(codeInputSelector, phoneCode, {delay: Math.random() * 100 + 50});
          } else if (hasExtraOtp) {
              console.log('Обнаружено поле для ввода кода из почты');
              codeInputSelector = extraOtpSelector;
              const emailCode = await askForInput('Введите код из почты: ');
              await page.type(codeInputSelector, emailCode, {delay: Math.random() * 100 + 50});
          }
          
          await delay(Math.random() * 1000 + 500);
      } catch (e) {
          console.log('Не удалось обнаружить поле для ввода кода:', e.message);
      }

      // Проверяем, появилась ли страница с подтверждением почты
      try {
          // Ждем появления текста о подтверждении почты
          await page.waitForSelector('.tsHeadline600Large', { timeout: 10000 });
          const headlineText = await page.evaluate(() => {
              const headline = document.querySelector('.tsHeadline600Large');
              return headline ? headline.textContent : '';
          });

          if (headlineText.includes('Давайте убедимся, что это вы')) {
              console.log('Требуется подтверждение почты');
              
              // Нажимаем кнопку "Войти" для отправки кода на почту
              await page.click('button[type="submit"]');
              await delay(Math.random() * 1000 + 500);
              
              // Ждем появления поля для ввода кода с почты
              await page.waitForSelector('input[type="number"][name="extraOtp"]');
              
              // Запрашиваем код из консоли для почты
              const emailCode = await askForInput('Введите код из почты: ');
              
              // Вводим код с почты
              await page.type('input[type="number"][name="extraOtp"]', emailCode, {delay: Math.random() * 100 + 50});
              await delay(Math.random() * 1000 + 500);
          }
      } catch (e) {
          console.log('Подтверждение почты не требуется или произошла ошибка:', e.message);
      }

      // Ждем завершения авторизации и перенаправления
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(e => {
          console.log('Ожидание перенаправления завершено с ошибкой:', e.message);
      });

      console.log('ждем 3 сек');
      await new Promise((resolve) => setTimeout(resolve, 3000)); // задержка 3 секунда
      // Переходим на страницу ozonid для проверки успешности входа
      await page.goto('https://www.ozon.ru/ozonid', {
          // waitUntil: 'networkidle0',
          // timeout: 30000
      });
      
   
      // Проверяем успешность входа
      isLoggedIn = await checkLoginSuccess(page);
      if (isLoggedIn) {
          console.log('Авторизация завершена успешно!');
          // Ждем секунду перед сохранением куков
          await delay(1000);
          // Сохраняем куки для последующего использования
          await saveCookies(page);
      } else {
          console.log('Авторизация не удалась, не обнаружен текст "Ваш единый аккаунт на Ozon"');
      }

      return { browser, page }; // Возвращаем объекты для дальнейшей работы

  } catch (error) {
      console.error('Произошла ошибка:', error);
      return { browser, page: null }; // Возвращаем browser и null вместо page в случае ошибки
  }
}

// // Функция для генерации случайной задержки
// const randomDelay = (min, max) => {
//   return Math.floor(Math.random() * (max - min + 1) + min);
// };

// // Функция для эмуляции человеческого ввода
// const typeHumanLike = async (page, selector, text) => {
//   await page.focus(selector);
//   for (let i = 0; i < text.length; i++) {
//       await page.keyboard.type(text[i]);
//       await page.waitForTimeout(randomDelay(50, 150));
//   }
// };

// export  async function register() {
//   const browser = await puppeteer.launch({
//     headless: 'new',
//     args: [
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--disable-infobars',
//         '--window-position=0,0',
//         '--ignore-certificate-errors',
//         '--ignore-certificate-errors-spki-list',
//         '--disable-blink-features=AutomationControlled',
//         '--disable-accelerated-2d-canvas',
//         '--hide-scrollbars',
//         '--disable-notifications',
//         '--disable-extensions',
//         '--disable-web-security',
//         '--disable-features=IsolateOrigins,site-per-process',
//         '--disable-site-isolation-trials',
//     ],
//   });

//   const page = await browser.newPage();

//   // Установка случайного User-Agent
//   const userAgents = [
//       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
//       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
//       'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
//   ];
//   await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);

//   // Установка дополнительных заголовков
//   await page.setExtraHTTPHeaders({
//       'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
//       'Accept-Encoding': 'gzip, deflate, br',
//       'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
//       'Connection': 'keep-alive',
//       'Upgrade-Insecure-Requests': '1',
//       'Sec-Fetch-Site': 'none',
//       'Sec-Fetch-Mode': 'navigate',
//       'Sec-Fetch-User': '?1',
//       'Sec-Fetch-Dest': 'document',
//   });

//   // Перезаписываем свойства webdriver
//   await page.evaluateOnNewDocument(() => {
//       delete Object.getPrototypeOf(navigator).webdriver;
//       // Подмена navigator.languages
//       Object.defineProperty(navigator, 'languages', {
//           get: () => ['ru-RU', 'ru', 'en-US', 'en'],
//       });
//       // Подмена navigator.plugins
//       Object.defineProperty(navigator, 'plugins', {
//           get: () => [
//               {
//                   0: {
//                       type: 'application/x-google-chrome-pdf',
//                       suffixes: 'pdf',
//                       description: 'Portable Document Format',
//                       enabledPlugin: true,
//                   },
//                   description: 'Chrome PDF Plugin',
//                   filename: 'internal-pdf-viewer',
//                   length: 1,
//                   name: 'Chrome PDF Plugin',
//               },
//           ],
//       });
//   });

//   try {
//       // Загрузка существующих cookies, если они есть
//       try {
//           const cookiesString = await fs.readFile('cookies.json');
//           const cookies = JSON.parse(cookiesString);
//           await page.setCookie(...cookies);
//       } catch (e) {
//           console.log('No saved cookies found');
//       }

//       await page.goto('https://id.ozon.ru/ozonid', {
//           waitUntil: 'networkidle0',
//           timeout: 60000
//       });

//       // Добавляем случайные движения мыши
//       await page.mouse.move(
//           randomDelay(0, 1920),
//           randomDelay(0, 1080),
//           { steps: randomDelay(10, 20) }
//       );

//       // Остальной код регистрации...

//       // Сохранение cookies после успешной авторизации
//       const cookies = await page.cookies();
//       await fs.writeFile('cookies.json', JSON.stringify(cookies, null, 2));

//       return { browser, page };
//   } catch (error) {
//       console.error('Error:', error);
//       await browser.close();
//       throw error;
//   }
// }




// // инициализация без прокси, остальные с прокси
// export async function initializeBrowser(proxy= null) {
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




// export async function initializeBrowser(proxy) {
//   const downloadPath = path.resolve('./downloads');
//   if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

//   const proxyUrl = `socks5://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
//   const agent = new SocksProxyAgent(proxyUrl);

//   const browser = await puppeteer.launch({
//     // headless: false,
//     args: ['--window-size=1400,800,`--proxy-server=socks5://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`,'],
//   });

//   const [page] = await browser.pages();

//   await page.setRequestInterception(true);

//   page.on('request', async (request) => {
//     const url = request.url();

//     try {
//       const response = await fetch(url, {
//         method: request.method(),
//         headers: request.headers(),
//         body: request.postData(),
//         agent,
//       });

//     const arrayBuffer = await response.arrayBuffer();
//     const buffer = Buffer.from(arrayBuffer);


//       request.respond({
//         status: response.status,
//         headers: Object.fromEntries(response.headers.entries()),
//         body: buffer,
//       });
//     } catch (err) {
//       console.error('Fetch proxy error:', err.message);
//       request.abort();
//     }
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
  await page.screenshot({ path: `./debug/before-${target}.png` });
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

    // Configure download behavior using CDP session
    const client = await page.createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath
    });

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

    // Wait for download to complete with improved file checking
    const waitForDownload = async () => {
      const timeout = Date.now() + 60000; // Increased timeout to 60 seconds
      
      while (Date.now() < timeout) {
        const currentFiles = fs.readdirSync(downloadPath);
        const newFiles = currentFiles.filter(file => {
          // Check for both .xlsx and .xlsx.crdownload files
          return (file.endsWith('.xlsx') || file.endsWith('.crdownload')) && !beforeFiles.has(file);
        });

        if (newFiles.length > 0) {
          const downloadingFile = newFiles[0];
          const fullPath = path.join(downloadPath, downloadingFile);

          // If file is still downloading (has .crdownload extension)
          if (downloadingFile.endsWith('.crdownload')) {
            await new Promise(res => setTimeout(res, 1000));
            continue;
          }

          // Wait for file to be fully written
          let retries = 10;
          while (retries > 0) {
            try {
              const stats = fs.statSync(fullPath);
              if (stats.size > 0) {
                // Try to open file to ensure it's not locked
                const fd = fs.openSync(fullPath, 'r');
                fs.closeSync(fd);
                return downloadingFile;
              }
            } catch (e) {
              // File might still be locked
            }
            await new Promise(res => setTimeout(res, 1000));
            retries--;
          }
        }
        await new Promise(res => setTimeout(res, 1000));
      }
      throw new Error('Превышено время ожидания загрузки файла');
    };

    const downloadedFileName = await waitForDownload();
    
    // Add delay before renaming
    await new Promise(res => setTimeout(res, 2000));

    const fileExt = path.extname(downloadedFileName);
    const baseName = downloadedFileName.replace(fileExt, '');
    const newFileName = `${baseName}_${newkabinetTitle}${fileExt}`;

    const oldPath = path.join(downloadPath, downloadedFileName);
    const newPath = path.join(downloadPath, newFileName);

    // Ensure old file exists and is accessible before renaming
    try {
      await fs.promises.access(oldPath, fs.constants.R_OK | fs.constants.W_OK);
      await fs.promises.rename(oldPath, newPath);
      console.log('✅ Отчёт успешно загружен и переименован:', newFileName);
    } catch (error) {
      console.error('Ошибка при переименовании файла:', error);
      throw error;
    }

  } catch (err) {
    console.log('❌ Ошибка при загрузке отчёта:', err.message);
    throw err;
  }
}

// Функция для преобразования дат из формата dd.mm.yyyy в yyyy-mm-dd
function formatDate(dateValue) {
  if (typeof dateValue === 'number') {
    const excelDate = Math.round((dateValue - 25569) * 86400 * 1000);
    const dateObj = new Date(excelDate);
    return dateObj.toISOString().slice(0, 10);
  }

  if (typeof dateValue === 'string') {
    const parts = dateValue.split(',').map(part => part.trim());
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  throw new Error(`Невозможно обработать дату: ${JSON.stringify(dateValue)}`);
}

// Вспомогательная функция для чтения существующих данных
// Вспомогательная функция для чтения существующих данных
function readExistingData(jsonPath) {
  try {
    const existingData = require(jsonPath);
    return existingData;
  } catch (error) {
    return {}; // Возвращаем пустой индекс, если файл не найден или пуст
  }
}

// Основная функция парсинга
export async function parseExcelToJson() {
  try {
    const directoryPath = './downloads';
    const directoryPathForSave = './json/';

    // Загружаем существующие данные
    const stickIndex = readExistingData(path.join(directoryPathForSave, 'Stick_data.json'));
    const diIndex = readExistingData(path.join(directoryPathForSave, 'Di_data.json'));

    // Списки для новых данных
    const newStickData = {};
    const newDiData = {};

    // Список всех файлов в директории
    const files = fs.readdirSync(directoryPath);

    // Обработка каждого файла
    for (const file of files) {
      if (path.extname(file) !== '.xlsx') continue;

      // Тип магазина определяется по названию файла
      const storeType = file.includes('_Stik_Store') ? 'stick' : 'di';
      const filePath = path.join(directoryPath, file);

      // Чтение файла
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Преобразование листа в массив объектов
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Обработка каждой строки
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        // Создание объекта с полями
        const parsedRow = {
          date: formatDate(row[0]),
          sku: row[1],
          article: row[2],
          category: row[3],
          warehouse: row[4],
          productSign: row[5],
          totalVolumeInMilliliters: Number(row[6]) || null,
          quantityOfItems: Number(row[7]) || null,
          paidVolumeInMilliliters: Number(row[8]) || null,
          numberPaidItems: Number(row[9]) || null,
          placementCost: Number(row[10]) || null
        };

        // Генерируем уникальный ключ
        const uniqueKey = `${parsedRow.date}|${parsedRow.sku}|${parsedRow.warehouse}`;

        // Проверяем существование записи
        if (
          (storeType === 'stick' && !stickIndex[uniqueKey]) ||
          (storeType === 'di' && !diIndex[uniqueKey])
        ) {
          console.log(`Новая запись обнаружена: ${uniqueKey}`);
          if (storeType === 'stick') {
            newStickData[uniqueKey] = parsedRow;
          } else {
            newDiData[uniqueKey] = parsedRow;
          }
        } else {
          console.log(`Пропущено дублирование: ${uniqueKey}`);
        }
      }
    }

    // Объединяем старые и новые данные
    const updatedStickData = { ...stickIndex, ...newStickData };
    const updatedDiData = { ...diIndex, ...newDiData };

    // Сохраняем объединённые данные обратно в JSON-файлы
    if (Object.keys(updatedStickData).length > 0) {
      fs.writeFileSync(
        path.join(directoryPathForSave, 'Stick_data.json'),
        JSON.stringify(updatedStickData, null, 2)
      );
      console.log('Данные для Stick дополнены и сохранены.');
    }

    if (Object.keys(updatedDiData).length > 0) {
      fs.writeFileSync(
        path.join(directoryPathForSave, 'Di_data.json'),
        JSON.stringify(updatedDiData, null, 2)
      );
      console.log('Данные для Di дополнены и сохранены.');
    }
  } catch (error) {
    console.error('Ошибка при обработке файлов:', error);
  }
}

