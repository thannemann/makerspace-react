export interface VolunteerCredit {
  id: string;
  memberId: string;
  memberName: string;
  issuedById: string;
  issuedByName: string;
  taskId: string | null;
  taskTitle: string | null;
  description: string;
  creditValue: number;
  status: 'pending' | 'approved' | 'rejected';
  discountApplied: boolean;
  discountAppliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VolunteerTask {
  id: string;
  title: string;
  description: string;
  creditValue: number;
  shopId: string | null;
  shopName: string | null;
  status: 'available' | 'claimed' | 'pending' | 'completed' | 'cancelled';
  createdById: string;
  createdByName: string;
  claimedById: string | null;
  claimedByName: string | null;
  claimedAt: string | null;
  completedAt: string | null;
  verifiedById: string | null;
  verifiedByName: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VolunteerSummary {
  year_count: number;
  discounts_used: number;
  max_discounts: number;
  credits_per_discount: number;
  pending_count: number;
  is_earned_member: boolean;
  message: string | null;
}
