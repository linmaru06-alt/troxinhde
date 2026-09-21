export type UserRole = "guest" | "user" | "owner" | "admin" | "renter";
export type AdminRole = "super_admin" | "moderator" | "support" | "finance";

export interface User {
  id: string;
  firebaseUid?: string;
  isDemoAccount?: boolean;
  phone?: string;
  name: string;
  role: "user" | "owner" | "admin";
  avatarUrl: string;
  email?: string;
  school?: string;
  year?: string;
  bio?: string;
  address?: string;
  rating?: number;
  verified?: boolean; // Generic verification badge
  emailVerified?: boolean;
  phoneVerified?: boolean;
  isBanned?: boolean;
  bannedUntil?: string;
  bannedReason?: string;
  landlordVerified?: boolean;
  adminRole?: AdminRole;
  onboardingCompleted?: boolean;
  ownerOnboardingCompleted?: boolean;
  ownerApplicationStatus?: "none" | "pending" | "approved" | "rejected";
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
  status: "pending" | "approved" | "rejected";
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
  type: "Phòng đơn" | "Studio" | "Phòng ghép" | "Căn hộ mini";
  status: "Còn trống" | "Đã cho thuê" | "Chờ duyệt" | "Bị từ chối" | "Đã ẩn";
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
  electricityPrice?: number;
  waterPrice?: number;
}

export interface RoommatePost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userGender: "Nam" | "Nữ" | "Khác";
  userAge: number;
  userSchool: string;
  district: string;
  budgetShare: number;
  genderPreference: "Chỉ tìm Nữ" | "Chỉ tìm Nam" | "Tất cả";
  habits: string[];
  lifestyleTags?: string[];
  intro: string;
  linkedRoomId?: string;
  linkedRoomTitle?: string;
  linkedRoomPrice?: number;
  linkedRoomArea?: number;
  linkedRoomImage?: string;
  status?: "Đang tìm" | "Đã ghép";
  images?: string[];
  createdAt: string;
}

export interface MarketplaceItem {
  id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  userAvatar: string;
  name: string;
  category: "Nội thất" | "Đồ điện tử" | "Sách vở" | "Đồ gia dụng";
  price: number;
  pricingType: "Miễn phí" | "Giá rẻ";
  condition:
    | "Mới 99%"
    | "Còn dùng tốt"
    | "Đã qua sử dụng"
    | "Dùng tốt"
    | "Tặng miễn phí";
  location: string;
  district: string;
  images: string[];
  description: string;
  status?: "Còn hàng" | "Đã bán" | "Chờ duyệt" | "Bị từ chối" | "Đã duyệt";
  moderationStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read?: boolean;
  created_at: string;
  status?: "sending" | "sent" | "read" | "failed";
  sender?: {
    id: string;
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
}

export interface ConversationParticipant {
  id: string;
  full_name?: string;
  name?: string;
  avatar_url?: string;
  app_role?: string;
  phone?: string;
}

export interface Conversation {
  id: string;
  room_id?: string | null;
  participant_1: string;
  participant_2: string;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count_p1?: number;
  unread_count_p2?: number;
  created_at?: string;
  other_name?: string;
  other_avatar?: string;
  // Joined relations
  rooms?: {
    id: string;
    name?: string;
    title?: string;
    price?: number;
    images?: string[];
  } | null;
  p1?: ConversationParticipant | null;
  p2?: ConversationParticipant | null;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type:
    | "approval"
    | "message"
    | "chat_message"
    | "booking"
    | "system"
    | "rejected"
    | "rejection"
    | "upgrade"
    | "action_required"
    | "owner_approved"
    | "owner_rejected"
    | "room_approved"
    | "marketplace_approved"
    | "marketplace_rejected"
    | "new_owner_application";
  read: boolean;
  ctaUrl?: string;
  ctaLabel?: string;
  actionLink?: string;
  priority?: "normal" | "urgent";
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
  status: "Chờ chủ trọ xác nhận" | "Đã xác nhận" | "Đã hủy" | "Đổi giờ" | "completed" | "Đã xem phòng";
  createdAt: string;
}

export interface ReportItem {
  id: string;
  targetId: string;
  targetTitle: string;
  targetType: "room" | "roommate" | "marketplace" | "user";
  reporterId?: string;
  reporterName: string;
  reporterPhone?: string;
  reason: string;
  detail?: string;
  severity?: "low" | "medium" | "high" | "critical";
  status: "pending" | "resolved" | "dismissed";
  adminNotes?: string;
  resolvedBy?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AuditLog {
  id: string;
  admin_id?: string | null;
  admin_email?: string;
  admin_role?: string;
  action: string;
  entity_type:
    | "room"
    | "user"
    | "report"
    | "owner_application"
    | "booking"
    | "system"
    | "marketplace_item"
    | "roommate";
  entity_id?: string;
  data_before?: Record<string, any> | null;
  data_after?: Record<string, any> | null;
  reason?: string | null;
  is_demo_admin?: boolean;
  created_at: string;
}

export interface AdminMetrics {
  totalRooms: number;
  pendingRooms: number;
  approvedRooms: number;
  rejectedRooms: number;
  totalUsers: number;
  totalOwners: number;
  pendingOwnerApps: number;
  totalReports: number;
  pendingReports: number;
  totalBookings: number;
  pendingBookings: number;
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
export type SubscriptionPlanId = "free" | "basic" | "pro";

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

export type PaymentMethod = "momo" | "vnpay" | "banking" | "vietqr";

export interface PaymentTransaction {
  id: string;
  userId: string;
  userName: string;
  orderId: string;
  orderInfo: string;
  amount: number;
  method: PaymentMethod;
  status: "success" | "failed" | "pending";
  planId?: SubscriptionPlanId;
  boostType?: "3days" | "7days" | "30days";
  roomId?: string;
  createdAt: string;
}

export interface OwnerSubscription {
  planId: SubscriptionPlanId;
  status: "active" | "cancelled" | "expired";
  expiresAt: string;
  autoRenew: boolean;
  startedAt: string;
}
