import { WebDriver } from "selenium-webdriver";
import { expect } from "chai";
import { DriverFactory } from "../utils/driverFactory";
import { DashboardPage } from "../pages/DashboardPage";
import { LoginPage } from "../pages/LoginPage";
import { WaitHelpers } from "../utils/waitHelpers";

describe("HireSys RBAC & Security Access Tests (Selenium WebDriver)", function () {
  this.timeout(60000);
  let driver: WebDriver;
  let dashboardPage: DashboardPage;
  let loginPage: LoginPage;

  before(async () => {
    driver = await DriverFactory.createDriver();
    dashboardPage = new DashboardPage(driver);
    loginPage = new LoginPage(driver);
  });

  after(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  it("TC_RBAC_01 [Negative / Security]: Unauthenticated user accessing /dashboard must be redirected to /login", async () => {
    // Clear cookies & storage to ensure unauthenticated state
    await driver.get("http://localhost:3000/login");
    await driver.manage().deleteAllCookies();
    await driver.executeScript("window.localStorage.clear(); window.sessionStorage.clear();");

    // Attempt direct navigation to protected dashboard route
    await dashboardPage.open();

    // Verify redirect occurred
    await WaitHelpers.waitForUrlContains(driver, "/login", 10000);
    const finalUrl = await driver.getCurrentUrl();
    expect(finalUrl).to.include("/login");
  });

  it("TC_RBAC_02 [Negative / Security]: Unauthenticated user accessing /dashboard/members (Org Team) must be redirected to /login", async () => {
    await driver.get("http://localhost:3000/dashboard/members");

    await WaitHelpers.waitForUrlContains(driver, "/login", 10000);
    const finalUrl = await driver.getCurrentUrl();
    expect(finalUrl).to.include("/login");
  });
});

