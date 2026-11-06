export type UserRole = 'seeker' | 'provider' | 'admin' | null;

export interface UserData {
  id?: string;
  email?: string;
  isActiveAidmate?: boolean;
  isAvailable?: boolean;
  name: string;
  mobile: string;
  overallRating?: number;
  reviewCount?: number;
  ratings?: {
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
  };
}

export interface Notification {
  type?: 'success' | 'alert' | 'info';
  title: string;
  body: string;
}

export interface Job {
  id: string;
  title: string;
  area: string;
  date: string;
  status: 'completed' | 'rejected';
  rejectionReason?: string;
}

export interface AidmateProfile {
  id: string;
  name: string;
  mobile: string;
  profilePictureUrl: string;
  district: string;
  state: string;
  overallRating: number;
  reviewCount: number;
  services: string[];
  skills: string[];
  jobs: Job[];
  ratings: {
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
  };
  isAvailable: boolean;
  isVerified: boolean;
  location: { lat: number; lng: number };
  distance: string;
  bio: string;
}

export interface PendingAidmate {
  id: string;
  name: string;
  mobile: string;
  providerType: 'professional' | 'casual';
  submissionDate: string;
  profilePictureUrl: string;
  documents: {
    aadhaarFrontUrl: string;
    aadhaarBackUrl: string;
    selfieVideoUrl: string;
    certificateUrl?: string;
    bankPassbookUrl?: string;
  };
}

export interface Deal {
  id: string | number;
  seekerUid?: string;
  providerUid?: string;
  service: string;
  location: string;
  time: string;
  seekerName: string;
  seekerLocation: { lat: number; lng: number };
  seekerMobile?: string;
  offer?: string;
  description?: string;
  imageUrl?: string;
  status?: 'pending' | 'accepted' | 'completed';
  providerName?: string;
  providerMobile?: string;
  providerLocation?: { lat: number; lng: number };
}

export interface Message {
  id: string;
  text: string;
  senderId: 'provider' | 'seeker';
  mediaUrl?: string;
  timestamp: number;
}
