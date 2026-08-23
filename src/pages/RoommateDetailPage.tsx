import React, { useState } from 'react';
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
  Share2,
  Home,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Sparkles,
} from 'lucide-react';

export const RoommateDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { roommates, rooms, currentUser, savedRoommateIds, toggleSaveRoommate, getOrCreateThread, showToast } = useAppStore();
  const [showReport, setShowReport] = useState<boolean>(false);

  const post = roommates.find((r) => r.id === id) || roommates[0];
  const linkedRoom = rooms.find((r) => r.id === post?.linkedRoomId);
  const isSaved = savedRoommateIds.includes(post.id);

  if (!post) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold">Không tìm thấy bài đăng</h2>
        <Link to="/roommate" className="text-[#006d37] font-semibold mt-2 inline-block">← Về danh sách</Link>
      </div>
    );
  }

  const handleContactChat = () => {
    if (!currentUser) {
      showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để nhắn tin với người đăng bài', 'warning');
      navigate(`/dang-nhap?returnUrl=${encodeURIComponent(`/roommate/${post.id}`)}`);
      return;
    }
    const threadId = getOrCreateThread(post.userId, post.linkedRoomId);
    navigate(`/tin-nhan/${threadId}`);
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
              src={post.userAvatar}
              alt={post.userName}
              className="w-20 h-20 rounded-full object-cover ring-4 ring-emerald-100 shadow-md"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-gray-900">{post.userName}</h1>
                <Badge variant="verified" size="sm">Đã xác minh SV</Badge>
              </div>
              <p className="text-xs text-[#006d37] font-bold">{post.userSchool}</p>
              <p className="text-xs text-gray-500">{post.userAge} tuổi • Giới tính: {post.userGender}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleSaveRoommate(post.id)}
              className={`p-3 rounded-2xl border transition ${
                isSaved ? 'bg-rose-50 text-rose-500 border-rose-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
              }`}
            >
              <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
            <Button
              variant="primary"
              size="md"
              onClick={handleContactChat}
              leftIcon={<MessageSquare className="w-4 h-4" />}
            >
              Nhắn Tin Trò Chuyện
            </Button>
          </div>
        </div>

        {/* Budget & Target */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100">
          <div>
            <span className="text-xs text-emerald-800 font-medium">Ngân sách dự kiến chia đôi:</span>
            <div className="text-xl font-black text-[#006d37]">{formatCurrency(post.budgetShare)} / người</div>
          </div>
          <div>
            <span className="text-xs text-emerald-800 font-medium">Khu vực & Tiêu chí:</span>
            <div className="text-sm font-bold text-gray-900">{post.district} • {post.genderPreference}</div>
          </div>
        </div>

        {/* Intro */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-gray-900 uppercase">Giới thiệu bản thân:</h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
            "{post.intro}"
          </p>
        </div>

        {/* Habits & Tags */}
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
            className="text-xs text-gray-400 hover:text-rose-600 transition flex items-center justify-center gap-1 mx-auto"
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
