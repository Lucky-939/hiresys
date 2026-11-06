import { By } from "selenium-webdriver";
import { BasePage } from "./BasePage";

export class LoginPage extends BasePage {
  // Locators matching HireSys Login Page DOM
  private emailInput = By.css('input[type="email"]');
  private passwordInput = By.css('input[type="password"]');
  private submitButton = By.css('button[type="submit"]');
  private rememberMeCheckbox = By.css('input[type="checkbox"]');
  private errorMessage = By.xpath("//form/preceding-sibling::div[contains(@class, 'danger') or contains(@class, 'rounded')]");
  private registerLink = By.css('a[href*="/register"]');
  private forgotPasswordLink = By.css('a[href*="/forgot-password"]');

  public async open(): Promise<void> {
    await this.navigateTo("/login");
  }

  public async clearFields(): Promise<void> {
    const emailEl = await this.find(this.emailInput);
    await emailEl.clear();
    const passEl = await this.find(this.passwordInput);
    await passEl.clear();
  }

  public async enterEmail(email: string): Promise<void> {
    await this.type(this.emailInput, email);
  }

  public async enterPassword(password: string): Promise<void> {
    await this.type(this.passwordInput, password);
  }

  public async toggleRememberMe(): Promise<void> {
    await this.click(this.rememberMeCheckbox);
  }

  public async clickSubmit(): Promise<void> {
    await this.click(this.submitButton);
  }

  public async login(email: string, password: string): Promise<void> {
    await this.clearFields();
    if (email) await this.enterEmail(email);
    if (password) await this.enterPassword(password);
    await this.clickSubmit();
  }

  public async getErrorMessageText(): Promise<string> {
    const errorEl = await this.find(this.errorMessage, 5000);
    return await errorEl.getText();
  }

  public async isErrorMessageVisible(): Promise<boolean> {
    try {
      const errorEl = await this.find(this.errorMessage, 3000);
      return await errorEl.isDisplayed();
    } catch {
      return false;
    }
  }

  public async isEmailInputValid(): Promise<boolean> {
    const el = await this.find(this.emailInput);
    return await this.driver.executeScript<boolean>("return arguments[0].checkValidity();", el);
  }

  public async isPasswordInputValid(): Promise<boolean> {
    const el = await this.find(this.passwordInput);
    return await this.driver.executeScript<boolean>("return arguments[0].checkValidity();", el);
  }

  public async isSubmitButtonEnabled(): Promise<boolean> {
    const btn = await this.find(this.submitButton);
    return await btn.isEnabled();
  }
}
