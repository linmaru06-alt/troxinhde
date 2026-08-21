import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export type CTAContext =
  | 'save-room'
  | 'message-owner'
  | 'book-viewing'
  | 'post-roommate'
  | 'post-marketplace'
  | 'upgrade-owner'
  | 'manage-listings';

export interface SmartCTAResult {
  label: string;
  action: (payload?: any) => void;
  disabled: boolean;
  tooltip: string | null;
}

export function useSmartCTA(context: CTAContext, extraPayload?: any): SmartCTAResult {
  const navigate = useNavigate();
  const { currentUser, showToast, toggleSaveRoom, getOrCreateThread } = useAppStore();

  const isGuest = !currentUser;
  const role = currentUser?.role || 'guest';
  const ownerApplicationStatus = currentUser?.ownerApplicationStatus || 'none';

  switch (context) {
    case 'save-room': {
      if (isGuest) {
        return {
          label: 'Lưu phòng',
          action: () => {
            showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để lưu phòng trọ yêu thích', 'info');
            navigate(`/dang-nhap?returnUrl=${encodeURIComponent(window.location.pathname)}`);
          },
          disabled: false,
          tooltip: null,
        };
      }
      return {
        label: 'Lưu phòng',
        action: (roomId?: string) => {
          if (roomId) toggleSaveRoom(roomId);
        },
        disabled: false,
        tooltip: null,
      };
    }

    case 'message-owner': {
      if (isGuest) {
        return {
          label: 'Nhắn tin chủ trọ',
          action: () => {
            showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để nhắn tin với chủ trọ', 'info');
            navigate(`/dang-nhap?returnUrl=${encodeURIComponent(window.location.pathname)}`);
          },
          disabled: false,
          tooltip: null,
        };
      }
      return {
        label: 'Nhắn tin chủ trọ',
        action: (ownerId?: string) => {
          const targetId = ownerId || extraPayload?.ownerId || 'user_owner_1';
          const threadId = getOrCreateThread(targetId, extraPayload?.roomId);
          navigate(`/tin-nhan/${threadId}`);
        },
        disabled: false,
        tooltip: null,
      };
    }

    case 'book-viewing': {
      if (isGuest) {
        return {
          label: 'Đặt lịch xem phòng',
          action: () => {
            showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để đặt lịch xem phòng', 'info');
            navigate(`/dang-nhap?returnUrl=${encodeURIComponent(window.location.pathname)}`);
          },
          disabled: false,
          tooltip: null,
        };
      }
      return {
        label: 'Đặt lịch xem phòng',
        action: (roomId?: string) => {
          const id = roomId || extraPayload?.roomId || 'room_1';
          navigate(`/dat-lich/${id}`);
        },
        disabled: false,
        tooltip: null,
      };
    }

    case 'post-roommate': {
      if (isGuest) {
        return {
          label: 'Đăng tin tìm bạn',
          action: () => {
            showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để đăng tin tìm bạn ở ghép', 'info');
            navigate(`/dang-nhap?returnUrl=${encodeURIComponent('/tim-ban-cung-phong/dang-tin')}`);
          },
          disabled: false,
          tooltip: null,
        };
      }
      return {
        label: 'Đăng tin tìm bạn',
        action: () => {
          navigate('/tim-ban-cung-phong/dang-tin');
        },
        disabled: false,
        tooltip: null,
      };
    }

    case 'post-marketplace': {
      if (isGuest) {
        return {
          label: 'Đăng đồ của bạn',
          action: () => {
            showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để đăng thanh lý đồ cũ', 'info');
            navigate(`/dang-nhap?returnUrl=${encodeURIComponent('/cho-do-cu/dang-tin')}`);
          },
          disabled: false,
          tooltip: null,
        };
      }
      return {
        label: 'Đăng đồ của bạn',
        action: () => {
          navigate('/cho-do-cu/dang-tin');
        },
        disabled: false,
        tooltip: null,
      };
    }

    case 'upgrade-owner': {
      if (isGuest) {
        return {
          label: 'Đăng ký làm Chủ trọ',
          action: () => navigate('/dang-ky?intent=owner'),
          disabled: false,
          tooltip: null,
        };
      }
      if (role === 'owner') {
        return {
          label: 'Quản lý Chủ trọ',
          action: () => navigate('/chu-tro/tong-quan'),
          disabled: false,
          tooltip: null,
        };
      }
      if (ownerApplicationStatus === 'pending') {
        return {
          label: 'Đang xét duyệt...',
          action: () => navigate('/nang-cap-chu-tro/trang-thai'),
          disabled: true,
          tooltip: 'Đơn của bạn đang được xem xét trong 24h',
        };
      }
      if (ownerApplicationStatus === 'rejected') {
        return {
          label: 'Gửi lại đơn đăng ký',
          action: () => navigate('/nang-cap-chu-tro'),
          disabled: false,
          tooltip: null,
        };
      }
      return {
        label: 'Đăng ký làm Chủ trọ',
        action: () => navigate('/nang-cap-chu-tro'),
        disabled: false,
        tooltip: null,
      };
    }

    case 'manage-listings': {
      if (isGuest) {
        return {
          label: 'Đăng phòng cho thuê',
          action: () => navigate('/dang-ky?intent=owner'),
          disabled: false,
          tooltip: null,
        };
      }
      if (role === 'owner') {
        return {
          label: 'Quản lý phòng của tôi',
          action: () => navigate('/chu-tro/tong-quan'),
          disabled: false,
          tooltip: null,
        };
      }
      return {
        label: 'Đăng ký làm Chủ trọ',
        action: () => navigate('/nang-cap-chu-tro'),
        disabled: false,
        tooltip: null,
      };
    }

    default:
      return {
        label: 'Tiếp tục',
        action: () => {},
        disabled: false,
        tooltip: null,
      };
  }
}
