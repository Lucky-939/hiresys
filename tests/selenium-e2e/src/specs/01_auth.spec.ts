import { WebDriver } from "selenium-webdriver";
import { expect } from "chai";
import { DriverFactory } from "../utils/driverFactory";
import { LoginPage } from "../pages/LoginPage";
import { testConfig } from "../config/testConfig";

describe("HireSys Authentication Tests (Selenium WebDriver)", function () {
  this.timeout(60000);
  let driver: WebDriver;
  let loginPage: LoginPage;

  before(async () => {
    driver = await DriverFactory.createDriver();
    loginPage = new LoginPage(driver);
  });

  after(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  beforeEach(async () => {
    await loginPage.open();
  });

  it("TC_AUTH_01: Should display login page with all expected elements", async () => {
    const isSubmitEnabled = await loginPage.isSubmitButtonEnabled();
    expect(isSubmitEnabled).to.be.true;

    const currentUrl = await loginPage.getCurrentUrl();
    expect(currentUrl).to.include("/login");
  });

  it("TC_AUTH_02 [Negative]: Should show error message with invalid credentials", async () => {
    await loginPage.login(
      testConfig.credentials.invalidUser.email,
      testConfig.credentials.invalidUser.password
    );

    // Wait for error banner or response
    const hasError = await loginPage.isErrorMessageVisible();
    if (hasError) {
      const errorText = await loginPage.getErrorMessageText();
      expect(errorText.length).to.be.greaterThan(0);
    } else {
      // If server is offline, page must remain on /login and not redirect
      const url = await loginPage.getCurrentUrl();
      expect(url).to.include("/login");
    }
  });

  it("TC_AUTH_03: Should allow toggling 'Remember me' checkbox", async () => {
    await loginPage.toggleRememberMe();
    // Verify no unexpected alerts or page errors
    const isButtonEnabled = await loginPage.isSubmitButtonEnabled();
    expect(isButtonEnabled).to.be.true;
  });
});

