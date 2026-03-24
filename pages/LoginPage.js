import { expect } from '@playwright/test';

class LoginPage {
  /**
   * Initialize LoginPage with Playwright page object
   * @param {Page} page - Playwright page instance
   */
  constructor(page) {
    this.page = page;

    // Locators
    this.emailInput = page.getByTestId('EMAIL_INPUT');
    this.passwordInput = page.getByTestId('PASSWORD_INPUT');
    this.loginButton = page.getByTestId('LOGIN_BTN');
    this.forgotPasswordLink = page.getByText('Forgot Password?');
    // Ant Design Input.Password: toggle is .anticon inside password form item (no data-testid on app)
    this.passwordVisibilityToggle = page
      .locator('.ant-form-item.password-item .anticon')
      .first();
  }

  /**
   * Navigate to the login page
   */
  async navigateToLoginPage(url) {
    await this.page.goto(url);
  }

  /**
   * Fill email input field
   * @param {string} email - Email address to enter
   */
  async fillEmail(email) {
    await this.emailInput.click();
    await this.emailInput.fill(email);
  }

  /**
   * Fill password input field
   * @param {string} password - Password to enter
   */
  async fillPassword(password) {
    await this.passwordInput.click();
    await this.passwordInput.fill(password);
  }

  /**
   * Click the login button
   */
  async clickLoginButton() {
    await this.loginButton.click();
  }

  /**
   * Perform complete login flow
   * @param {string} email - Email address
   * @param {string} password - Password
   */
  async login(email, password) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLoginButton();
    await this.page.waitForNavigation();
  }

  /**
   * Attempt login without waiting for navigation (for error scenarios)
   * @param {string} email - Email address
   * @param {string} password - Password
   */
  async attemptLogin(email, password) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLoginButton();
  }

  /**
   * Clear email input field
   */
  async clearEmail() {
    await this.emailInput.clear();
  }

  /**
   * Clear password input field
   */
  async clearPassword() {
    await this.passwordInput.clear();
  }

  /**
   * Get email input value
   * @returns {Promise<string>} - Email value
   */
  async getEmailValue() {
    return await this.emailInput.inputValue();
  }

  /**
   * Get password input value
   * @returns {Promise<string>} - Password value
   */
  async getPasswordValue() {
    return await this.passwordInput.inputValue();
  }

  /**
   * Check if email input is visible
   * @returns {Promise<boolean>} - Visibility status
   */
  async isEmailInputVisible() {
    return await this.emailInput.isVisible();
  }

  /**
   * Check if password input is visible
   * @returns {Promise<boolean>} - Visibility status
   */
  async isPasswordInputVisible() {
    return await this.passwordInput.isVisible();
  }

  /**
   * Check if login button is visible
   * @returns {Promise<boolean>} - Visibility status
   */
  async isLoginButtonVisible() {
    return await this.loginButton.isVisible();
  }

  /**
   * Check if login button is enabled
   * @returns {Promise<boolean>} - Enabled status
   */
  async isLoginButtonEnabled() {
    return await this.loginButton.isEnabled();
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility() {
    await this.passwordVisibilityToggle.click();
  }

  /**
   * Check if password is visible (text type) or hidden (password type)
   * @returns {Promise<boolean>} - True if password is visible
   */
  async isPasswordVisible() {
    const inputType = await this.passwordInput.getAttribute('type');
    return inputType === 'text';
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  /**
   * Wait for error message to appear
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForErrorMessage(timeout = 5000) {
    // Try multiple selectors for error message
    const errorSelectors = [
      this.page.locator('alert').first(),
      this.page.getByText(/invalid credentials/i).first(),
      this.page.getByText(/error/i).first(),
    ];

    for (const selector of errorSelectors) {
      try {
        await selector.waitFor({ state: 'visible', timeout: 2000 });
        return;
      } catch (e) {
        // Continue to next selector
      }
    }
    // If none found, wait for any alert
    await this.page.locator('alert').first().waitFor({ state: 'visible', timeout });
  }

  /**
   * Get error message text
   * @returns {Promise<string>} - Error message text
   */
  async getErrorMessage() {
    // Try to get error message from alert
    const alert = this.page.locator('alert').first();
    if (await alert.isVisible()) {
      const text = await alert.textContent();
      if (text) return text.trim();
    }
    // Fallback: look for error text anywhere on page
    const errorText = this.page.getByText(/invalid|error|required/i).first();
    if (await errorText.isVisible()) {
      return await errorText.textContent();
    }
    return '';
  }

  /**
   * Check if error message is visible
   * @returns {Promise<boolean>} - Visibility status
   */
  async isErrorMessageVisible() {
    const alert = this.page.locator('alert').first();
    if (await alert.isVisible()) return true;

    // Check for error text
    const errorText = this.page.getByText(/invalid credentials|error|required/i).first();
    return await errorText.isVisible().catch(() => false);
  }

  /**
   * Verify page URL contains login
   * @param {string} expectedUrl - Expected URL pattern
   */
  async verifyLoginPageUrl(expectedUrl) {
    await expect(this.page).toHaveURL(new RegExp(expectedUrl));
  }

  /**
   * Wait for page to load
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }
}

module.exports = LoginPage;

