// Shop Fee Catalog item — stored as an InvoiceOption with resource_class: "fee"
// and no plan_id (one-time, no subscription)
export interface ShopFeeItem {
  id: string;
  name: string;
  description?: string;
  amount: string; // serialized as string from Rails (e.g. "12.50")
  quantity: number; // default 1, used as unit quantity for the option itself
  resourceClass: "fee";
  planId: null;
  disabled: boolean;
}

// A line item the admin is building on the Send Charge form
export interface ShopFeeLineItem {
  // If picked from catalog, this is set; if custom (not yet saved), it's undefined
  catalogId?: string;
  name: string;
  description?: string;
  unitPrice: number;       // current price (may differ from catalog)
  quantity: number;        // multiplier (default 1)
  updateCatalogPrice: boolean; // whether to push the changed price back to catalog
  isCustom: boolean;       // true if typed in, not from catalog
  saveToCatalog: boolean;  // true if custom and user wants to save it
}

export interface SendChargePayload {
  memberId: string;
  invoiceLabel: string;    // used when multiple line items; single item uses item name
  lineItems: ShopFeeLineItem[];
}
