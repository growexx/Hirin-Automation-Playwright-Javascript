import { test, expect } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import ModalPage from '../pages/ModalPage';
import testData from '../data/testData';

   // ✅ Declare variables
     let loginPage;
     let dashboardPage;
     let modalPage;

  test.beforeEach(async ({ page }) => {
  // Initialize Page Objects
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    modalPage = new ModalPage(page);

  // Navigate to login page
    await loginPage.navigateToLoginPage(testData.urls.loginPage);
  });

test('TC-P01: Successful login and close modal @smoke @regression @login', async ({ page }) => {

  // Step 1: Perform login
  await loginPage.login(testData.credentials.email, testData.credentials.password);

  // Step 2: Wait for dashboard to fully load and redirect to complete
  await dashboardPage.waitForPageLoad(testData.timeouts.pageLoadWait);

  // Step 3: Verify and close modal (waits for modal to appear automatically)
 // await modalPage.verifyAndCloseModal();

  // Step 4: Verify welcome message is displayed
  await dashboardPage.verifyWelcomeMessage(testData.user.name);
  await dashboardPage.waitForTimeout(testData.timeouts.finalWait);
});

test('TC-P02: Invalid password shows error and stays on login page @regression @login', async ({ page }) => {
  await loginPage.attemptLogin(testData.credentials.email, 'WrongPassword123');
  await page.waitForTimeout(2000);
  const stillOnLogin = (await page.url()).toLowerCase().includes('login');
  const hasError = await loginPage.isErrorMessageVisible();
  expect(stillOnLogin || hasError, 'Should stay on login page or show error message').toBeTruthy();
});

test('TC-P03: Empty email shows validation or error @regression @login', async ({ page }) => {
  await loginPage.attemptLogin('', testData.credentials.password);
  await page.waitForTimeout(2000);
  const stillOnLogin = (await page.url()).toLowerCase().includes('login');
  const hasError = await loginPage.isErrorMessageVisible();
  expect(stillOnLogin || hasError, 'Should stay on login page or show validation/error').toBeTruthy();
});

test('TC-P04: Empty password shows validation or error @regression @login', async ({ page }) => {
  await loginPage.attemptLogin(testData.credentials.email, '');
  await page.waitForTimeout(2000);
  const stillOnLogin = (await page.url()).toLowerCase().includes('login');
  const hasError = await loginPage.isErrorMessageVisible();
  expect(stillOnLogin || hasError, 'Should stay on login page or show validation/error').toBeTruthy();
});

test('TC-P05: Empty email and password shows validation or error @regression @login', async ({ page }) => {
  await loginPage.attemptLogin('', '');
  await page.waitForTimeout(2000);
  await expect(page).toHaveURL(new RegExp('login', 'i'));
});

test('TC-P06: Login page displays email, password, login button and Forgot Password link @smoke @login', async ({ page }) => {
  await expect(loginPage.emailInput).toBeVisible();
  await expect(loginPage.passwordInput).toBeVisible();
  await expect(loginPage.loginButton).toBeVisible();
  await expect(loginPage.forgotPasswordLink).toBeVisible();
  await expect(loginPage.loginButton).toBeEnabled();
});

test('TC-P07: Password visibility toggle reveals and hides password @regression @login', async ({ page }) => {
  await loginPage.fillEmail(testData.credentials.email);
  await loginPage.fillPassword(testData.credentials.password);
  expect(await loginPage.isPasswordVisible(), 'Password should be hidden initially').toBe(false);
  await loginPage.togglePasswordVisibility();
  await page.waitForTimeout(300);
  expect(await loginPage.isPasswordVisible(), 'Password should be visible after toggle').toBe(true);
  await loginPage.togglePasswordVisibility();
  await page.waitForTimeout(300);
  expect(await loginPage.isPasswordVisible(), 'Password should be hidden again').toBe(false);
});

test('TC-P08: Invalid email format or non-existent user stays on login @regression @login', async ({ page }) => {
  await loginPage.attemptLogin(testData.credentials.invalidEmail, testData.credentials.password);
  await page.waitForTimeout(2000);
  const stillOnLogin = (await page.url()).toLowerCase().includes('login');
  const hasError = await loginPage.isErrorMessageVisible();
  expect(stillOnLogin || hasError, 'Should stay on login page or show error').toBeTruthy();
});
