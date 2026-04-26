export interface Shop {
  id: string;
  name: string;
  slackChannel: string;
  disabled: boolean;
  toolCount: number;
}

export interface Tool {
  id: string;
  name: string;
  description?: string;
  disabled: boolean;
  shopId: string;
  shopName: string;
  prerequisiteIds: string[];
  prerequisiteNames: string[];
}

export interface ToolCheckout {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  toolId: string;
  toolName: string;
  shopName: string;
  shopId: string;
  checkedOutAt: string;
  revokedAt?: string;
  revocationReason?: string;
  signedOffVia: "portal" | "slack";
  approvedById?: string;
  approvedByName?: string;
  active: boolean;
}

export interface CheckoutApprover {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  shopIds: string[];
  shopNames: string[];
}
