export type UserRole = 'guest' | 'renter' | 'owner' | 'admin';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  email: string;
  verified: boolean;
  avatarUrl: string;
  school?: string;
  year?: string;
  address?: string;
  rating?: number;
  bio?: string;
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
  geo: { lat: number; lng: number };
  nearbyUniversities: { name: string; distanceKm: number }[];
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
  price: number; // VNĐ / tháng
  deposit: number; // VNĐ
  electricityPrice: number; // VNĐ / kWh
  waterPrice: number; // VNĐ / khối hoặc người
  area: number; // m²
  type: 'Phòng đơn' | 'Phòng ghép' | 'Studio' | 'Căn hộ mini';
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
  createdAt: string;
}

export interface RoommatePost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userSchool: string;
  userGender: 'Nam' | 'Nữ' | 'Khác';
  userAge: number;
  linkedRoomId?: string;
  linkedRoomTitle?: string;
  linkedRoomPrice?: number;
  linkedRoomArea?: number;
  linkedRoomImage?: string;
  budgetShare: number; // VNĐ
  district: string;
  genderPreference: 'Chỉ tìm Nữ' | 'Chỉ tìm Nam' | 'Tất cả';
  habits: string[];
  intro: string;
  lifestyleTags: string[];
  createdAt: string;
}

export interface MarketplaceItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userPhone: string;
  name: string;
  pricingType: 'Miễn phí' | 'Giá rẻ';
  price: number; // 0 if free
  category: 'Nội thất' | 'Đồ điện tử' | 'Sách vở' | 'Đồ gia dụng' | 'Khác';
  condition: 'Mới 99%' | 'Dùng tốt' | 'Hơi cũ' | 'Tặng miễn phí';
  images: string[];
  location: string;
  district: string;
  description: string;
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
  participants: { id: string; name: string; avatar: string; role: UserRole }[];
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
  type: 'approval' | 'message' | 'action_required' | 'rejected' | 'system' | 'booking';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  actionLink?: string;
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
  images?: string[];
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
  status: 'Chờ xác nhận' | 'Đã chấp nhận' | 'Đã hủy';
  createdAt: string;
}
