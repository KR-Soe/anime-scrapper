const { run } = require('./scrapper');

const main = () => {
  const baseUrl = 'https://myanimelist.net/topanime.php?limit=@pageRange';
  
  run(baseUrl.replace('@pageRange', 400), 50);
  reverseBot(baseUrl);
}

const reverseBot = url => {
  const maxRange = 18850;
  const reverseUrl = url.replace('@pageRange', 11950);
  const jumpInterval = -50;

  run(reverseUrl, jumpInterval, maxRange);
}

main();