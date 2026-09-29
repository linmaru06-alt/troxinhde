import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  RotateCcw,
  Check,
  AlertCircle,
  SlidersHorizontal,
  Clock,
  Truck,
  Sparkles,
  Camera,
  HandCoins,
} from 'lucide-react';
import {
  VALID_CONDITIONS,
  VALID_DELIVERY_METHODS,
  CONDITION_LABELS,
  DELIVERY_METHOD_LABELS,
  MarketplaceConditionCode,
  MarketplaceDeliveryMethodCode,
  MarketplaceTimeRange,
  validatePriceRange,
} from '../../lib/marketplaceFilter';

export interface AdvancedFilterValues {
  minPrice?: number;
  maxPrice?: number;
  conditions: MarketplaceConditionCode[];
  deliveryMethods: MarketplaceDeliveryMethodCode[];
  timeRange: MarketplaceTimeRange;
  isNegotiableOnly: boolean;
  hasImagesOnly: boolean;
}

export interface MarketplaceAdvancedFilterProps {
  isOpen: boolean;
  onClose: () => void;
  isFreeOnly: boolean;
  initialValues: AdvancedFilterValues;
  onApply: (values: AdvancedFilterValues) => void;
  activeCount: number;
}

/**
 * Nội dung các trường bộ lọc con (dùng chung cho cả Desktop Popover và Mobile Drawer)
 */
