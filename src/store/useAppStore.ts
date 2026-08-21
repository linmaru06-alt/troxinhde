import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  User,
  UserRole,
  Building,
  Room,
  RoommatePost,
  MarketplaceItem,
  NotificationItem,
  Thread,
  Message,
  BookingRequest,
} from '../types';
import {
  initialUsers,
  initialBuildings,
  initialRooms,
  initialRoommates,
  initialMarketplaceItems,
  initialNotifications,
  initialThreads,
  initialMessages,
} from '../data/mockData';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AppState {
  currentUser: User | null;
  rooms: Room[];
  buildings: Building[];
  roommates: RoommatePost[];
  marketplaceItems: MarketplaceItem[];
  notifications: NotificationItem[];
  threads: Thread[];
  messages: Message[];
  savedRoomIds: string[];
  savedRoommateIds: string[];
  savedItemIds: string[];
  bookings: BookingRequest[];
  toasts: Toast[];

  // Auth
  setCurrentUser: (user: User | null) => void;
  loginAsRole: (role: UserRole) => void;
  logout: () => void;

  // Saved toggles
  toggleSaveRoom: (roomId: string) => boolean;
  toggleSaveRoommate: (id: string) => boolean;
  toggleSaveItem: (id: string) => boolean;

  // Room & Building management
  addBuilding: (building: Omit<Building, 'id'>) => string;
  addRoom: (room: Omit<Room, 'id' | 'views' | 'savedCount' | 'createdAt'>) => string;
  updateRoomStatus: (roomId: string, status: Room['status']) => void;
  approveRoom: (roomId: string) => void;
  rejectRoom: (roomId: string, reason: string) => void;

  // Community & Marketplace
  addRoommatePost: (post: Omit<RoommatePost, 'id' | 'createdAt'>) => string;
  addMarketplaceItem: (item: Omit<MarketplaceItem, 'id' | 'createdAt'>) => string;

  // Bookings
  createBooking: (booking: Omit<BookingRequest, 'id' | 'createdAt' | 'status'>) => string;

  // Messages
  sendMessage: (threadId: string, text: string) => void;
  getOrCreateThread: (contactId: string, roomId?: string) => string;

  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Toast
  showToast: (title: string, description?: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;

  // Debug
  resetAllData: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: initialUsers[0], // Default logged in as Renter for great initial experience
      rooms: initialRooms,
      buildings: initialBuildings,
      roommates: initialRoommates,
      marketplaceItems: initialMarketplaceItems,
      notifications: initialNotifications,
      threads: initialThreads,
      messages: initialMessages,
      savedRoomIds: ['room_1', 'room_2'],
      savedRoommateIds: ['rm_1'],
      savedItemIds: ['item_1'],
      bookings: [],
      toasts: [],

      setCurrentUser: (user) => set({ currentUser: user }),

      loginAsRole: (role) => {
        if (role === 'guest') {
          set({ currentUser: null });
          get().showToast('Đã chuyển sang chế độ Khách (chưa đăng nhập)', '', 'info');
          return;
        }
        const user = initialUsers.find((u) => u.role === role) || initialUsers[0];
        set({ currentUser: { ...user, role } });
        get().showToast(`Đã đăng nhập thành công vai trò ${role.toUpperCase()}`, `Chào mừng ${user.name}!`, 'success');
      },

      logout: () => {
        set({ currentUser: null });
        get().showToast('Đã đăng xuất', 'Hẹn gặp lại bạn!', 'info');
      },

      toggleSaveRoom: (roomId) => {
        const { savedRoomIds, currentUser, showToast } = get();
        if (!currentUser) {
          showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để lưu phòng trọ yêu thích', 'warning');
          return false;
        }
        const isSaved = savedRoomIds.includes(roomId);
        const next = isSaved ? savedRoomIds.filter((id) => id !== roomId) : [...savedRoomIds, roomId];
        set({ savedRoomIds: next });
        showToast(isSaved ? 'Đã xóa khỏi danh sách lưu' : 'Đã lưu phòng thành công ❤️', '', isSaved ? 'info' : 'success');
        return !isSaved;
      },

      toggleSaveRoommate: (id) => {
        const { savedRoommateIds, currentUser, showToast } = get();
        if (!currentUser) {
          showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để lưu bài tìm bạn ghép', 'warning');
          return false;
        }
        const isSaved = savedRoommateIds.includes(id);
        const next = isSaved ? savedRoommateIds.filter((item) => item !== id) : [...savedRoommateIds, id];
        set({ savedRoommateIds: next });
        showToast(isSaved ? 'Đã bỏ lưu bài tìm bạn' : 'Đã lưu bài tìm bạn cùng phòng ❤️', '', 'success');
        return !isSaved;
      },

      toggleSaveItem: (id) => {
        const { savedItemIds, currentUser, showToast } = get();
        if (!currentUser) {
          showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để lưu món đồ', 'warning');
          return false;
        }
        const isSaved = savedItemIds.includes(id);
        const next = isSaved ? savedItemIds.filter((item) => item !== id) : [...savedItemIds, id];
        set({ savedItemIds: next });
        showToast(isSaved ? 'Đã bỏ lưu món đồ' : 'Đã lưu món đồ thanh lý ❤️', '', 'success');
        return !isSaved;
      },

      addBuilding: (data) => {
        const newId = `bld_${Date.now()}`;
        const newBuilding: Building = {
          ...data,
          id: newId,
          rating: 5.0,
          reviewCount: 0,
          verifiedBadge: false,
          geo: data.geo || { lat: 10.8, lng: 106.7 },
        };
        set((state) => ({ buildings: [newBuilding, ...state.buildings] }));
        get().showToast('Tạo hồ sơ tòa nhà thành công!', 'Hồ sơ đã được gửi để kiểm duyệt', 'success');
        return newId;
      },

      addRoom: (data) => {
        const newId = `room_${Date.now()}`;
        const newRoom: Room = {
          ...data,
          id: newId,
          views: 1,
          savedCount: 0,
          status: 'Chờ duyệt',
          verified: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ rooms: [newRoom, ...state.rooms] }));
        get().showToast('Đăng phòng thành công!', 'Tin đăng đang được kiểm duyệt (trong vòng 24h)', 'success');
        return newId;
      },

      updateRoomStatus: (roomId, status) => {
        set((state) => ({
          rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, status } : r)),
        }));
        get().showToast('Cập nhật trạng thái thành công', `Phòng hiện có trạng thái: ${status}`, 'success');
      },

      approveRoom: (roomId) => {
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId ? { ...r, status: 'Còn trống', verified: true, rejectionReason: undefined } : r
          ),
          notifications: [
            {
              id: `notif_${Date.now()}`,
              userId: 'user_owner_1',
              type: 'approval',
              title: 'Tin đăng phòng đã được duyệt thành công! ✅',
              body: `Phòng ID ${roomId} đã được phê duyệt và hiển thị công khai trên ứng dụng.`,
              createdAt: new Date().toISOString(),
              read: false,
              actionLink: `/phong/${roomId}`,
            },
            ...state.notifications,
          ],
        }));
        get().showToast('Đã phê duyệt tin đăng!', 'Tin đăng đã được xuất bản công khai', 'success');
      },

      rejectRoom: (roomId, reason) => {
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId ? { ...r, status: 'Bị từ chối', verified: false, rejectionReason: reason } : r
          ),
          notifications: [
            {
              id: `notif_${Date.now()}`,
              userId: 'user_owner_1',
              type: 'rejected',
              title: 'Tin đăng phòng bị từ chối ❌',
              body: `Lý do từ chối: ${reason}. Vui lòng cập nhật lại thông tin.`,
              createdAt: new Date().toISOString(),
              read: false,
              actionLink: `/chu-tro/phong/${roomId}`,
            },
            ...state.notifications,
          ],
        }));
        get().showToast('Đã từ chối tin đăng', `Lý do: ${reason}`, 'warning');
      },

      addRoommatePost: (data) => {
        const newId = `rm_${Date.now()}`;
        const newPost: RoommatePost = {
          ...data,
          id: newId,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ roommates: [newPost, ...state.roommates] }));
        get().showToast('Đăng tin tìm bạn ghép thành công! 🎉', '', 'success');
        return newId;
      },

      addMarketplaceItem: (data) => {
        const newId = `item_${Date.now()}`;
        const newItem: MarketplaceItem = {
          ...data,
          id: newId,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ marketplaceItems: [newItem, ...state.marketplaceItems] }));
        get().showToast('Đăng món đồ thành công! 🎉', '', 'success');
        return newId;
      },

      createBooking: (data) => {
        const newId = `book_${Date.now()}`;
        const newBooking: BookingRequest = {
          ...data,
          id: newId,
          status: 'Chờ xác nhận',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          bookings: [newBooking, ...state.bookings],
          notifications: [
            {
              id: `notif_${Date.now()}`,
              userId: 'user_owner_1',
              type: 'booking',
              title: 'Yêu cầu xem phòng mới 📅',
              body: `${data.renterName} vừa đặt lịch xem phòng vào ngày ${data.date} khung giờ ${data.timeSlot}`,
              createdAt: new Date().toISOString(),
              read: false,
            },
            ...state.notifications,
          ],
        }));
        get().showToast('Đặt lịch xem phòng thành công! 📅', 'Chủ trọ sẽ liên hệ xác nhận qua tin nhắn hoặc điện thoại.', 'success');
        return newId;
      },

      sendMessage: (threadId, text) => {
        const { currentUser } = get();
        if (!currentUser || !text.trim()) return;

        const newMsgId = `msg_${Date.now()}`;
        const newMsg: Message = {
          id: newMsgId,
          threadId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatarUrl,
          text: text.trim(),
          createdAt: new Date().toISOString(),
          status: 'sending',
        };

        set((state) => ({
          messages: [...state.messages, newMsg],
          threads: state.threads.map((t) =>
            t.id === threadId ? { ...t, lastMessage: text.trim(), lastMessageAt: new Date().toISOString() } : t
          ),
        }));

        // Simulate network latency & sent status
        setTimeout(() => {
          set((state) => ({
            messages: state.messages.map((m) => (m.id === newMsgId ? { ...m, status: 'sent' } : m)),
          }));
        }, 500);
      },

      getOrCreateThread: (contactId, roomId) => {
        const { threads, currentUser, rooms } = get();
        const existing = threads.find((t) =>
          t.participants.some((p) => p.id === contactId) && (!roomId || t.relatedRoomId === roomId)
        );
        if (existing) return existing.id;

        const newThreadId = `thread_${Date.now()}`;
        const room = rooms.find((r) => r.id === roomId);
        const newThread: Thread = {
          id: newThreadId,
          participants: [
            {
              id: currentUser?.id || 'guest',
              name: currentUser?.name || 'Khách',
              avatar: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              role: currentUser?.role || 'renter',
            },
            {
              id: contactId,
              name: room?.ownerName || 'Chủ nhà',
              avatar: room?.ownerAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
              role: 'owner',
            },
          ],
          relatedRoomId: roomId,
          relatedRoomTitle: room?.title,
          relatedRoomPrice: room?.price,
          relatedRoomImage: room?.images[0],
          lastMessage: 'Cuộc trò chuyện mới',
          lastMessageAt: new Date().toISOString(),
          unreadCount: 0,
        };

        set((state) => ({ threads: [newThread, ...state.threads] }));
        return newThreadId;
      },

      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
      },

      markAllNotificationsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
        get().showToast('Đã đánh dấu tất cả thông báo là đã đọc', '', 'info');
      },

      showToast: (title, description, type = 'success') => {
        const id = `toast_${Date.now()}_${Math.random()}`;
        set((state) => ({
          toasts: [...state.toasts, { id, title, description, type }],
        }));
        setTimeout(() => {
          get().removeToast(id);
        }, 3500);
      },

      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },

      resetAllData: () => {
        set({
          currentUser: initialUsers[0],
          rooms: initialRooms,
          buildings: initialBuildings,
          roommates: initialRoommates,
          marketplaceItems: initialMarketplaceItems,
          notifications: initialNotifications,
          threads: initialThreads,
          messages: initialMessages,
          savedRoomIds: ['room_1', 'room_2'],
          savedRoommateIds: ['rm_1'],
          savedItemIds: ['item_1'],
          bookings: [],
        });
        get().showToast('Đã đặt lại dữ liệu demo ban đầu!', 'Tất cả dữ liệu đã được làm mới.', 'success');
      },
    }),
    {
      name: 'troxinh_storage_v1',
    }
  )
);
