import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, RotateCcw, Check, Sparkles, AlertCircle, Gift, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { MarketplaceSortOption } from '../../lib/marketplaceFilter';

export interface MarketplaceFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  allCategories: string[];
  selectedCategories: string[];
  onToggleCategory: (cat: string) => void;
  districts: string[];
  selectedDistrict: string;
  onSelectDistrict: (dist: string) => void;
  minPriceInput: string;
  maxPriceInput: string;
  onChangeMinPrice: (val: string) => void;
  onChangeMaxPrice: (val: string) => void;
  onSelectPresetPrice: (min?: number, max?: number) => void;
  isFreeOnly: boolean;
  onToggleFreeOnly: () => void;
  priceError?: string;
  selectedSort: MarketplaceSortOption;
  onChangeSort: (sort: MarketplaceSortOption) => void;
  onResetAll: () => void;
  totalResults: number;
}

export const MarketplaceFilterDrawer: React.FC<MarketplaceFilterDrawerProps> = ({
  isOpen,
  onClose,
  allCategories,
  selectedCategories,
  onToggleCategory,
  districts,
  selectedDistrict,
  onSelectDistrict,
  minPriceInput,
  maxPriceInput,
  onChangeMinPrice,
  onChangeMaxPrice,
  onSelectPresetPrice,
  isFreeOnly,
  onToggleFreeOnly,
  priceError,
  selectedSort,
  onChangeSort,
  onResetAll,
  totalResults,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Bottom Sheet Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose();
            }}
            className="relative w-full bg-white rounded-t-[2rem] shadow-2xl z-10 max-h-[85vh] flex flex-col overflow-hidden"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
          >
            {/* Drag Handle Bar */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-2 cursor-grab active:cursor-grabbing" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#006d37]" />
                <h3 className="text-base font-black text-gray-900 tracking-tight">Bộ Lọc Sản Phẩm</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {/* 1. Toggle "Chỉ đồ miễn phí" */}
              <div className="flex items-center justify-between p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-emerald-950 block">Chỉ tìm đồ miễn phí (0đ)</span>
                    <span className="text-[11px] text-emerald-700 font-medium">Tự động ẩn đồ tính tiền</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onToggleFreeOnly}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isFreeOnly ? 'bg-[#006d37]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isFreeOnly ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* 2. Danh mục (Chọn 1 hoặc nhiều) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Danh mục món đồ
                  </label>
                  <span className="text-[11px] text-gray-400 font-medium">Chọn một hoặc nhiều</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {allCategories.map((cat) => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => onToggleCategory(cat)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-[#006d37] text-white shadow-xs'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Khoảng giá (bị vô hiệu hóa nếu bật Chỉ đồ miễn phí) */}
              <div className={`space-y-3 transition-opacity ${isFreeOnly ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Khoảng giá (VNĐ)
                  </label>
                  {isFreeOnly && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                      Đang bật lọc 0đ
                    </span>
                  )}
                </div>

                {/* Các mức chọn nhanh (Presets) */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isFreeOnly}
                    onClick={() => onSelectPresetPrice(0, 50000)}
                    className="py-2 px-3 text-xs font-bold rounded-xl border border-gray-200 hover:border-[#006d37] hover:bg-emerald-50/40 text-gray-700 transition"
                  >
                    Dưới 50k
                  </button>
                  <button
                    type="button"
                    disabled={isFreeOnly}
                    onClick={() => onSelectPresetPrice(50000, 200000)}
                    className="py-2 px-3 text-xs font-bold rounded-xl border border-gray-200 hover:border-[#006d37] hover:bg-emerald-50/40 text-gray-700 transition"
                  >
                    50k – 200k
                  </button>
                  <button
                    type="button"
                    disabled={isFreeOnly}
                    onClick={() => onSelectPresetPrice(200000, 500000)}
                    className="py-2 px-3 text-xs font-bold rounded-xl border border-gray-200 hover:border-[#006d37] hover:bg-emerald-50/40 text-gray-700 transition"
                  >
                    200k – 500k
                  </button>
                  <button
                    type="button"
                    disabled={isFreeOnly}
                    onClick={() => onSelectPresetPrice(500000, undefined)}
                    className="py-2 px-3 text-xs font-bold rounded-xl border border-gray-200 hover:border-[#006d37] hover:bg-emerald-50/40 text-gray-700 transition"
                  >
                    Trên 500k
                  </button>
                </div>

                {/* 2 ô nhập tự do */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Từ giá</label>
                    <input
                      type="number"
                      disabled={isFreeOnly}
                      value={minPriceInput}
                      onChange={(e) => onChangeMinPrice(e.target.value)}
                      placeholder="0 đ"
                      className={`w-full px-3 py-2 text-xs font-bold rounded-xl border ${
                        priceError ? 'border-rose-400 bg-rose-50/40' : 'border-gray-200 bg-gray-50'
                      } focus:outline-none focus:ring-2 focus:ring-[#006d37]`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Đến giá</label>
                    <input
                      type="number"
                      disabled={isFreeOnly}
                      value={maxPriceInput}
                      onChange={(e) => onChangeMaxPrice(e.target.value)}
                      placeholder="500.000 đ"
                      className={`w-full px-3 py-2 text-xs font-bold rounded-xl border ${
                        priceError ? 'border-rose-400 bg-rose-50/40' : 'border-gray-200 bg-gray-50'
                      } focus:outline-none focus:ring-2 focus:ring-[#006d37]`}
                    />
                  </div>
                </div>

                {/* Thông báo lỗi validate */}
                {priceError && (
                  <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {priceError}
                  </p>
                )}
              </div>

              {/* 4. Khu vực (Quận / Huyện) */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-900 uppercase tracking-wider block">
                  Khu vực (Hà Nội)
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => onSelectDistrict(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#006d37]"
                >
                  <option value="">Tất cả khu vực</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Sắp xếp kết quả */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                  Sắp xếp hiển thị
                </label>
                <select
                  value={selectedSort}
                  onChange={(e) => onChangeSort(e.target.value as MarketplaceSortOption)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#006d37]"
                >
                  <option value="newest">Mới nhất trước</option>
                  <option value="price_asc">Giá: Thấp → Cao</option>
                  <option value="price_desc">Giá: Cao → Thấp</option>
                </select>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
              <button
                type="button"
                onClick={onResetAll}
                className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Thiết lập lại</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-[#006d37] hover:bg-[#005a2d] text-white text-xs font-black tracking-wide transition shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>Xem {totalResults} sản phẩm</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
