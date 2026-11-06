import { By } from "selenium-webdriver";
import { BasePage } from "./BasePage";
import { WaitHelpers } from "../utils/waitHelpers";

export class DashboardPage extends BasePage {
  // Navigation locators
  private navDashboard = By.css('a[href="/dashboard"]');
  private navCandidates = By.css('a[href="/dashboard/candidates"]');
  private navInterviews = By.css('a[href="/dashboard/interviews"]');
  private navMembers = By.css('a[href="/dashboard/members"]');
  private navCodingRooms = By.css('a[href="/dashboard/coding-rooms"]');
  private navResume = By.css('a[href="/dashboard/resume"]');

  public async open(): Promise<void> {
    await this.navigateTo("/dashboard");
  }

  public async isLoaded(): Promise<boolean> {
    return await WaitHelpers.waitForUrlContains(this.driver, "/dashboard");
  }

  public async clickInterviews(): Promise<void> {
    await this.click(this.navInterviews);
  }

  public async clickCandidates(): Promise<void> {
    await this.click(this.navCandidates);
  }

  public async clickTeamMembers(): Promise<void> {
    await this.click(this.navMembers);
  }

  public async isNavVisible(): Promise<boolean> {
    try {
      const el = await this.find(this.navDashboard, 5000);
      return await el.isDisplayed();
    } catch {
      return false;
    }
  }
}

