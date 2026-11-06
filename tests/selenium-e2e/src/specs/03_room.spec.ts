import { WebDriver } from "selenium-webdriver";
import { expect } from "chai";
import { DriverFactory } from "../utils/driverFactory";
import { InterviewRoomPage } from "../pages/InterviewRoomPage";

describe("HireSys Collaborative Room Tests (Selenium WebDriver)", function () {
  this.timeout(60000);
  let driver: WebDriver;
  let roomPage: InterviewRoomPage;

  before(async () => {
    driver = await DriverFactory.createDriver();
    roomPage = new InterviewRoomPage(driver);
  });

  after(async () => {
    if (driver) {
      await driver.quit();
    }
  });

  it("TC_ROOM_01: Should navigate to interview room and attempt editor initialization", async () => {
    // Open a sample or dummy interview room
    await roomPage.openRoom("sample-test-room-id");

    const currentUrl = await roomPage.getCurrentUrl();
    expect(currentUrl).to.include("/room/");
  });
});

