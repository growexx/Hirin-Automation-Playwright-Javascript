import { expect } from '@playwright/test';

/**
 * Page Object for Forgot Password flow.
 * Covers the /forgot-password page and success state.
 */
class ForgotPasswordPage {
  /**
   * Initialize ForgotPasswordPage with Playwright page object
   * @param {import('@playwright/test').Page} page - Playwright page instance
   */
  constructor(page) {
    this.page = page;

    // Locators (data-testid from app: forgot-password-email, send-link-btn)
    this.emailInput = page.getByTestId('forgot-password-email');
    this.sendLinkButton = page.getByTestId('send-link-btn');
    // "Forgot Password" title is in a generic div, not a semantic heading
    this.heading = page.getByText('Forgot Password', { exact: true });
    this.linkSentHeading = page.getByRole('heading', { name: /link sent/i });
    this.successAlert = page.getByRole('alert').filter({ hasText: /success|reset password link/i });
    this.emailValidationMessage = page.getByText(/please enter your email/i);
    this.invalidEmailValidationMessage = page.getByText(/please enter a valid email/i);
    this.logoLink = page.getByRole('img', { name: /hirin-logo/i });
  }

  /**
   * Navigate to the forgot password page
   * @param {string} baseUrl - Base URL (e.g. from testData.urls.loginPage)
   */
  async navigateToForgotPasswordPage(baseUrl) {
    const url = baseUrl.replace(/\/?$/, '') + '/forgot-password';
    await this.page.goto(url);
  }

  /**
   * Fill the email input on forgot password form
   * @param {string} email - Email address to enter
   */
  async fillEmail(email) {
    await this.emailInput.click();
    await this.emailInput.fill(email);
  }

  /**
   * Click the Send Link button
   */
  async clickSendLink() {
    await this.sendLinkButton.click();
  }

  /**
   * Submit forgot password form with given email
   * @param {string} email - Email address to submit
   */
  async submitForgotPassword(email) {
    await this.fillEmail(email);
    await this.clickSendLink();
  }

  /**
   * Verify current URL is forgot password page
   */
  async verifyForgotPasswordPageUrl() {
    await expect(this.page).toHaveURL(/forgot-password/);
  }

  /**
   * Verify Forgot Password heading is visible
   * @returns {Promise<boolean>}
   */
  async isForgotPasswordHeadingVisible() {
    return await this.heading.isVisible();
  }

  /**
   * Verify "Link Sent" success heading is visible
   * @returns {Promise<boolean>}
   */
  async isLinkSentHeadingVisible() {
    return await this.linkSentHeading.isVisible();
  }

  /**
   * Verify success alert is visible
   * @returns {Promise<boolean>}
   */
  async isSuccessAlertVisible() {
    return await this.successAlert.isVisible();
  }

  /**
   * Verify email validation message is visible (e.g. "Please enter your email!")
   * @returns {Promise<boolean>}
   */
  async isEmailValidationMessageVisible() {
    return await this.emailValidationMessage.isVisible();
  }

    /**
   * Verify invalid email validation message is visible (e.g. "Please enter a valid email!")
   * @returns {Promise<boolean>}
   */
    async isInvalidEmailValidationMessageVisible() {
      return await this.invalidEmailValidationMessage.isVisible();
    }

  /**
   * Wait for page to be in idle state
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }
}

module.exports = ForgotPasswordPage;
