import {test,expect} from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import testData from '../data/testData';

let loginPage;
let forgotPasswordPage;

test.beforeEach(async ({page}) => {
    loginPage = new LoginPage(page);
    forgotPasswordPage = new ForgotPasswordPage(page);

    await loginPage.navigateToLoginPage(testData.urls.loginPage);
    await loginPage.waitForPageLoad();
});

test.describe('Forgot Password Functionality Tests', () => {

    test('TC-FP01: Navigate to Forgot Password from login page @regression @forgotPassword', async ({page}) => {
        await loginPage.clickForgotPassword();
        await forgotPasswordPage.waitForPageLoad();
        await expect(page).toHaveURL(/forgot-password/);
        const isHeadingVisible = await forgotPasswordPage.isForgotPasswordHeadingVisible();
        expect(isHeadingVisible).toBeTruthy();
        await page.waitForTimeout(3000);
    });

    test('TC-FP02: Forgot Password page displays email input and Send Link button @regression @forgotPassword', async ({page,}) => {
        await forgotPasswordPage.navigateToForgotPasswordPage(testData.urls.loginPage);
        await forgotPasswordPage.waitForPageLoad();
        await expect(forgotPasswordPage.emailInput).toBeVisible();
        await expect(forgotPasswordPage.sendLinkButton).toBeVisible();
        await expect(forgotPasswordPage.heading).toBeVisible();
        await page.waitForTimeout(3000);
    });

    test('TC-FP03: Submit with empty email shows validation message @regression @forgotPassword', async ({page}) => {
        await loginPage.clickForgotPassword();
        await forgotPasswordPage.waitForPageLoad();
        await forgotPasswordPage.clickSendLink();
        await expect(forgotPasswordPage.emailValidationMessage).toBeVisible();
        await expect(page).toHaveURL(/forgot-password/);
        await page.waitForTimeout(3000);
    });

    test('TC-FP04: Submit with valid registered email shows success state @smoke @regression @forgotPassword', async ({page}) => {
        await loginPage.clickForgotPassword();
        await forgotPasswordPage.waitForPageLoad();
        await forgotPasswordPage.submitForgotPassword(testData.credentials.email);
        await expect(forgotPasswordPage.linkSentHeading).toBeVisible({
            timeout: 15000
        });
        await expect(forgotPasswordPage.successAlert).toBeVisible();
    });

    test('TC-FP05: Submit with invalid email format - page responds validation) @regression @forgotPassword', async ({page,}) => {
        await forgotPasswordPage.navigateToForgotPasswordPage(testData.urls.loginPage);
        await forgotPasswordPage.waitForPageLoad();
        await forgotPasswordPage.submitForgotPassword(testData.credentials.invalidEmail);
        await page.waitForLoadState('networkidle');
        await expect(forgotPasswordPage.invalidEmailValidationMessage).toBeVisible();
        await expect(page).toHaveURL(/forgot-password/);
        await page.waitForTimeout(3000);
    });

});