import { expect } from "chai";
import { Member, Rental } from "makerspace-ts-api-client";
import { Routing } from "app/constants";
import { timeToDate } from "ui/utils/timeToDate";
import { TablePageObject } from "./table";
import utils from "./common";

// ─── Admin rentals table (at /admin/rentals) ──────────────────────────────────
const adminTableId = "rentals-table";
const adminTableFields = ["number", "description", "expiration", "member", "status"];

// ─── Member rentals table (on member profile) ─────────────────────────────────
const memberTableId = "member-rentals-table";
const memberTableFields = ["number", "description", "expiration", "status"];

class RentalsPageObject extends TablePageObject {
  // Admin rentals page lives at /admin/rentals
  public listUrl = Routing.AdminRentals;

  public fieldEvaluator = (member?: Partial<Member>) => (rental: Partial<Rental>) => (fieldContent: { field: string, text: string }) => {
    const { field, text } = fieldContent;
    if (field === "expiration") {
      expect(text).to.eql(rental.expiration ? timeToDate(rental.expiration) : "N/A");
    } else if (field === "status") {
      expect(
        ["Active", "Expired", "Cancelled", "Vacating", "Pending Approval", "Denied"].some(
          status => new RegExp(status, "i").test(text)
        )
      ).to.be.true;
    } else if (field === "member") {
      if (member) {
        expect(text).to.eql(`${member.firstname} ${member.lastname}`);
      } else {
        expect(!!text).to.be.true;
      }
    } else {
      expect(text.includes(rental[field])).to.be.true;
    }
  }

  // ─── Admin rentals page tab navigation ──────────────────────────────────────
  public adminTabs = {
    current:  "#admin-rentals-tab-current",
    requests: "#admin-rentals-tab-requests",
    spots:    "#admin-rentals-tab-spots",
    types:    "#admin-rentals-tab-types",
  };

  public goToTab = async (tab: "current" | "requests" | "spots" | "types") => {
    await utils.clickElement(this.adminTabs[tab]);
  };

  // ─── Action buttons (admin Current Rentals tab) ───────────────────────────
  public actionButtons = {
    create: "#rentals-list-create",
    edit:   "#rentals-list-edit",
    delete: "#rentals-list-delete",
    renew:  "#rentals-list-renew",
  };

  // ─── Admin Create Rental modal (new spot-based form) ─────────────────────
  private createFormId = "#admin-create-rental";
  public createRentalForm = {
    id:          `${this.createFormId}`,
    spotSelect:  `${this.createFormId}-spot-select`,
    memberSearch: `${this.createFormId}-member-search`,
    notes:       `${this.createFormId}-notes`,
    agreement:   `${this.createFormId}-agreement`,
    submit:      `${this.createFormId}-submit`,
    cancel:      `${this.createFormId}-cancel`,
    error:       `${this.createFormId}-error`,
    loading:     `${this.createFormId}-loading`,
  };

  // ─── Delete rental modal ─────────────────────────────────────────────────
  private deleteRentalModalId = "#delete-rental";
  public deleteRentalModal = {
    id:          `${this.deleteRentalModalId}`,
    number:      `${this.deleteRentalModalId}-number`,
    description: `${this.deleteRentalModalId}-description`,
    member:      `${this.deleteRentalModalId}-member`,
    submit:      `${this.deleteRentalModalId}-submit`,
    cancel:      `${this.deleteRentalModalId}-cancel`,
    error:       `${this.deleteRentalModalId}-error`,
    loading:     `${this.deleteRentalModalId}-loading`,
  };

  // ─── Member-side rental browser (on member profile) ───────────────────────
  public memberRentalsBrowser = {
    spotDropdown:     "#member-rental-spot-select",
    continueButton:   "#member-rental-continue",
    agreementCheckbox:"#member-rental-agreement-checkbox",
    agreementContinue:"#member-rental-agreement-continue",
    confirmButton:    "#member-rental-confirm",
    cancelFlowButton: "#member-rental-cancel-confirm",
    vacatedYes:       "#member-rental-vacated-yes",
    vacatedNo:        "#member-rental-vacated-no",
  };

  // ─── Member rentals table (separate table on profile) ────────────────────
  public memberTable = new TablePageObject(memberTableId, memberTableFields);
}

// Export two instances — one pointing at admin table, one for member table
export const adminRentalsPO = new RentalsPageObject(adminTableId, adminTableFields);
export default adminRentalsPO;
