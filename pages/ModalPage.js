import { expect } from '@playwright/test';

class ModalPage {
  /**
   * Initialize ModalPage with Playwright page object
   * @param {Page} page - Playwright page instance
   */
  constructor(page) {
    this.page = page;

    // Iframe
    this.modalIframe = page.locator('iframe[title="Modal"]');
  }

  /**
   * Wait for the modal iframe to be visible
   * @param {number} timeout - Timeout in milliseconds (default: 10000)
   */
  async waitForModalToAppear(timeout = 10000) {
    await this.modalIframe.waitFor({ state: 'visible', timeout });
  }

  /**
   * Get the content frame of the modal iframe
   * @returns {FrameLocator} - The frame locator for modal content
   */
  getModalFrame() {
    return this.modalIframe.contentFrame();
  }

  /**
   * Verify congratulations message is visible
   */
  async verifyCongratulationsMessage() {
    const congratsLabel = this.getModalFrame().getByLabel('Congratulations !!!!');
    await expect(congratsLabel).toContainText('Congratulations !!!!');
  }

  /**
   * Click on the recruitment solution text
   */
  async clickRecruitmentSolutionText() {
    await this.getModalFrame().getByText('Your one stop solution for AI').click();
  }

  /**
   * Verify recruitment solution description is visible
   */
  async verifyRecruitmentSolutionDescription() {
    const recruitmentLabel = this.getModalFrame().getByLabel('Your one stop solution for AI');
    await expect(recruitmentLabel).toContainText('Your one stop solution for AI powered Recruitment !!!!');
  }

  /**
   * Verify close button is visible
   */
  async isCloseButtonVisible() {
    const closeButton = this.getModalFrame().getByRole('button', { name: 'Close Step' });
    return await closeButton.isVisible();
  }

  /**
   * Click the close button to close the modal
   */
  async closeModal() {
    const closeButton = this.getModalFrame().getByRole('button', { name: 'Close Step' });
    await closeButton.click();
  }

  /**
   * Perform complete modal verification and closure flow
   */
  async verifyAndCloseModal() {
    // Wait for modal iframe to appear before interacting
    await this.waitForModalToAppear();

    // Give the modal content time to fully render
    await this.page.waitForTimeout(1000);

    await this.verifyCongratulationsMessage();
    await this.clickRecruitmentSolutionText();
    await this.verifyRecruitmentSolutionDescription();
    await this.isCloseButtonVisible();
    await this.closeModal();
  }
}

module.exports = ModalPage;

