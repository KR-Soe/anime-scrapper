const puppeteer = require('puppeteer');
const { validateCaptcha } = require('./../utils/validateCaptcha');

const reanimatePage = async (page, url) => {
  const waitOptions = { waitUntil: ['networkidle0', 'domcontentloaded', 'load'] };
  const reloadPromise = new Promise(resolve => {
    setTimeout(() => {
      resolve(page.reload(url, waitOptions))
    }, 60000)
  });

  const shouldReload = await reloadPromise;
  return shouldReload;
}

const getPdpData = async (page, currentAnime, dbAnime) => {
  const networkOptions = { waitUntil: ['networkidle0', 'domcontentloaded', 'load'] };
  console.log('fetching characters data from...', currentAnime);
  await page.goto(`${currentAnime}/characters`, networkOptions);

  // reanimatePage(page, `${currentAnime}/characters`);

  try {
    await validateCaptcha(page);
  } catch (error) {
    await page.reload(`${currentAnime}/characters`, networkOptions);
  }

  const characterInfo = await page.evaluate(() => {
    const animeGenreSelector = Array.from(document.querySelectorAll('span[itemprop="genre"]')).map(data => data.textContent);
    const animePortraitSelector = document.querySelector('tr > .borderClass img') || false;
    return Array.from(document.querySelectorAll('.js-anime-character-table .borderClass > div.spaceit_pad > a'))
      .map(a => ({ 
          name: a.textContent.replace(',', ''),
          url: `${a.href}/pictures`,
          genres: animeGenreSelector ,
          animeImage: animePortraitSelector ? animePortraitSelector.src : 'Not Founded'
        })
      );
  });
  
  console.log(`${characterInfo.length} CHARACTERS DETECTED`);
  
  for(let i = 0; i < characterInfo.length; i++) {
    try {
      await page.goto(characterInfo[i].url, networkOptions);

    // reanimatePage(page, characterInfo[i].url);
  
      try {
        await validateCaptcha(page);
        await page.waitForFunction('document.querySelector("td.borderClass > a").textContent');
      } catch (error) {
        await page.reload(characterInfo[i].url, networkOptions);
      }

      const { images, animeName, characterId } = await page.evaluate(() => {
        const animeName = document.querySelector('td.borderClass > a').textContent;
        const images = Array.from(document.querySelectorAll('.js-picture-gallery')).map(a => a.href);
        const characterId = window.location.href.split('/')[4];
        return { images, animeName, characterId };
      });

        const data = {
          ...characterInfo[i],
          images,
          animeName,
          characterId: Number.parseInt(characterId)
        };

        const isDuplicated = await dbAnime.collection('characters').findOne({ characterId: data.characterId, name: data.name });

        if(!isDuplicated && data.images.length > 0) {
          dbAnime.collection('characters').insertOne(data)
          console.log(`${data.name} inserted`);
        } else {
          console.log(`skipping duplicated:: ${data.name}`);
        }
      }
      catch (error) {
        await page.reload(characterInfo[i].url, networkOptions);
      }
    }
    
}

module.exports = { getPdpData };
