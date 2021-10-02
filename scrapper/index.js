const puppeteer = require('puppeteer');
const { validateCaptcha } = require('./../utils/validateCaptcha');
const { createConnection } = require('./../utils/connection.js');
const { requestInterception } = require('./../utils/requestInterception.js');
const { getPdpData } = require('./extractDetail');

const createBrowser = async (slowMo = 0, headless = true, devtools = false) => {
  const options = { headless , slowMo, devtools };
  const browser = await puppeteer.launch(options);
  
  return browser;
};

const run = async (baseUrl, urlJumpScale, range = 0) => {
  let dynamicUrl = baseUrl;
  const conn = await createConnection();
  const browser = await createBrowser(0, false);

  while(range != 9400) {
    const limitRange = dynamicUrl.split('limit=')[1];
    const page = await browser.newPage();
    const toIgnore = ['stylesheet', 'font', 'media'];
    await requestInterception(page, toIgnore);
    await page.setDefaultNavigationTimeout(0);

    console.log('FETCHING PAGE NUMER ====>>>', dynamicUrl);
    const animeUrls = await getUrls(page, dynamicUrl);
    await page.close();

    await uploadCharacterData(animeUrls, browser, conn);
    dynamicUrl = dynamicUrl.replace(`limit=${limitRange}`, `limit=${Number.parseInt(limitRange) + urlJumpScale}`);
    range = range + urlJumpScale;
  }
};

const getUrls = async (page, pageList) => {
  await page.goto(pageList);

  try {
    await validateCaptcha(page);
  } catch (error) {
    await page.reload(pageList);
  }

  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.hoverinfo_trigger.fl-l.ml12.mr8')).map(a => a.href);
  });
};

const uploadCharacterData = async (animeList, browser, conn) => {
  const dbAnime = conn.db('anime');

  for(let i = 0; i < animeList.length; i++) {
    const page = await browser.newPage();
    const currentAnime = animeList[i];
    const toIgnore = ['stylesheet', 'font', 'media'];
    await page.setDefaultNavigationTimeout(0);
    await requestInterception(page, toIgnore);


    await getPdpData(page, currentAnime, dbAnime);


    await page.close();
  }
};


module.exports = { run };