export const FilterContentSection: React.FC<{
  isFreeOnly: boolean;
  minPriceInput: string;
  setMinPriceInput: (val: string) => void;
  maxPriceInput: string;
  setMaxPriceInput: (val: string) => void;
  selectedConditions: MarketplaceConditionCode[];
  onToggleCondition: (val: MarketplaceConditionCode) => void;
  selectedDelivery: MarketplaceDeliveryMethodCode[];
  onToggleDelivery: (val: MarketplaceDeliveryMethodCode) => void;
  selectedTimeRange: MarketplaceTimeRange;
  onSelectTimeRange: (val: MarketplaceTimeRange) => void;
  isNegotiable: boolean;
  onToggleNegotiable: () => void;
  hasImagesOnly: boolean;
  onToggleHasImages: () => void;
  priceError?: string;
  onApply: () => void;
  onResetDraft: () => void;
}> = ({
  isFreeOnly,
  minPriceInput,
  setMinPriceInput,
  maxPriceInput,
  setMaxPriceInput,
  selectedConditions,
  onToggleCondition,
  selectedDelivery,
  onToggleDelivery,
  selectedTimeRange,
  onSelectTimeRange,
  isNegotiable,
  onToggleNegotiable,
  hasImagesOnly,
  onToggleHasImages,
  priceError,
  onApply,
  onResetDraft,
}) => {
  return (
    <div className="space-y-5 text-left">
      {/* 1. Khoảng giá (tự vô hiệu khi bật Đồ tặng miễn phí) */}
      <div className={`space-y-2.5 transition-opacity ${isFreeOnly ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#006d37]" />
            Khoảng giá (VNĐ)
          </label>
          {isFreeOnly && (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              Đang lọc đồ tặng 0đ
            </span>
          )}
        </div>

        {/* Mức giá nhanh */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: '< 50k', min: 0, max: 50000 },
            { label: '50k–200k', min: 50000, max: 200000 },
            { label: '200k–500k', min: 200000, max: 500000 },
            { label: '> 500k', min: 500000, max: undefined },
          ].map((preset) => {
            const isPresetActive =
              (preset.min === 0
                ? (minPriceInput === '' || minPriceInput === '0') && maxPriceInput === '50000'
                : preset.max !== undefined
                  ? minPriceInput === String(preset.min) && maxPriceInput === String(preset.max)
                  : minPriceInput === String(preset.min) && (maxPriceInput === '' || maxPriceInput === undefined));

            return (
              <button
                key={preset.label}
                type="button"
                disabled={isFreeOnly}
                onClick={() => {
                  setMinPriceInput(preset.min !== undefined && preset.min > 0 ? String(preset.min) : '');
                  setMaxPriceInput(preset.max !== undefined ? String(preset.max) : '');
                }}
                className={`py-1.5 px-1 text-[11px] font-medium rounded-xl border transition cursor-pointer text-center ${
                  isPresetActive
                    ? 'border-[#006d37] bg-emerald-50 text-[#006d37] font-bold shadow-2xs'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-gray-50/70 hover:bg-gray-100'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Nhập Min / Max */}
        <div className="flex items-center gap-2 pt-0.5">
          <div className="relative flex-1">
            <input
              type="number"
              disabled={isFreeOnly}
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              placeholder="Giá từ"
              className={`w-full px-3 py-1.5 text-xs rounded-xl border ${
                priceError ? 'border-rose-400 bg-rose-50/50' : 'border-gray-200 bg-gray-50/80'
              } focus:ring-1 focus:ring-[#006d37] focus:outline-none`}
            />
            <span className="absolute right-2.5 top-2 text-[10px] text-gray-400 pointer-events-none">đ</span>
          </div>
          <span className="text-gray-400 text-xs font-bold">–</span>
          <div className="relative flex-1">
            <input
              type="number"
              disabled={isFreeOnly}
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              placeholder="Đến"
              className={`w-full px-3 py-1.5 text-xs rounded-xl border ${
                priceError ? 'border-rose-400 bg-rose-50/50' : 'border-gray-200 bg-gray-50/80'
              } focus:ring-1 focus:ring-[#006d37] focus:outline-none`}
            />
            <span className="absolute right-2.5 top-2 text-[10px] text-gray-400 pointer-events-none">đ</span>
          </div>
        </div>

        {/* Thông báo lỗi min > max */}
        {priceError && (
          <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 pt-0.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {priceError}
          </p>
        )}
      </div>

      {/* 2. Tình trạng món đồ (Như mới / Còn tốt / Đã cũ - chọn nhiều) */}
      <div className="space-y-2 pt-2 border-t border-gray-100">
        <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#006d37]" />
            Tình trạng đồ
          </span>
          <span className="text-[11px] font-normal text-gray-400">Chọn nhiều</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {VALID_CONDITIONS.map((condCode) => {
            const isSelected = selectedConditions.includes(condCode);
            return (
              <button
                key={condCode}
                type="button"
                onClick={() => onToggleCondition(condCode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border ${
                  isSelected
                    ? 'bg-[#006d37] text-white border-[#006d37] shadow-2xs'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>{CONDITION_LABELS[condCode]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Cách nhận đồ (Gặp tại trường/KTX, Giao tận nơi, Tự đến lấy - chọn nhiều) */}
      <div className="space-y-2 pt-2 border-t border-gray-100">
        <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-[#006d37]" />
            Cách nhận đồ
          </span>
          <span className="text-[11px] font-normal text-gray-400">Chọn nhiều</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {VALID_DELIVERY_METHODS.map((methodCode) => {
            const isSelected = selectedDelivery.includes(methodCode);
            return (
              <button
                key={methodCode}
                type="button"
                onClick={() => onToggleDelivery(methodCode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border ${
                  isSelected
                    ? 'bg-[#006d37] text-white border-[#006d37] shadow-2xs'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>{DELIVERY_METHOD_LABELS[methodCode]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Thời gian đăng (Tất cả / 24 giờ qua / 7 ngày qua) */}
      <div className="space-y-2 pt-2 border-t border-gray-100">
        <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#006d37]" />
          Thời gian đăng
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: '24h', label: '24 giờ qua' },
            { id: '7d', label: '7 ngày qua' },
          ].map((item) => {
            const isSelected = selectedTimeRange === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTimeRange(item.id as MarketplaceTimeRange)}
                className={`py-1.5 px-2 rounded-xl text-xs font-medium transition cursor-pointer border text-center ${
                  isSelected
                    ? 'bg-[#006d37] text-white border-[#006d37] shadow-2xs font-bold'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Tùy chọn nâng cao: Có thể trả giá & Chỉ tin có ảnh */}
      <div className="space-y-2.5 pt-2 border-t border-gray-100">
        {/* Toggle Có thể trả giá */}
        <div
          onClick={onToggleNegotiable}
          className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-gray-100 transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <HandCoins className="w-4 h-4 text-[#006d37]" />
            <div>
              <p className="text-xs font-bold text-gray-800">Có thể trả giá</p>
              <p className="text-[10px] text-gray-500">Chỉ hiện người bán cho thương lượng giá</p>
            </div>
          </div>
          <div
            className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
              isNegotiable ? 'bg-[#006d37]' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${
                isNegotiable ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
        </div>

        {/* Toggle Chỉ tin có ảnh */}
        <div
          onClick={onToggleHasImages}
          className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-gray-100 transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#006d37]" />
            <div>
              <p className="text-xs font-bold text-gray-800">Chỉ tin có ảnh thực tế</p>
              <p className="text-[10px] text-gray-500">Bỏ qua tin chưa có hình ảnh chụp</p>
            </div>
          </div>
          <div
            className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
              hasImagesOnly ? 'bg-[#006d37]' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${
                hasImagesOnly ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
        </div>
      </div>

      {/* 6. Footer Buttons: Đặt lại & Áp dụng */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onResetDraft}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Đặt lại</span>
        </button>

        <button
          type="button"
          disabled={Boolean(priceError)}
          onClick={onApply}
          className={`flex-1 py-2 px-4 rounded-xl text-white text-xs font-bold shadow-sm transition text-center ${
            priceError
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-[#006d37] hover:bg-[#005a2e] cursor-pointer'
          }`}
        >
          Áp dụng bộ lọc
        </button>
      </div>
    </div>
  );
};

/**
 * Component chính: Hỗ trợ cả Desktop Popover và Mobile Bottom Sheet Drawer
 */
export const MarketplaceFilterDrawer: React.FC<MarketplaceAdvancedFilterProps> = ({
  isOpen,
  onClose,
  isFreeOnly,
  initialValues,
  onApply,
  activeCount,
}) => {
  // State nháp tạm thời trong Popover / Drawer để người dùng chỉnh sửa rồi mới bấm "Áp dụng"
  const [minPriceInput, setMinPriceInput] = useState<string>(
    initialValues.minPrice !== undefined ? String(initialValues.minPrice) : ''
  );
  const [maxPriceInput, setMaxPriceInput] = useState<string>(
    initialValues.maxPrice !== undefined ? String(initialValues.maxPrice) : ''
  );
  const [selectedConditions, setSelectedConditions] = useState<MarketplaceConditionCode[]>(
    initialValues.conditions || []
  );
  const [selectedDelivery, setSelectedDelivery] = useState<MarketplaceDeliveryMethodCode[]>(
    initialValues.deliveryMethods || []
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState<MarketplaceTimeRange>(
    initialValues.timeRange || 'all'
  );
  const [isNegotiable, setIsNegotiable] = useState<boolean>(initialValues.isNegotiableOnly || false);
  const [hasImagesOnly, setHasImagesOnly] = useState<boolean>(initialValues.hasImagesOnly || false);

  // Đồng bộ lại state nháp khi mở hoặc khi initialValues thay đổi
  useEffect(() => {
    if (isOpen) {
      setMinPriceInput(initialValues.minPrice !== undefined ? String(initialValues.minPrice) : '');
      setMaxPriceInput(initialValues.maxPrice !== undefined ? String(initialValues.maxPrice) : '');
      setSelectedConditions(initialValues.conditions || []);
      setSelectedDelivery(initialValues.deliveryMethods || []);
      setSelectedTimeRange(initialValues.timeRange || 'all');
      setIsNegotiable(initialValues.isNegotiableOnly || false);
      setHasImagesOnly(initialValues.hasImagesOnly || false);
    }
  }, [isOpen, initialValues]);

  // Khóa cuộn nền trên Mobile Drawer: lưu original overflow và khôi phục khi đóng hoặc unmount
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Lắng nghe phím Escape để đóng panel (hủy nháp)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const minNum = minPriceInput.trim() ? Number(minPriceInput) : undefined;
  const maxNum = maxPriceInput.trim() ? Number(maxPriceInput) : undefined;
  const priceValidation = validatePriceRange(minNum, maxNum);
  const priceError = !priceValidation.isValid ? priceValidation.error : undefined;

  const handleToggleCondition = (cond: MarketplaceConditionCode) => {
    setSelectedConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]
    );
  };

  const handleToggleDelivery = (method: MarketplaceDeliveryMethodCode) => {
    setSelectedDelivery((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const handleApplyInternal = () => {
    if (priceError) return;
    onApply({
      minPrice: minNum,
      maxPrice: maxNum,
      conditions: selectedConditions,
      deliveryMethods: selectedDelivery,
      timeRange: selectedTimeRange,
      isNegotiableOnly: isNegotiable,
      hasImagesOnly: hasImagesOnly,
    });
    onClose();
  };

  // Đặt lại chỉ reset nháp trong panel, không ảnh hưởng danh mục hay toggle miễn phí bên ngoài
  const handleResetDraftInternal = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    setSelectedConditions([]);
    setSelectedDelivery([]);
    setSelectedTimeRange('all');
    setIsNegotiable(false);
    setHasImagesOnly(false);
  };

  // Click outside ref cho desktop popover
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-filter-toggle="true"]')) {
          onClose();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* 1. DESKTOP POPOVER (Hiển thị nổi trên màn hình sm trở lên) */}
      <div className="hidden sm:block absolute right-0 top-full mt-2 z-50 w-[420px]" ref={popoverRef}>
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="bg-white rounded-3xl shadow-2xl border border-gray-200/90 p-5 space-y-4 ring-1 ring-black/5"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#006d37]" />
              <h3 className="text-sm font-black text-gray-900">Bộ Lọc Chi Tiết</h3>
              {activeCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#006d37] text-white text-[10px] font-black flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[65vh] overflow-y-auto pr-1 scrollbar-thin">
            <FilterContentSection
              isFreeOnly={isFreeOnly}
              minPriceInput={minPriceInput}
              setMinPriceInput={setMinPriceInput}
              maxPriceInput={maxPriceInput}
              setMaxPriceInput={setMaxPriceInput}
              selectedConditions={selectedConditions}
              onToggleCondition={handleToggleCondition}
              selectedDelivery={selectedDelivery}
              onToggleDelivery={handleToggleDelivery}
              selectedTimeRange={selectedTimeRange}
              onSelectTimeRange={setSelectedTimeRange}
              isNegotiable={isNegotiable}
              onToggleNegotiable={() => setIsNegotiable(!isNegotiable)}
              hasImagesOnly={hasImagesOnly}
              onToggleHasImages={() => setHasImagesOnly(!hasImagesOnly)}
              priceError={priceError}
              onApply={handleApplyInternal}
              onResetDraft={handleResetDraftInternal}
            />
          </div>
        </motion.div>
      </div>

      {/* 2. MOBILE BOTTOM SHEET DRAWER (Hiển thị trượt từ dưới lên trên màn hình nhỏ) */}
      <div className="sm:hidden fixed inset-0 z-50 flex items-end justify-center">
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
          className="relative w-full bg-white rounded-t-[2rem] shadow-2xl z-10 max-h-[85vh] flex flex-col overflow-hidden"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#006d37]" />
              <h3 className="text-base font-black text-gray-900 tracking-tight">Bộ Lọc Chi Tiết</h3>
              {activeCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#006d37] text-white text-[10px] font-black flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <FilterContentSection
              isFreeOnly={isFreeOnly}
              minPriceInput={minPriceInput}
              setMinPriceInput={setMinPriceInput}
              maxPriceInput={maxPriceInput}
              setMaxPriceInput={setMaxPriceInput}
              selectedConditions={selectedConditions}
              onToggleCondition={handleToggleCondition}
              selectedDelivery={selectedDelivery}
              onToggleDelivery={handleToggleDelivery}
              selectedTimeRange={selectedTimeRange}
              onSelectTimeRange={setSelectedTimeRange}
              isNegotiable={isNegotiable}
              onToggleNegotiable={() => setIsNegotiable(!isNegotiable)}
              hasImagesOnly={hasImagesOnly}
              onToggleHasImages={() => setHasImagesOnly(!hasImagesOnly)}
              priceError={priceError}
              onApply={handleApplyInternal}
              onResetDraft={handleResetDraftInternal}
            />
          </div>
        </motion.div>
      </div>
    </>
  );
};
