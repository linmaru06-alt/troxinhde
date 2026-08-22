import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { Search, X, Sparkles, MapPin, School, Building, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Mock list of Top Universities in Hanoi
export const HANOI_UNIVERSITIES_SUGGEST = [
  { name: 'ĐH Bách Khoa Hà Nội', short: 'Bách Khoa', district: 'Quận Hai Bà Trưng', count: 28 },
  { name: 'ĐHQG Hà Nội', short: 'ĐHQG', district: 'Quận Cầu Giấy', count: 35 },
  { name: 'ĐH Kinh Tế Quốc Dân', short: 'NEU', district: 'Quận Hai Bà Trưng', count: 24 },
  { name: 'ĐH Xây Dựng', short: 'Xây Dựng', district: 'Quận Hai Bà Trưng', count: 19 },
  { name: 'ĐH Sư Phạm Hà Nội', short: 'Sư Phạm', district: 'Quận Cầu Giấy', count: 22 },
  { name: 'ĐH Y Hà Nội', short: 'ĐH Y', district: 'Quận Đống Đa', count: 18 },
  { name: 'ĐH Ngoại Thương', short: 'FTU', district: 'Quận Đống Đa', count: 26 },
  { name: 'ĐH Luật Hà Nội', short: 'ĐH Luật', district: 'Quận Đống Đa', count: 15 },
  { name: 'Học Viện Ngân Hàng', short: 'HV Ngân Hàng', district: 'Quận Đống Đa', count: 20 },
  { name: 'ĐH FPT Hà Nội', short: 'FPT', district: 'Khu CNC Hòa Lạc', count: 16 },
  { name: 'ĐH Thủy Lợi', short: 'Thủy Lợi', district: 'Quận Đống Đa', count: 17 },
  { name: 'ĐH Giao Thông Vận Tải', short: 'GTVT', district: 'Quận Đống Đa', count: 21 },
];

// Mock list of Districts in Hanoi
export const HANOI_DISTRICTS_SUGGEST = [
  { name: 'Quận Cầu Giấy', short: 'Cầu Giấy', count: 48 },
  { name: 'Quận Đống Đa', short: 'Đống Đa', count: 42 },
  { name: 'Quận Hai Bà Trưng', short: 'Hai Bà Trưng', count: 36 },
  { name: 'Quận Thanh Xuân', short: 'Thanh Xuân', count: 39 },
  { name: 'Quận Nam Từ Liêm', short: 'Nam Từ Liêm', count: 29 },
  { name: 'Quận Bắc Từ Liêm', short: 'Bắc Từ Liêm', count: 25 },
  { name: 'Quận Hà Đông', short: 'Hà Đông', count: 31 },
  { name: 'Quận Ba Đình', short: 'Ba Đình', count: 23 },
  { name: 'Quận Hoàng Mai', short: 'Hoàng Mai', count: 18 },
  { name: 'Quận Hoàn Kiếm', short: 'Hoàn Kiếm', count: 14 },
  { name: 'Quận Tây Hồ', short: 'Tây Hồ', count: 16 },
  { name: 'Phường Láng Hạ', short: 'Láng Hạ', count: 12 },
  { name: 'Phường Dịch Vọng Hậu', short: 'Dịch Vọng Hậu', count: 15 },
];

// Mock list of Famous Student Hubs / Landmarks
export const HANOI_LANDMARKS_SUGGEST = [
  { name: 'Khu vực Chùa Láng', district: 'Quận Đống Đa', count: 19 },
  { name: 'Ngã tư Sở', district: 'Quận Đống Đa', count: 27 },
  { name: 'Khu vực Hồ Triều Khúc', district: 'Quận Thanh Xuân', count: 23 },
  { name: 'Chợ Nhà Xanh Cầu Giấy', district: 'Quận Cầu Giấy', count: 18 },
  { name: 'Khu Đô Thị Trung Hòa Nhân Chính', district: 'Quận Cầu Giấy', count: 16 },
  { name: 'Khu Đô Thị Mễ Trì', district: 'Quận Nam Từ Liêm', count: 14 },
];

// Helper to remove Vietnamese tones for fuzzy searching
function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

// Highlight matching text helper
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;

  const normalizedText = removeVietnameseTones(text);
  const normalizedQuery = removeVietnameseTones(query);
  const matchIndex = normalizedText.indexOf(normalizedQuery);

  if (matchIndex === -1) return <span>{text}</span>;

  const before = text.substring(0, matchIndex);
  const matched = text.substring(matchIndex, matchIndex + query.length);
  const after = text.substring(matchIndex + query.length);

  return (
    <span>
      {before}
      <strong className="text-[#006d37] font-black bg-emerald-100/60 px-0.5 rounded-sm">{matched}</strong>
      {after}
    </span>
  );
}

