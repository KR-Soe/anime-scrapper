const validateCaptcha = async page => {
  try {
    await page.waitForSelector('.g-recaptcha' , { timeout: 500 });
    console.log('!!!!! CAPTCHA DETECTED !!!!!')

    await page.click('.g-recaptcha');
    console.log('clicked..')
    await page.waitForNavigation();
    console.log('waiting...')
    return new Promise((resolve) => {
      setTimeout(resolve, 5000)
    });
  } catch {
  }
};

module.exports = { validateCaptcha };