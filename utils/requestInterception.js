const requestInterception = async (page, toIgnore) => {
  await page.setRequestInterception(true);

  page.on('request', req => {
    if(toIgnore.indexOf(req.resourceType()) !== -1) {
      req.abort();
    } else {
      req.continue();
    }
  });
};

module.exports = { requestInterception };
