const puppeteer = require('puppeteer');
const { validateCaptcha } = require('./../utils/validateCaptcha');
const { createConnection } = require('./../utils/connection.js');
const { requestInterception } = require('./../utils/requestInterception.js');

const createBrowser = async (slowMo = 0, headless = true, devtools = false) => {
  const options = { headless , slowMo, devtools };
  const browser = await puppeteer.launch(options);
  
  return browser;
};

const run = async (baseUrl, urlJumpScale, range = 0) => {
  let dynamicUrl = baseUrl;
  const conn = await createConnection();
  const browser = await createBrowser(100, false);
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0);

  while(range != 9400) {
    const limitRange = dynamicUrl.split('limit=')[1];
    console.log('getting data from list', dynamicUrl);
    const animeUrls = await getUrls(page, dynamicUrl);
    await uploadCharacterData(animeUrls, page, conn);
    dynamicUrl = dynamicUrl.replace(`limit=${limitRange}`, `limit=${Number.parseInt(limitRange) + urlJumpScale}`);
    range = range + urlJumpScale;
  }
};

const getUrls = async (page, pageList) => {
  await page.goto(pageList);

  try {
    const delay = await validateCaptcha(page);
    await page.waitFor(delay);
  } catch (error) {
    await page.goto(pageList);
  }

  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.hoverinfo_trigger.fl-l.ml12.mr8')).map(a => a.href);
  });
};

const uploadCharacterData = async (animeList, page, conn) => {
  const dbAnime = conn.db('anime');

  for(let i = 0; i < animeList.length; i++) {
    console.log('fetching characters data from...', animeList[i]);
    await page.goto(`${animeList[i]}/characters`, {waitUntil: 'networkidle0'});

    try {
      const delay = await validateCaptcha(page);
      await page.waitFor(delay);
    } catch (error) {
      await page.goto(`${animeList[i]}/characters`, {waitUntil: 'networkidle0'});
    }

    const characterInfo = await page.evaluate(() => {
      const characterSelector = '.js-anime-character-table .borderClass > div.spaceit_pad > a';
      return Array.from(document.querySelectorAll(characterSelector))
        .map(a => ({ name: a.textContent.replace(',', ''), url: `${a.href}/pictures` }));
    });
    
    console.log(`fetching ${characterInfo.length} characters`);

    for(let j = 0; j < characterInfo.length; j++) {
      await page.goto(characterInfo[j].url, {waitUntil: 'networkidle0'});

      try {
        const delay = await validateCaptcha(page);
        await page.waitFor(delay);
        await page.waitForFunction('document.querySelector("td.borderClass > a").textContent');
      } catch (error) {
        await page.goto(characterInfo[j].url, {waitUntil: 'networkidle0'});
      }

      const { images, animeName, characterId } = await page.evaluate(() => {
        const animeName = document.querySelector('td.borderClass > a').textContent;
        const images = Array.from(document.querySelectorAll('.js-picture-gallery')).map(a => a.href);
        const characterId = window.location.href.split('/')[4];
        return { images, animeName, characterId };
      });

      const data = {
        ...characterInfo[j],
        images,
        anime: animeName,
        characterId: Number.parseInt(characterId)
      };

      const isDuplicated = await dbAnime.collection('characters').findOne({characterId: data.characterId});
      
      if(!isDuplicated) {
        dbAnime.collection('characters').insertOne(data)
        console.log(`${data.name} inserted`);
      } else {
        console.log(`==> skipping duplicated:: ${data.name} <==`);
      }
    }
  }
};


module.exports = { run };