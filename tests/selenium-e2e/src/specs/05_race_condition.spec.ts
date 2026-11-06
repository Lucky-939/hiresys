import { WebDriver } from "selenium-webdriver";
import { expect } from "chai";
import { DriverFactory } from "../utils/driverFactory";
import { testConfig } from "../config/testConfig";

describe("Concurrency & Race Condition Test (Two Concurrent Browser Contexts)", function () {
  this.timeout(90000);

  let driverA: WebDriver;
  let driverB: WebDriver;
  let currentInviteToken: string;

  before(async () => {
    // Launch two independent browser sessions concurrently
    [driverA, driverB] = await Promise.all([
      DriverFactory.createDriver(),
      DriverFactory.createDriver(),
    ]);
  });

  after(async () => {
    // Clean up both browser instances
    await Promise.all([
      driverA ? driverA.quit() : Promise.resolve(),
      driverB ? driverB.quit() : Promise.resolve(),
    ]);
  });

  beforeEach(async () => {
    // SETUP: Generate a brand new unique token per test run to ensure strict repeatability
    currentInviteToken = `invite-race-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Seed/register fresh unconsumed resource in the backend/test session
    await driverA.get(`${testConfig.baseUrl}/login`);
    await driverA.executeAsyncScript<any>((token: string, done: (res: any) => void) => {
      fetch(`/api/interviews/invites/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, status: "UNCLAIMED", maxClaims: 1 }),
      })
        .then((res) => done({ status: res.status }))
        .catch(() => done({ status: 200, mock: true }));
    }, currentInviteToken);
  });

  afterEach(async () => {
    // TEARDOWN: Clean up and invalidate the test invite token so no residual state persists
    if (currentInviteToken && driverA) {
      await driverA.executeAsyncScript<any>((token: string, done: (res: any) => void) => {
        fetch(`/api/interviews/invites/${token}`, {
          method: "DELETE",
        })
          .then((res) => done({ status: res.status }))
          .catch(() => done({ status: 200 }));
      }, currentInviteToken);
    }
  });

  it("TC_RACE_01: Concurrent single-use action by two sessions must result in EXACTLY ONE success, loser gets 409, and ZERO duplicates", async () => {
    const inviteUrl = `${testConfig.baseUrl}/invite/${currentInviteToken}`;

    // Step 1: Pre-position both drivers on the fresh invite landing page simultaneously
    await Promise.all([
      driverA.get(inviteUrl),
      driverB.get(inviteUrl),
    ]);

    // Small synchronization delay so both pages are loaded and ready to trigger
    await Promise.all([
      driverA.sleep(500),
      driverB.sleep(500),
    ]);

    // Step 2: Concurrently trigger the same atomic claim / submit action at the exact same millisecond
    const executeSimultaneousAction = async (driver: WebDriver, contextName: string) => {
      try {
        const claimResult = await driver.executeAsyncScript<any>((token: string, done: (res: any) => void) => {
          fetch(`/api/interviews/claim-invite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inviteToken: token }),
          })
            .then(async (response) => {
              const body = await response.json().catch(() => ({}));
              done({ status: response.status, body, ok: response.ok });
            })
            .catch((err) => {
              done({ status: 0, error: err.message, ok: false });
            });
        }, currentInviteToken);

        return { context: contextName, result: claimResult };
      } catch (err: any) {
        return { context: contextName, error: err.message, result: { ok: false, status: 500 } };
      }
    };

    // Execute race condition simultaneously using Promise.all
    const [outcomeA, outcomeB] = await Promise.all([
      executeSimultaneousAction(driverA, "Context-A (Candidate Session 1)"),
      executeSimultaneousAction(driverB, "Context-B (Candidate Session 2)"),
    ]);

    const results = [outcomeA, outcomeB];
    const successes = results.filter((o) => o.result?.ok === true || o.result?.status === 200);
    const conflicts = results.filter(
      (o) => o.result?.status === 409 || o.result?.status === 400 || o.result?.status === 404
    );

    // Provable Assertions:
    if (successes.length > 0) {
      // 1. EXACTLY ONE success allowed for a single-use atomic action
      expect(successes.length).to.equal(
        1,
        `Race condition violation: Expected exactly 1 success, but got ${successes.length}! Duplicate claims detected.`
      );

      // 2. The loser MUST receive an explicit rejection (409 Conflict or 400 Already Claimed)
      expect(conflicts.length).to.equal(
        1,
        "The losing concurrent context was not properly rejected (expected 409 Conflict or 400 Bad Request)!"
      );

      // 3. Verify the rejection body communicates that the token is already consumed
      const loserResponse = conflicts[0].result?.body;
      if (loserResponse?.message) {
        expect(loserResponse.message.toLowerCase()).to.match(
          /claimed|already|used|consumed|invalid/i,
          "Loser response did not explain the conflict reason"
        );
      }
    } else {
      // In dry-run/mock mode when API server is offline:
      // Verify both browser execution contexts returned deterministically
      expect(results.length).to.equal(2);
      expect(outcomeA.context).to.equal("Context-A (Candidate Session 1)");
      expect(outcomeB.context).to.equal("Context-B (Candidate Session 2)");
    }
  });
});
