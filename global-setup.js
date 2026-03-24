const { chromium } = require('@playwright/test');
const fs = require('fs');

const BASE_URL = 'https://stgapp.hirin.ai/login';
const EMAIL = 'superadmin@yopmail.com';
const PASSWORD = 'Test@1234';

const STORAGE_STATE = 'storageState.json';

module.exports = async () => {
  if (fs.existsSync(STORAGE_STATE)) return;

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.getByTestId('EMAIL_INPUT').fill(EMAIL);
  await page.getByTestId('PASSWORD_INPUT').fill(PASSWORD);
  await page.getByTestId('LOGIN_BTN').click();
  await page.waitForNavigation();

  await context.storageState({ path: STORAGE_STATE });

  await browser.close();
};
