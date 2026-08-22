export type UserRole = 'guest' | 'user' | 'owner' | 'admin' | 'renter';

export interface User {
  id: string;
  phone: string;
  name: string;
  role: 'user' | 'owner' | 'admin';
  avatarUrl: string;
  email?: string;
  school?: string;
  year?: string;
  bio?: string;
  address?: string;
  rating?: number;
  verified?: boolean;
  onboardingCompleted?: boolean;
  ownerOnboardingCompleted?: boolean;
  ownerApplicationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  ownerApplicationDate?: string;
  ownerApplicationReason?: string;
  ownerApplicationRejectionReason?: string;
  createdAt: string;
}

export interface OwnerApplication {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail?: string;
  buildingName: string;
  address: string;
  district: string;
  totalRooms: number;
  cccdNumber: string;
  cccdImageUrl?: string;
  legalDocsNote?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface Room {
  id: string;
  buildingId: string;
  buildingName: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerAvatar: string;
  title: string;
  roomNumber: string;
  price: number;
  deposit: number;
  electricityPrice: number;
  waterPrice: number;
  area: number;
  type: 'Phòng đơn' | 'Studio' | 'Phòng ghép' | 'Căn hộ mini';
  status: 'Còn trống' | 'Đã cho thuê' | 'Chờ duyệt' | 'Bị từ chối';
  verified: boolean;
  rejectionReason?: string;
  amenities: string[];
  images: string[];
  distanceToSchoolKm: number;
  nearestSchool: string;
  address: string;
  district: string;
  description: string;
  views: number;
  savedCount: number;
  isBoosted?: boolean;
  boostExpiresAt?: string;
  boostBadge?: string;
  createdAt: string;
}

export interface Building {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerAvatar: string;
  name: string;
  address: string;
  district: string;
  city: string;
  totalRooms: number;
  availableRooms: number;
  amenities: string[];
  images: string[];
  verifiedBadge: boolean;
  rating: number;
  reviewCount: number;
  description: string;
  geo: {
    lat: number;
    lng: number;
  };
  nearbyUniversities: {
    name: string;
    distanceKm: number;
  }[];
}

export interface RoommatePost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userGender: 'Nam' | 'Nữ' | 'Khác';
  userAge: number;
  userSchool: string;
  district: string;
  budgetShare: number;
  genderPreference: 'Chỉ tìm Nữ' | 'Chỉ tìm Nam' | 'Tất cả';
  habits: string[];
  lifestyleTags?: string[];
  intro: string;
  linkedRoomId?: string;
  linkedRoomTitle?: string;
  linkedRoomPrice?: number;
  linkedRoomArea?: number;
  linkedRoomImage?: string;
  status?: 'Đang tìm' | 'Đã ghép';
  createdAt: string;
}

export interface MarketplaceItem {
  id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  userAvatar: string;
  name: string;
  category: 'Nội thất' | 'Đồ điện tử' | 'Sách vở' | 'Đồ gia dụng';
  price: number;
  pricingType: 'Miễn phí' | 'Giá rẻ';
  condition: 'Mới 99%' | 'Còn dùng tốt' | 'Đã qua sử dụng' | 'Dùng tốt' | 'Tặng miễn phí';
  location: string;
  district: string;
  images: string[];
  description: string;
  status?: 'Còn hàng' | 'Đã bán';
  createdAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  createdAt: string;
  status: 'sending' | 'sent' | 'read';
}

export interface Thread {
  id: string;
  participants: {
    id: string;
    name: string;
    avatar: string;
    role: string;
  }[];
  relatedRoomId?: string;
  relatedRoomTitle?: string;
  relatedRoomPrice?: number;
  relatedRoomImage?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type:
    | 'approval'
    | 'message'
    | 'booking'
    | 'system'
    | 'rejected'
    | 'upgrade'
    | 'action_required'
    | 'owner_approved'
    | 'owner_rejected'
    | 'new_owner_application';
  read: boolean;
  ctaUrl?: string;
  ctaLabel?: string;
  actionLink?: string;
  priority?: 'normal' | 'urgent';
  createdAt: string;
}

export interface BookingRequest {
  id: string;
  roomId: string;
  roomTitle: string;
  roomPrice: number;
  renterId: string;
  renterName: string;
  renterPhone: string;
  date: string;
  timeSlot: string;
  note?: string;
  status: 'Chờ chủ trọ xác nhận' | 'Đã xác nhận' | 'Đã hủy';
  createdAt: string;
}

export interface Review {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  stars: number;
  criteria: {
    cleanliness: number;
    landlord: number;
    accuracy: number;
    location: number;
  };
  text: string;
  createdAt: string;
}

// Payment & Subscription Models
export type SubscriptionPlanId = 'free' | 'basic' | 'pro';

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  price: number;
  originalPrice?: number;
  period: string;
  roomLimit: number;
  badge?: string;
  popular?: boolean;
  features: string[];
  description: string;
}

export type PaymentMethod = 'momo' | 'vnpay' | 'banking';

export interface PaymentTransaction {
  id: string;
  userId: string;
  userName: string;
  orderId: string;
  orderInfo: string;
  amount: number;
  method: PaymentMethod;
  status: 'success' | 'failed' | 'pending';
  planId?: SubscriptionPlanId;
  boostType?: '3days' | '7days' | '30days';
  roomId?: string;
  createdAt: string;
}

export interface OwnerSubscription {
  planId: SubscriptionPlanId;
  status: 'active' | 'cancelled' | 'expired';
  expiresAt: string;
  autoRenew: boolean;
  startedAt: string;
}

