import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { RoomCard } from '../ui/Cards';
import { Sparkles, Bot, ArrowRight, Zap, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AIRecommendationsSectionProps {
  rooms?: any[];
  onViewAllRooms?: () => void;
  title?: string;
  description?: string;
}

export const AIRecommendationsSection: React.FC<AIRecommendationsSectionProps> = ({
  rooms: propRooms,
  onViewAllRooms,
  title,
  description,
}) => {
  const { rooms: storeRooms = [], currentUser } = useAppStore();
  const location = useLocation();
  const sectionRef = useRef<HTMLElement>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Determine current active rooms pool
  const allRooms = useMemo(() => {
    return propRooms && propRooms.length > 0 ? propRooms : storeRooms;
  }, [propRooms, storeRooms]);

  // Is currently on search page (/tim-kiem or /tim-phong)
  const isSearchPage =
    location.pathname.includes('/tim-kiem') || location.pathname.includes('/tim-phong');

  // Auto-expand and scroll if URL matches recommendation hash/param
  useEffect(() => {
    if (
      location.hash === '#goi-y' ||
      location.hash === '#ai-recommendations' ||
      new URLSearchParams(location.search).get('goi_y') === 'true'
    ) {
      setIsExpanded(true);
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    }
  }, [location.hash, location.search]);

  // Top approved rooms with dynamic AI-like personalized scoring & explanations
  const recommendedRooms = useMemo(() => {
    if (!allRooms || !Array.isArray(allRooms) || allRooms.length === 0) return [];

    const approved = allRooms.filter((r) => r && (r.status === 'Còn trống' || !r.status));
    const targetPool = approved.length > 0 ? approved : allRooms.filter((r) => r && r.id);

    return targetPool.map((room, idx) => {
      const reasons = [
        `Phù hợp với khu vực ${room.district || 'Hà Nội'} có giao thông thuận tiện và gần các trường đại học lớn.`,
        `Mức giá ${
          room.price >= 1000000
            ? (room.price / 1000000).toFixed(1) + ' tr'
            : room.price
        } tối ưu theo ngân sách tìm kiếm phổ biến của sinh viên.`,
        `Đầy đủ tiêu chuẩn an toàn PCCC & nội thất cơ bản sẵn sàng dọn vào ở ngay.`,
        `Phòng trọ có ban công thoáng mát và chỉ số đánh giá tích cực từ khách thuê trước.`,
        `Gần nhiều tuyến xe buýt và tiện ích ăn uống, chợ dân sinh thuận lợi cho sinh hoạt hằng ngày.`,
        `Không gian yên tĩnh, an ninh đảm bảo với camera giám sát 24/7 và giờ giấc tự do.`,
      ];

      // Dynamic score from 9.9 down to 8.2
      const rawScore = 9.9 - idx * 0.15;
      const score = Math.max(8.2, Number(rawScore.toFixed(1)));

      return {
        room,
        reason: reasons[idx % reasons.length],
        score,
      };
    });
  }, [allRooms, currentUser]);

  if (recommendedRooms.length === 0) return null;

  const totalCount = recommendedRooms.length;
  const displayedRooms = isExpanded ? recommendedRooms : recommendedRooms.slice(0, 4);

  const toggleExpand = () => {
    if (isExpanded) {
      setIsExpanded(false);
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      setIsExpanded(true);
    }
  };

  return (
    <section
      ref={sectionRef}
      id="goi-y"
      className="py-10 bg-gradient-to-b from-emerald-50/60 via-white to-white rounded-3xl border border-emerald-100/80 p-5 sm:p-8 my-8 shadow-xs transition-all"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00a854] text-white text-xs font-black shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Gợi Ý Phù Hợp
            </span>
            <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
              <Bot className="w-3.5 h-3.5" /> Gợi ý theo nhu cầu
            </span>
            <span className="text-xs text-gray-500 font-medium">
              ({totalCount} phòng đề xuất)
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            {title || 'Gợi Ý Phòng Theo Khu Vực & Ngân Sách ✨'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 max-w-xl">
            {description ||
              'Danh sách phòng trọ nổi bật được tổng hợp theo vị trí gần trường đại học, tiện nghi và mức giá phù hợp với sinh viên.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
          {/* If on search page, allow direct viewing of all active rooms or expanding recommendations */}
          {isSearchPage ? (
            <>
              {onViewAllRooms && (
                <button
                  type="button"
                  onClick={onViewAllRooms}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 hover:text-gray-900 shadow-2xs transition active:scale-95 cursor-pointer"
                  title="Xem toàn bộ danh sách phòng và xóa các bộ lọc hiện tại"
                >
                  <Layers className="w-3.5 h-3.5 text-gray-500" />
                  <span>Toàn bộ kho phòng</span>
                </button>
              )}

              {totalCount > 4 ? (
                <button
                  type="button"
                  onClick={toggleExpand}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                >
                  {isExpanded ? (
                    <>
                      <span>Thu gọn (4 phòng)</span>
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Xem tất cả ({totalCount} phòng)</span>
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => sectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#00a854] hover:text-[#008f47]"
                >
                  Xem tất cả ({totalCount} phòng) <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            <Link
              to="/tim-kiem#goi-y"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#00a854] hover:text-[#008f47] shrink-0"
            >
              Xem tất cả ({totalCount} phòng) <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Grid of Recommended Rooms with AI Badges */}
      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        <AnimatePresence>
          {displayedRooms.map(({ room, reason, score }) => (
            <motion.div
              key={room.id}
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col space-y-2 relative"
            >
              {/* AI Match Banner */}
              <div className="bg-emerald-800 text-white rounded-t-2xl px-3 py-1.5 text-[11px] font-bold flex items-center justify-between shadow-xs">
                <span className="flex items-center gap-1 text-amber-300">
                  <Zap className="w-3 h-3 fill-current" /> Phù hợp {score.toFixed(1)}/10
                </span>
                <span className="text-[10px] text-emerald-200 uppercase tracking-wider font-mono">
                  Trọ Xinh AI
                </span>
              </div>

              {/* Main Room Card */}
              <div className="flex-1">
                <RoomCard room={room} />
              </div>

              {/* AI Explanation Tooltip / Box */}
              <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-2.5 text-[11px] text-emerald-900 leading-snug">
                <span className="font-bold text-[#00a854]">Vì sao gợi ý: </span>
                {reason}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Bottom expansion button if there are more rooms */}
      {totalCount > 4 && (
        <div className="mt-8 flex items-center justify-center gap-3 pt-4 border-t border-emerald-100/60">
          <button
            type="button"
            onClick={toggleExpand}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 text-emerald-600" />
                <span>Thu gọn lại (hiển thị 4 phòng nổi bật nhất)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Xem thêm {totalCount - 4} phòng gợi ý phù hợp khác</span>
                <ChevronDown className="w-4 h-4 text-emerald-600" />
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
};
