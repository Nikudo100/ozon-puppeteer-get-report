const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { pressAndSaveFile, clickUntilPopoverOpens, handleCookies, closePopup, initializeBrowser } = require('./func');


const COOKIE_PATH = path.resolve(__dirname, 'cookies.json');

async function main() {

  initializeBrowser()

  await page.goto('https://seller.ozon.ru/app/finances/warehousing-cost', {
    waitUntil: 'networkidle2',
  });

  handleCookies(page, COOKIE_PATH)

  closePopup(page)

  await clickUntilPopoverOpens(page);

  pressAndSaveFile(page);
}

main().catch(console.error);
