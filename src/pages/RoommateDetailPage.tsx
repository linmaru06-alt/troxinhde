import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatPrice } from '../components/ui/Cards';
import { ReportModal } from '../components/modals/ReportModal';
import {
  Users,
  Heart,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

import { getOrCreateConversation } from '../lib/api/messages';
import { getRoommatePostById } from '../lib/api/roommates';
import type { RoommatePost } from '../types';

/**
 * Hàm làm mờ số điện thoại hoặc link liên hệ ngoài luồng trong nội dung tự giới thiệu
 * để bảo vệ quyền riêng tư và tránh lừa đảo.
 */
function maskContactInfo(text: string): string {
  if (!text) return '';
  // Mask số điện thoại VN (10-11 chữ số, có thể cách nhau bởi dấu chấm, khoảng trắng, gạch nối)
  const phoneRegex = /(0[3|5|7|8|9][0-9]{1}[.\s-]?[0-9]{3}[.\s-]?[0-9]{3,4})/g;
  let masked = text.replace(phoneRegex, (m) => m.slice(0, 3) + '***' + m.slice(-3));
  // Mask link Zalo / Facebook
  masked = masked.replace(/(zalo\.me\/[a-zA-Z0-9_.-]+)/gi, '[Liên hệ được bảo mật]');
  masked = masked.replace(/(facebook\.com\/[a-zA-Z0-9_.-]+)/gi, '[Liên hệ được bảo mật]');
  return masked;
}

export const RoommateDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { roommates, rooms, currentUser, savedRoommateIds, toggleSaveRoommate, showToast } = useAppStore();
  const [showReport, setShowReport] = useState<boolean>(false);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  const [post, setPost] = useState<RoommatePost | null>(() => {
    return roommates.find((r) => r.id === id) || null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(!post && Boolean(id));

  useEffect(() => {
    if (!id) return;
    const storePost = roommates.find((r) => r.id === id);
    if (storePost) {
      setPost(storePost);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    getRoommatePostById(id)
      .then((data) => {
        if (isMounted) {
          setPost(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('[RoommateDetail] Lỗi tải bài đăng chi tiết:', err);
        if (isMounted) {
          setPost(null);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, roommates]);

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#006d37] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-gray-600">Đang tải thông tin hồ sơ bạn cùng phòng...</p>
      </div>
    );
  }

  // Not Found State (Tuyệt đối không tự động lấy tin người khác gán vào)
  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-gray-900">Không tìm thấy bài đăng tìm bạn này</h2>
        <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
          Bài đăng có thể đã hết hạn, đã ghép thành công hoặc mã bài đăng không tồn tại trong hệ thống.
        </p>
        <Link
          to="/roommate"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#006d37] text-white text-xs font-bold shadow-md hover:bg-[#00552b] transition"
        >
          ← Quay lại danh sách tìm bạn
        </Link>
      </div>
    );
  }

  const linkedRoom = rooms.find((r) => r.id === post.linkedRoomId);
  const isSaved = savedRoommateIds.includes(post.id);

  const handleContactChat = async () => {
    if (!currentUser) {
      showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để nhắn tin với người đăng bài', 'warning');
      navigate(`/dang-nhap?returnUrl=${encodeURIComponent(`/roommate/${post.id}`)}`);
      return;
    }
    if (currentUser.id === post.userId) {
      showToast('Đây là bài đăng của bạn', 'Không thể tự nhắn tin cho chính mình', 'info');
      return;
    }

    setIsChatLoading(true);
    try {
      const convId = await getOrCreateConversation(currentUser.id, post.userId, post.linkedRoomId);
      navigate(`/tin-nhan/${convId}`);
    } catch (err: any) {
      console.error('[RoommateDetail] Lỗi mở chat:', err);
      showToast('Không thể mở cuộc trò chuyện', err?.message || 'Vui lòng thử lại sau', 'error');
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link to="/" className="hover:text-[#006d37]">Trang chủ</Link>
        <span>/</span>
        <Link to="/roommate" className="hover:text-[#006d37]">Tìm bạn ở ghép</Link>
        <span>/</span>
        <span className="text-gray-900 font-bold truncate">{post.userName}</span>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <img
              src={post.userAvatar || '/images/user-avatar.jpg'}
              alt={post.userName}
              className="w-20 h-20 rounded-full object-cover ring-4 ring-emerald-100 shadow-md"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-gray-900">{post.userName}</h1>
                <Badge variant="verified" size="sm">Đã xác minh hồ sơ</Badge>
              </div>
              {post.userSchool && (
                <p className="text-xs text-[#006d37] font-bold">{post.userSchool}</p>
              )}
              <p className="text-xs text-gray-500">{post.userAge} tuổi • Giới tính: {post.userGender}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleSaveRoommate(post.id)}
              className={`p-3 rounded-2xl border transition cursor-pointer ${
                isSaved ? 'bg-rose-50 text-rose-500 border-rose-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
              }`}
            >
              <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
            <Button
              variant="primary"
              size="md"
              disabled={isChatLoading}
              onClick={handleContactChat}
              leftIcon={<MessageSquare className="w-4 h-4" />}
            >
              {isChatLoading ? 'Đang mở hội thoại...' : 'Nhắn Tin Trò Chuyện'}
            </Button>
          </div>
        </div>

        {/* Security & Privacy Notice Banner */}
        <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-xs text-[#006d37] font-medium">
          <ShieldCheck className="w-5 h-5 shrink-0 text-[#006d37]" />
          <span>
            Thông tin liên lạc cá nhân được bảo vệ an toàn. Mọi trao đổi diễn ra trực tiếp qua hệ thống Chat Trọ Xinh để phòng ngừa rủi ro.
          </span>
        </div>

        {/* Budget & Target */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
          <div>
            <span className="text-xs text-gray-500 font-medium">Ngân sách dự kiến chia sẻ:</span>
            <div className="text-xl font-black text-[#006d37]">{formatCurrency(post.budgetShare)} / người</div>
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium">Khu vực & Tiêu chí:</span>
            <div className="text-sm font-bold text-gray-900">{post.district} • {post.genderPreference}</div>
          </div>
        </div>

        {/* Intro */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-gray-900 uppercase">Giới thiệu bản thân:</h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
            "{maskContactInfo(post.intro)}"
          </p>
        </div>

        {/* Habits & Tags */}
        {post.habits && post.habits.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 uppercase">Thói quen sinh hoạt:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {post.habits.map((h, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl text-xs font-semibold text-gray-700 border border-gray-100">
                  <CheckCircle2 className="w-4 h-4 text-[#006d37] shrink-0" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actual Living Space Images (if present) */}
        {Array.isArray(post.images) && post.images.length > 0 && (
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <h3 className="text-sm font-bold text-gray-900 uppercase">Ảnh phòng / không gian sống thực tế:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {post.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Ảnh không gian ${idx + 1}`}
                  className="w-full h-36 sm:h-44 object-cover rounded-2xl border border-gray-200 shadow-xs"
                />
              ))}
            </div>
          </div>
        )}

        {/* Linked Room */}
        {linkedRoom && (
          <div className="pt-6 border-t border-gray-100 space-y-3">
            <h3 className="text-sm font-bold text-gray-900 uppercase">Phòng trọ đang ở / muốn cùng thuê:</h3>
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <img
                src={linkedRoom.images[0]}
                alt={linkedRoom.title}
                className="w-full sm:w-28 h-24 rounded-xl object-cover"
              />
              <div className="flex-1 overflow-hidden space-y-1">
                <span className="text-xs font-bold text-[#006d37]">{formatPrice(linkedRoom.price)}</span>
                <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{linkedRoom.title}</h4>
                <p className="text-xs text-gray-500 truncate">{linkedRoom.address}</p>
              </div>
              <Link to={`/phong/${linkedRoom.id}`}>
                <Button variant="outline" size="sm">
                  Xem Chi Tiết Phòng
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Report Button */}
        <div className="pt-4 text-center">
          <button
            onClick={() => setShowReport(true)}
            className="text-xs text-gray-400 hover:text-rose-600 transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Báo cáo tin tìm bạn không đúng sự thật
          </button>
        </div>
      </div>

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        targetTitle={`Bài tìm bạn: ${post.userName}`}
        targetId={post.id}
      />
    </div>
  );
};