export interface SearchAutocompleteProps {
  placeholder?: string;
  initialValue?: string;
  onSelect?: (value: string, type: 'university' | 'district' | 'landmark') => void;
  className?: string;
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  placeholder = 'Tìm theo trường ĐH, quận, hoặc địa danh (vd: Bách Khoa, Cầu Giấy...)',
  initialValue = '',
  onSelect,
  className = '',
}) => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState<string>(initialValue);
  const [debouncedQuery, setDebouncedQuery] = useState<string>(initialValue);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  useOutsideClick(containerRef, () => setIsOpen(false), isOpen);

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue.trim());
    }, 200);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Match items across 3 groups
  const suggestions = useMemo(() => {
    if (!debouncedQuery) {
      return {
        universities: HANOI_UNIVERSITIES_SUGGEST.slice(0, 3),
        districts: HANOI_DISTRICTS_SUGGEST.slice(0, 3),
        landmarks: HANOI_LANDMARKS_SUGGEST.slice(0, 2),
      };
    }

    const normQ = removeVietnameseTones(debouncedQuery);

    const universities = HANOI_UNIVERSITIES_SUGGEST.filter(
      (u) => removeVietnameseTones(u.name).includes(normQ) || removeVietnameseTones(u.short).includes(normQ)
    );

    const districts = HANOI_DISTRICTS_SUGGEST.filter(
      (d) => removeVietnameseTones(d.name).includes(normQ) || removeVietnameseTones(d.short).includes(normQ)
    );

    const landmarks = HANOI_LANDMARKS_SUGGEST.filter(
      (l) => removeVietnameseTones(l.name).includes(normQ) || removeVietnameseTones(l.district).includes(normQ)
    );

    return { universities, districts, landmarks };
  }, [debouncedQuery]);

  const totalResults =
    suggestions.universities.length + suggestions.districts.length + suggestions.landmarks.length;

  const handleSelect = (text: string, type: 'university' | 'district' | 'landmark', districtFilter?: string) => {
    setInputValue(text);
    setIsOpen(false);
    if (onSelect) {
      onSelect(text, type);
    } else {
      if (type === 'district') {
        navigate(`/tim-kiem?khuVuc=${encodeURIComponent(text)}`);
      } else if (type === 'university') {
        navigate(`/tim-kiem?truong=${encodeURIComponent(text)}&q=${encodeURIComponent(text)}`);
      } else {
        navigate(`/tim-kiem?q=${encodeURIComponent(text)}`);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsOpen(false);
      if (inputValue.trim()) {
        navigate(`/tim-kiem?q=${encodeURIComponent(inputValue.trim())}`);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-gray-400 pointer-events-none">
          <Search className="w-4 h-4 text-[#006d37]" />
        </div>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-gray-50/90 border border-gray-200 hover:border-gray-300 focus:border-[#006d37] rounded-xl pl-10 pr-10 py-3 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006d37]/20 transition shadow-2xs font-medium"
        />

        {inputValue && (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              setIsOpen(false);
            }}
            className="absolute right-3 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Suggestions List */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-emerald-100 p-2 z-50 max-h-[75vh] overflow-y-auto"
          >
            {totalResults === 0 ? (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs font-bold text-gray-800">Không tìm thấy khu vực phù hợp</p>
                <p className="text-[11px] text-gray-500">
                  Thử tìm:
                  {['Cầu Giấy', 'Đống Đa', 'Bách Khoa', 'Chùa Láng'].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => handleSelect(quick, 'landmark')}
                      className="inline-block ml-1.5 px-2 py-0.5 bg-emerald-50 text-[#006d37] font-semibold rounded-md hover:bg-emerald-100 transition"
                    >
                      {quick}
                    </button>
                  ))}
                </p>
              </div>
            ) : (
              <div className="space-y-3 divide-y divide-gray-100">
                {/* GROUP 1: Trường đại học */}
                {suggestions.universities.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-3 pt-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-blue-600" />
                      <span>Trường đại học gần đây</span>
                    </div>
                    {suggestions.universities.map((uni) => (
                      <div
                        key={uni.name}
                        onClick={() => handleSelect(`Gần ${uni.name}`, 'university')}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-emerald-50 text-gray-800 transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">🎓</span>
                          <div className="text-left">
                            <p className="font-semibold text-gray-900 group-hover:text-[#006d37] transition">
                              Gần <HighlightMatch text={uni.name} query={debouncedQuery} />
                            </p>
                            <p className="text-[10px] text-gray-400">{uni.district}</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-[#006d37] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                          {uni.count} phòng
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* GROUP 2: Khu vực / Quận */}
                {suggestions.districts.length > 0 && (
                  <div className="space-y-1 pt-2">
                    <div className="px-3 pt-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Khu vực / Quận</span>
                    </div>
                    {suggestions.districts.map((d) => (
                      <div
                        key={d.name}
                        onClick={() => handleSelect(d.name, 'district')}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-emerald-50 text-gray-800 transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">📍</span>
                          <span className="font-semibold text-gray-900 group-hover:text-[#006d37] transition">
                            <HighlightMatch text={d.name} query={debouncedQuery} />
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-[#006d37] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                          {d.count} phòng
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* GROUP 3: Địa danh nổi tiếng */}
                {suggestions.landmarks.length > 0 && (
                  <div className="space-y-1 pt-2">
                    <div className="px-3 pt-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-amber-600" />
                      <span>Địa danh & Cụm sinh viên nổi tiếng</span>
                    </div>
                    {suggestions.landmarks.map((l) => (
                      <div
                        key={l.name}
                        onClick={() => handleSelect(l.name, 'landmark')}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-emerald-50 text-gray-800 transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">🏙️</span>
                          <div className="text-left">
                            <p className="font-semibold text-gray-900 group-hover:text-[#006d37] transition">
                              <HighlightMatch text={l.name} query={debouncedQuery} />
                            </p>
                            <p className="text-[10px] text-gray-400">{l.district}</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-[#006d37] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                          {l.count} phòng
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* View all button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      navigate(inputValue.trim() ? `/tim-kiem?q=${encodeURIComponent(inputValue.trim())}` : '/tim-kiem');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-[#006d37] hover:bg-emerald-50 rounded-xl transition"
                  >
                    <span>Xem tất cả phòng trọ Hà Nội</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
