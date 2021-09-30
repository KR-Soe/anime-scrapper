const { createConnection } = require('./../utils/connection.js');
const puppeteer = require('puppeteer');
const { requestInterception } = require('./../utils/requestInterception.js');

const createBrowser = async (slowMo = 0, headless = true, devtools = false) => {
  const options = { headless , slowMo, devtools };
  const browser = await puppeteer.launch(options);
  
  return browser;
};

const run = async () => {  
  const conn = await createConnection();
  const browser = await createBrowser(200, false);
  const animeUrls = await getUrls(browser);
  await uploadCharacterData(animeUrls, browser, conn);
};

const getUrls = async (browser) => {
  const page = await browser.newPage();
  const baseUrl = 'https://myanimelist.net/topanime.php?limit=0';
  const shouldIgnore = ['script', 'stylesheet', 'font', 'media', 'image'];
  await requestInterception(page, shouldIgnore);
  await page.goto(baseUrl);

  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('.hoverinfo_trigger.fl-l.ml12.mr8')).map(a => a.href);
  });
};

const uploadCharacterData = async (animeList, browser, conn) => {
  const page = await browser.newPage();
  const dbAnime = conn.db('anime');

  for(let i = 0; i < animeList.length; i++) {
    console.log('fetching characters data from...', animeList[i]);
    await page.goto(`${animeList[i]}/characters`);

    try {
      console.log('Searching captcha submit');
      await page.waitForSelector('.g-recaptcha' , { timeout: 500 });
      await page.click('.g-recaptcha');
      await page.waitForNavigation();
    } catch {}

    const characterInfo = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.borderClass.bgColor2 > .spaceit_pad > a'))
        .map(a => ({ name: a.textContent, url: `${a.href}/pictures` }));
    });

    for(let j = 0; j < characterInfo.length; j++) {
      await page.goto(characterInfo[j].url);

      try {
        console.log('Searching captcha submit');
        await page.waitForSelector('.g-recaptcha' , { timeout: 500 });
        await page.click('.g-recaptcha');
        await page.waitForNavigation();
      } catch  {}


      console.log('Im here after captcha click');
      const images = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.js-picture-gallery')).map(a => a.href);
      });

      characterInfo[j].images = images;
      const isDuplicated = await dbAnime.collection('characters').findOne({name: characterInfo[j].name});
      
      !isDuplicated ? (
        dbAnime.collection('characters').insertOne(characterInfo[j])
       ) : 
        console.log('isDuplicated', true);
    }
  }

  dbAnime.close();
};


module.exports = { run };