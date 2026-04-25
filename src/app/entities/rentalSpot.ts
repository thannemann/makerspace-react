export interface RentalType {
  id:                  string;
  displayName:         string;
  active:              boolean;
  invoiceOptionId:     string | null;
  invoiceOptionName:   string | null;
  invoiceOptionAmount: number | null;
  invoiceOptionPlanId: string | null;
}

export interface RentalSpot {
  id:                    string;
  number:                string;
  location:              string;
  description:           string;
  rentalTypeId:          string;
  rentalTypeDisplayName: string | null;
  requiresApproval:      boolean;
  active:                boolean;
  parentNumber:          string | null;
  notes:                 string | null;
  available:             boolean;
  invoiceOptionId:       string | null;
  invoiceOptionName:     string | null;
  invoiceOptionAmount:   number | null;
  invoiceOptionPlanId:   string | null;
}

export enum RentalStatus {
  Pending           = "pending",
  PendingAgreement  = "pending_agreement",
  Active            = "active",
  Vacating          = "vacating",
  Cancelled         = "cancelled",
  Denied            = "denied",
  AgreementDenied   = "agreement_denied",
}

export const RentalStatusDisplay: Record<RentalStatus, string> = {
  [RentalStatus.Pending]:          "Pending Approval",
  [RentalStatus.PendingAgreement]: "Pending Agreement",
  [RentalStatus.Active]:           "Active",
  [RentalStatus.Vacating]:         "Vacating",
  [RentalStatus.Cancelled]:        "Cancelled",
  [RentalStatus.Denied]:           "Denied",
  [RentalStatus.AgreementDenied]:  "Agreement Declined",
};
