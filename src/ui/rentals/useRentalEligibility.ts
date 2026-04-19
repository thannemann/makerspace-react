import * as React from "react";
import { Member, listInvoices } from "makerspace-ts-api-client";
import useReadTransaction from "ui/hooks/useReadTransaction";

export interface RentalEligibility {
  eligible: boolean;
  reasons:  string[];
  loading:  boolean;
}

/**
 * Checks whether the current member can request a new rental.
 * Mirrors the guards in RentalsController#create:
 *   1. Member status must be "activeMember"
 *   2. No past-due unsettled invoices
 */
const useRentalEligibility = (member: Member): RentalEligibility => {
  const reasons: string[] = [];

  const memberExpired = member?.status !== "activeMember";
  if (memberExpired) {
    reasons.push("Your membership is not active. Please renew before requesting a rental.");
  }

  const { data: invoices = [], isRequesting: invoicesLoading } = useReadTransaction(
    listInvoices,
    { pastDue: true, settled: false },
    !member?.id,
    "rental-eligibility-invoices"
  );

  const hasPastDue = invoices.length > 0;
  if (hasPastDue) {
    reasons.push("You have outstanding past due invoices. Please settle your balance before requesting a rental.");
  }

  return {
    eligible: !memberExpired && !hasPastDue,
    reasons,
    loading:  invoicesLoading,
  };
};

export default useRentalEligibility;
