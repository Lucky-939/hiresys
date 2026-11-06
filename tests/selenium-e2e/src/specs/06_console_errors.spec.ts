import { WebDriver } from "selenium-webdriver";
import { expect } from "chai";
import { DriverFactory } from "../utils/driverFactory";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ConsoleValidator } from "../utils/consoleValidator";

describe("Browser Console Error Assertions (Clean Execution Guarantee)", function () {
  this.timeout(60000);
  let driver: WebDriver;
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  before(async () => {
    driver = await DriverFactory.createDriver();
    loginPage = new LoginPage(driver);
    dashboardPage = new DashboardPage(driver);
  });

  after(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  it("TC_CONSOLE_01: Should load /login with ZERO severe JavaScript errors", async () => {
    await loginPage.open();
    // Allow React scripts & assets to fully mount
    await driver.sleep(1000);

    // Assert zero SEVERE console errors on login load
    await ConsoleValidator.assertNoConsoleErrors(driver, "HireSys Login Page (/login)");
  });

  it("TC_CONSOLE_02: Should load /dashboard with ZERO unhandled JavaScript errors", async () => {
    // Navigate to dashboard (redirect flow)
    await dashboardPage.open();
    await driver.sleep(1000);

    // Verify no unhandled JavaScript runtime exceptions (ignoring benign expected auth redirects)
    const errors = await ConsoleValidator.getConsoleErrors(driver, [
      /401/i,
      /unauthorized/i,
      /favicon\.ico/i,
      /react-devtools/i,
    ]);

    expect(errors.length).to.equal(
      0,
      `Detected unhandled JavaScript runtime errors on dashboard load:\n${JSON.stringify(errors, null, 2)}`
    );
  });
});

