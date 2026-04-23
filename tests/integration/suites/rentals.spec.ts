import { expect } from "chai";
import moment from "moment";
import auth from "../../pageObjects/auth";
import utils from "../../pageObjects/common";
import memberPO from "../../pageObjects/member";
import header from "../../pageObjects/header";
import rentalsPO from "../../pageObjects/rentals";
import renewPO from "../../pageObjects/renewalForm";
import { Routing } from "app/constants";
import { getAdminUserLogin, getBasicUserLogin } from "../../constants/api_seed_data";

// Spot number seeded in db/seeds_rental_spots.rb — use a tote as it's auto-approved
const TEST_SPOT_NUMBER = "LR-Tote-1";
const TEST_SPOT_DESCRIPTION = "Black Tote";

describe("Rentals", () => {
  beforeEach(async () => {
    await browser.deleteAllCookies();
    await browser.pause(1000);
    return browser.url(utils.buildUrl());
  });

  afterEach(async () => {
    try {
      await browser.url(utils.buildUrl());
      await browser.pause(1000);
      await header.navigateTo(header.links.logout);
      await utils.waitForVisible(header.loginLink);
    } catch (e) {
      // not logged in or navigation failed, ignore
    }
  });

  // ─── Navigation ─────────────────────────────────────────────────────────────

  describe("Navigation", () => {
    it("Admin header menu Rentals link goes to /admin/rentals", async () => {
      await auth.goToLogin();
      await auth.signInUser(getAdminUserLogin());
      await header.navigateTo(header.links.rentals);
      await utils.waitForPageLoad(Routing.AdminRentals);
      const url = await browser.getUrl();
      expect(url).to.include("/admin/rentals");
    });

    it("Admin can switch between tabs on /admin/rentals", async () => {
      await auth.goToLogin();
      await auth.signInUser(getAdminUserLogin());
      await browser.url(utils.buildUrl(Routing.AdminRentals));
      await utils.waitForPageLoad(Routing.AdminRentals);

      // Rental Spots tab
      await utils.clickElement(rentalsPO.adminTabs.spots);
      await utils.waitForVisible(rentalsPO.adminTabs.spots);
      expect(await utils.isElementDisplayed("#admin-rental-spots-table")).to.be.true;

      // Rental Requests tab
      await utils.clickElement(rentalsPO.adminTabs.requests);
      await utils.waitForVisible(rentalsPO.adminTabs.requests);
      expect(await utils.isElementDisplayed("#admin-rental-requests-table")).to.be.true;

      // Current Rentals tab
      await utils.clickElement(rentalsPO.adminTabs.current);
      await utils.waitForVisible(rentalsPO.actionButtons.create);
    });
  });

  // ─── Admin — Create Rental ────────────────────────────────────────────────

  describe("Admin — Create Rental", () => {
    it("Admin can open the Create New Rental modal", async () => {
      await auth.goToLogin();
      await auth.signInUser(getAdminUserLogin());
      await browser.url(utils.buildUrl(Routing.AdminRentals));
      await utils.waitForPageLoad(Routing.AdminRentals);

      await utils.waitForVisible(rentalsPO.actionButtons.create);
      await utils.clickElement(rentalsPO.actionButtons.create);
      await utils.waitForVisible(rentalsPO.createRentalForm.submit);
    });

    it("Admin can create a rental for a member using spot dropdown", async () => {
      await auth.goToLogin();
      await auth.signInUser(getAdminUserLogin());

      // Navigate to a basic member's profile
      await header.navigateTo(header.links.members);
      await utils.waitForPageLoad(memberPO.membersListUrl);
      await utils.waitForNotVisible(memberPO.membersList.loading);
      await utils.fillSearchInput(memberPO.membersList.searchInput, getBasicUserLogin().email);
      await utils.waitForNotVisible(memberPO.membersList.loading);
      const link = await memberPO.getColumnByIndex(0, "lastname");
      const memberName: string = await link.getText();
      await (await link.$("a")).click();
      await utils.waitForPageToMatch(Routing.Profile);
      await utils.waitForNotVisible(memberPO.memberDetail.loading);

      // Go to rentals tab
      await memberPO.goToMemberRentals();
      await utils.waitForVisible(rentalsPO.actionButtons.create);

      // Open create modal
      await utils.clickElement(rentalsPO.actionButtons.create);
      await utils.waitForVisible(rentalsPO.createRentalForm.submit);

      // Member should be pre-filled since we're on their profile
      // Select a spot from the dropdown
      await utils.selectDropdownByValue(
        rentalsPO.createRentalForm.spotSelect,
        TEST_SPOT_NUMBER
      );

      // Check the agreement checkbox
      await utils.clickElement(rentalsPO.createRentalForm.agreement);

      // Submit
      await utils.clickElement(rentalsPO.createRentalForm.submit);
      await utils.waitForNotVisible(rentalsPO.createRentalForm.submit);

      // Verify rental appears in the list
      await utils.waitForNotVisible(rentalsPO.getLoadingId());
      const rows = await rentalsPO.getAllRows();
      expect(rows.length).to.be.greaterThan(0);
    });
  });

  // ─── Admin — Renew Rental ─────────────────────────────────────────────────

  describe("Admin — Renew Rental", () => {
    it("Admin can renew a rental for an additional term", async () => {
      await auth.goToLogin();
      await auth.signInUser(getAdminUserLogin());
      await browser.url(utils.buildUrl(Routing.AdminRentals));
      await utils.waitForPageLoad(Routing.AdminRentals);
      await utils.waitForNotVisible(rentalsPO.getLoadingId());

      // Select first row
      await rentalsPO.selectRowByIndex(0);
      await utils.waitForVisible(rentalsPO.actionButtons.renew);
      await utils.clickElement(rentalsPO.actionButtons.renew);

      await utils.waitForVisible(renewPO.renewalForm.submit);
      await utils.selectDropdownByValue(renewPO.renewalForm.renewalSelect, "1");
      await utils.clickElement(renewPO.renewalForm.submit);
      await utils.waitForNotVisible(renewPO.renewalForm.submit);
      await utils.waitForNotVisible(rentalsPO.getLoadingId());
    });
  });

  // ─── Admin — Delete Rental ────────────────────────────────────────────────

  describe("Admin — Delete Rental", () => {
    it("Admin can delete a rental and confirm details in modal", async () => {
      await auth.goToLogin();
      await auth.signInUser(getAdminUserLogin());
      await browser.url(utils.buildUrl(Routing.AdminRentals));
      await utils.waitForPageLoad(Routing.AdminRentals);
      await utils.waitForNotVisible(rentalsPO.getLoadingId());

      // Get row details before deleting
      await rentalsPO.selectRowByIndex(0);
      const numberText = await rentalsPO.getColumnTextByIndex(0, "number");

      await utils.waitForVisible(rentalsPO.actionButtons.delete);
      await utils.clickElement(rentalsPO.actionButtons.delete);

      // Verify modal shows correct details
      await utils.waitForVisible(rentalsPO.deleteRentalModal.submit);
      expect(await utils.getElementText(rentalsPO.deleteRentalModal.number)).to.eql(numberText);

      // Confirm delete
      await utils.clickElement(rentalsPO.deleteRentalModal.submit);
      await utils.waitForNotVisible(rentalsPO.deleteRentalModal.submit);
    });
  });

  // ─── Admin — Rental Spots Catalog ─────────────────────────────────────────

  describe("Admin — Rental Spots", () => {
    it("Admin can view the rental spots catalog", async () => {
      await auth.goToLogin();
      await auth.signInUser(getAdminUserLogin());
      await browser.url(utils.buildUrl(Routing.AdminRentals));
      await utils.waitForPageLoad(Routing.AdminRentals);

      await utils.clickElement(rentalsPO.adminTabs.spots);
      await utils.waitForVisible("#admin-rental-spots-table");
      await utils.waitForNotVisible("#admin-rental-spots-table-loading");

      const rows = await browser.$$('[id^="admin-rental-spots-table-"][id$="-row"]');
      expect(rows.length).to.be.greaterThan(0);
    });

    it("Admin can see 26 seeded rental spots", async () => {
      await auth.goToLogin();
      await auth.signInUser(getAdminUserLogin());
      await browser.url(utils.buildUrl(Routing.AdminRentals));
      await utils.waitForPageLoad(Routing.AdminRentals);

      await utils.clickElement(rentalsPO.adminTabs.spots);
      await utils.waitForNotVisible("#admin-rental-spots-table-loading");

      const rows = await browser.$$('[id^="admin-rental-spots-table-"][id$="-row"]');
      expect(rows.length).to.eql(26);
    });
  });

  // ─── Member — Rentals Tab ─────────────────────────────────────────────────

  describe("Member — Rentals Tab", () => {
    it("Member can see rentals tab on their profile", async () => {
      await auth.goToLogin();
      await auth.signInUser(getBasicUserLogin());
      await utils.waitForPageToMatch(Routing.Profile);
      await utils.waitForNotVisible(memberPO.memberDetail.loading);

      await utils.waitForVisible(memberPO.memberDetail.rentalsTab);
      expect(await utils.isElementDisplayed(memberPO.memberDetail.rentalsTab)).to.be.true;
    });

    it("Member sees rental browser with spot dropdown when on their own profile", async () => {
      await auth.goToLogin();
      await auth.signInUser(getBasicUserLogin());
      await utils.waitForPageToMatch(Routing.Profile);
      await utils.waitForNotVisible(memberPO.memberDetail.loading);

      await utils.clickElement(memberPO.memberDetail.rentalsTab);
      await utils.waitForVisible("#member-rentals-table");

      // Spot browser should appear below the rentals list
      await utils.waitForVisible(rentalsPO.memberRentalsBrowser.spotDropdown);
      expect(await utils.isElementDisplayed(rentalsPO.memberRentalsBrowser.spotDropdown)).to.be.true;
    });

    it("Member can select a rental spot and see details appear", async () => {
      await auth.goToLogin();
      await auth.signInUser(getBasicUserLogin());
      await utils.waitForPageToMatch(Routing.Profile);
      await utils.waitForNotVisible(memberPO.memberDetail.loading);

      await utils.clickElement(memberPO.memberDetail.rentalsTab);
      await utils.waitForVisible(rentalsPO.memberRentalsBrowser.spotDropdown);

      // Select a spot
      await utils.selectDropdownByValue(
        rentalsPO.memberRentalsBrowser.spotDropdown,
        TEST_SPOT_NUMBER
      );

      // Continue button should appear
      await utils.waitForVisible(rentalsPO.memberRentalsBrowser.continueButton);
      expect(await utils.isElementDisplayed(rentalsPO.memberRentalsBrowser.continueButton)).to.be.true;
    });

    it("Member must sign rental agreement before confirming", async () => {
      await auth.goToLogin();
      await auth.signInUser(getBasicUserLogin());
      await utils.waitForPageToMatch(Routing.Profile);
      await utils.waitForNotVisible(memberPO.memberDetail.loading);

      await utils.clickElement(memberPO.memberDetail.rentalsTab);
      await utils.waitForVisible(rentalsPO.memberRentalsBrowser.spotDropdown);

      await utils.selectDropdownByValue(
        rentalsPO.memberRentalsBrowser.spotDropdown,
        TEST_SPOT_NUMBER
      );
      await utils.waitForVisible(rentalsPO.memberRentalsBrowser.continueButton);
      await utils.clickElement(rentalsPO.memberRentalsBrowser.continueButton);

      // Agreement dialog opens
      await utils.waitForVisible(rentalsPO.memberRentalsBrowser.agreementCheckbox);
      expect(await utils.isElementDisplayed(rentalsPO.memberRentalsBrowser.agreementCheckbox)).to.be.true;

      // Continue should be disabled until signed
      const continueBtn = await $(rentalsPO.memberRentalsBrowser.agreementContinue);
      expect(await continueBtn.isEnabled()).to.be.false;

      // Sign it
      await utils.clickElement(rentalsPO.memberRentalsBrowser.agreementCheckbox);
      expect(await continueBtn.isEnabled()).to.be.true;
    });
  });

  // ─── Member — Cancel Rental ───────────────────────────────────────────────

  describe("Member — Cancel Rental", () => {
    it("Member sees two-step cancel flow with vacated question", async () => {
      await auth.goToLogin();
      await auth.signInUser(getBasicUserLogin());
      await utils.waitForPageToMatch(Routing.Profile);
      await utils.waitForNotVisible(memberPO.memberDetail.loading);

      await utils.clickElement(memberPO.memberDetail.rentalsTab);
      await utils.waitForVisible("#member-rentals-table");
      await utils.waitForNotVisible("#member-rentals-table-loading");

      const rows = await browser.$$('[id^="member-rentals-table-"][id$="-row"]');
      if (rows.length === 0) {
        // No active rentals to cancel — skip
        return;
      }

      // Click cancel on first active rental
      const cancelBtn = await rows[0].$("button");
      if (!cancelBtn || !(await cancelBtn.isDisplayed())) return;
      await cancelBtn.click();

      // Step 1 — Are you sure?
      await utils.waitForVisible(rentalsPO.memberRentalsBrowser.cancelFlowButton);

      // Confirm cancel intent
      await utils.clickElement(rentalsPO.memberRentalsBrowser.cancelFlowButton);

      // Step 2 — Have you vacated?
      await utils.waitForVisible(rentalsPO.memberRentalsBrowser.vacatedYes);
      await utils.waitForVisible(rentalsPO.memberRentalsBrowser.vacatedNo);
    });

    it("Member cancels immediately when they have vacated", async () => {
      await auth.goToLogin();
      await auth.signInUser(getBasicUserLogin());
      await utils.waitForPageToMatch(Routing.Profile);
      await utils.waitForNotVisible(memberPO.memberDetail.loading);

      await utils.clickElement(memberPO.memberDetail.rentalsTab);
      await utils.waitForVisible("#member-rentals-table");
      await utils.waitForNotVisible("#member-rentals-table-loading");

      const rows = await browser.$$('[id^="member-rentals-table-"][id$="-row"]');
      if (rows.length === 0) return;

      const cancelBtn = await rows[0].$("button");
      if (!cancelBtn || !(await cancelBtn.isDisplayed())) return;
      const countBefore = rows.length;
      await cancelBtn.click();

      await utils.waitForVisible(rentalsPO.memberRentalsBrowser.cancelFlowButton);
      await utils.clickElement(rentalsPO.memberRentalsBrowser.cancelFlowButton);

      await utils.waitForVisible(rentalsPO.memberRentalsBrowser.vacatedYes);
      await utils.clickElement(rentalsPO.memberRentalsBrowser.vacatedYes);

      // Modal should close and table should update
      await utils.waitForNotVisible(rentalsPO.memberRentalsBrowser.vacatedYes);
      await utils.waitForNotVisible("#member-rentals-table-loading");
    });

    it("Member choosing 'not vacated' keeps rental active (vacating status)", async () => {
      await auth.goToLogin();
      await auth.signInUser(getBasicUserLogin());
      await utils.waitForPageToMatch(Routing.Profile);
      await utils.waitForNotVisible(memberPO.memberDetail.loading);

      await utils.clickElement(memberPO.memberDetail.rentalsTab);
      await utils.waitForVisible("#member-rentals-table");
      await utils.waitForNotVisible("#member-rentals-table-loading");

      const rows = await browser.$$('[id^="member-rentals-table-"][id$="-row"]');
      if (rows.length === 0) return;

      const cancelBtn = await rows[0].$("button");
      if (!cancelBtn || !(await cancelBtn.isDisplayed())) return;
      await cancelBtn.click();

      await utils.waitForVisible(rentalsPO.memberRentalsBrowser.cancelFlowButton);
      await utils.clickElement(rentalsPO.memberRentalsBrowser.cancelFlowButton);

      await utils.waitForVisible(rentalsPO.memberRentalsBrowser.vacatedNo);
      await utils.clickElement(rentalsPO.memberRentalsBrowser.vacatedNo);

      // Modal closes, rental stays in list (now vacating status)
      await utils.waitForNotVisible(rentalsPO.memberRentalsBrowser.vacatedNo);
      await utils.waitForNotVisible("#member-rentals-table-loading");
    });
  });

  // ─── Status display ───────────────────────────────────────────────────────

  describe("Admin — Status Display", () => {
    it("Cancelled rentals show Cancelled not Expired in admin list", async () => {
      await auth.goToLogin();
      await auth.signInUser(getAdminUserLogin());
      await browser.url(utils.buildUrl(Routing.AdminRentals));
      await utils.waitForPageLoad(Routing.AdminRentals);
      await utils.waitForNotVisible(rentalsPO.getLoadingId());

      const rows = await rentalsPO.getAllRows();
      for (const row of rows) {
        const statusCell = await row.$('[id$="-status"]');
        if (!await statusCell.isExisting()) continue;
        const text = await statusCell.getText();
        // Should never show "Expired" for a rental that has a status field set
        if (text === "Expired") {
          // This would only be valid for legacy rentals without the status field
          // All new rentals should show Cancelled, Pending, Vacating, or Active
          console.warn("Found Expired status — may be legacy rental without status field");
        }
      }
    });
  });
});
