export interface CertificateItem {
  id: string;
  title: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface ReviewItem {
  id: string;
  reviewerName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}

export interface ComplaintItem {
  id: string;
  complainantName: string;
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
}

/**
 * Single Unified User Schema stored in Firebase / Unified Endpoint.
 * Since an AIDMATE can also be a Customer, there is NO separate endpoint.
 * Toggling `isActiveAidmate` switches the user between Active AIDMATE and Normal User (Customer).
 */
export interface UnifiedAidoUser {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  accountType?: 'seeker' | 'provider' | 'admin';

  // Toggle Button State: true = Active AIDMATE | false = Inactive AIDMATE (Normal Customer)
  isActiveAidmate: boolean;
  skills: string[];

  // Certificates sent by the user from the main web application
  certificates: CertificateItem[];

  // Column 1: Customer Reviews (Reviews received when acting as a Customer)
  customerReviews: {
    averageRating: number;
    totalCount: number;
    items: ReviewItem[];
  };

  // Column 2: AIDMATE Reviews (Reviews received when working as an AIDMATE)
  aidmateReviews: {
    averageRating: number;
    totalCount: number;
    items: ReviewItem[];
  };

  // Complaints separated by role for the same user
  customerComplaints: ComplaintItem[];
  aidmateComplaints: ComplaintItem[];

  // Verification Badge controlled by Admin
  isVerified: boolean;
  verifiedAt?: string | null;
}

export interface InspectorModalState {
  title: string;
  subtitle: string;
  type: 'REVIEWS' | 'COMPLAINTS';
  items: ReviewItem[] | ComplaintItem[];
}