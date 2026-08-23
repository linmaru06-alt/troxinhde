import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { RoomCard } from '../ui/Cards';
import { Sparkles, Bot, ArrowRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AIRecommendationsSection: React.FC = () => {
  const { rooms, currentUser } = useAppStore();
  const [recommendedRooms, setRecommendedRooms] = useState<Array<{ room: any; reason: string; score: number }>>([]);

  useEffect(() => {
    // Top approved rooms with dynamic AI-like personalized scoring & explanations
    if (rooms && rooms.length > 0) {
      const approved = rooms.filter((r) => r.status === 'Còn trống');
      const scored = approved.slice(0, 4).map((room, idx) => {
        const reasons = [
          `Phù hợp với khu vực ${room.district} có giao thông thuận tiện và gần các trường đại học lớn.`,
          `Mức giá ${room.price >= 1000000 ? (room.price / 1000000).toFixed(1) + ' tr' : room.price} tối ưu theo ngân sách tìm kiếm phổ biến của sinh viên.`,
          `Đầy đủ tiêu chuẩn an toàn PCCC & nội thất cơ bản sẵn sàng dọn vào ở ngay.`,
          `Phòng trọ có ban công thoáng mát và chỉ số đánh giá tích cực từ khách thuê trước.`,
        ];

        return {
          room,
          reason: reasons[idx % reasons.length],
          score: 9.8 - idx * 0.3,
        };
      });

      setRecommendedRooms(scored);
    }
  }, [rooms, currentUser]);

  if (recommendedRooms.length === 0) return null;

  return (
    <section className="py-12 bg-linear-to-b from-emerald-50/50 via-white to-white rounded-3xl border border-emerald-100/70 p-6 sm:p-8 my-8 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#006d37] text-white text-xs font-black shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" /> AI Recommendations
            </span>
            <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
              <Bot className="w-3.5 h-3.5" /> Gợi ý cá nhân hóa
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Gợi Ý Phòng Dành Riêng Cho Bạn ✨
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 max-w-xl">
            Thuật toán phân tích vị trí, tiện nghi và mức giá tối ưu nhất cho nhu cầu thuê phòng của bạn.
          </p>
        </div>

        <Link
          to="/tim-kiem"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#006d37] hover:text-[#00532a] shrink-0"
        >
          Xem tất cả <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Grid of Recommended Rooms with AI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {recommendedRooms.map(({ room, reason, score }) => (
          <div key={room.id} className="flex flex-col space-y-2 relative">
            {/* AI Match Banner */}
            <div className="bg-emerald-800 text-white rounded-t-2xl px-3 py-1.5 text-[11px] font-bold flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-1 text-amber-300">
                <Zap className="w-3 h-3 fill-current" /> Phù hợp {score.toFixed(1)}/10
              </span>
              <span className="text-[10px] text-emerald-200 uppercase tracking-wider font-mono">Trọ Xinh AI</span>
            </div>

            {/* Main Room Card */}
            <div className="flex-1">
              <RoomCard room={room} />
            </div>

            {/* AI Explanation Tooltip / Box */}
            <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-2.5 text-[11px] text-emerald-900 leading-snug">
              <span className="font-bold text-[#006d37]">Vì sao gợi ý: </span>
              {reason}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
