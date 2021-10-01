const validateCaptcha = async page => {
  try {
    await page.waitForSelector('.g-recaptcha' , { timeout: 500 });
    console.log('!!!!! CAPTCHA DETECTED !!!!!')

    await page.click('.g-recaptcha');
    console.log('clicked..')
    await page.waitForNavigation();
    console.log('waiting...')
    return 5000;
  } catch {
    return 0;
  }
};

module.exports = { validateCaptcha };