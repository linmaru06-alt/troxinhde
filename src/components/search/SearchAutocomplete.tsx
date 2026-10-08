import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { useDebounce } from '../../hooks/useDebounce';
import { Search, X, Sparkles, MapPin, School, Building, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  isPublicRoom,
  removeVietnameseTones,
  isSchoolMatch,
  isDistrictMatch,
  normalizeSchoolName,
} from '../../lib/roomSearch';

// Danh sách trường đại học tiêu biểu tại Hà Nội kèm các bí danh / viết tắt thông dụng
export const HANOI_UNIVERSITIES_DATA = [
  {
    name: 'ĐH Bách Khoa Hà Nội',
    short: 'Bách Khoa',
    aliases: ['hust', 'bk', 'bkhn', 'bach khoa'],
    district: 'Quận Hai Bà Trưng',
  },
  {
    name: 'ĐHQG Hà Nội',
    short: 'ĐHQG',
    aliases: ['vnu', 'dhqg', 'quoc gia', 'uet', 'hus', 'ussh', 'ulis'],
    district: 'Quận Cầu Giấy',
  },
  {
    name: 'ĐH Kinh Tế Quốc Dân',
    short: 'NEU',
    aliases: ['neu', 'ktqd', 'kinh te'],
    district: 'Quận Hai Bà Trưng',
  },
  {
    name: 'ĐH Ngoại Thương',
    short: 'FTU',
    aliases: ['ftu', 'ngoai thuong'],
    district: 'Quận Đống Đa',
  },
  {
    name: 'ĐH Sư Phạm Hà Nội',
    short: 'Sư Phạm',
    aliases: ['hnue', 'dhsp', 'su pham'],
    district: 'Quận Cầu Giấy',
  },
  {
    name: 'ĐH Xây Dựng',
    short: 'Xây Dựng',
    aliases: ['nuce', 'huce', 'dhxd', 'xay dung'],
    district: 'Quận Hai Bà Trưng',
  },
  {
    name: 'ĐH Thương Mại',
    short: 'Thương Mại',
    aliases: ['tmu', 'dhtm', 'thuong mai'],
    district: 'Quận Cầu Giấy',
  },
  {
    name: 'Học Viện Ngân Hàng',
    short: 'HV Ngân Hàng',
    aliases: ['hvnh', 'ba', 'ngan hang'],
    district: 'Quận Đống Đa',
  },
  {
    name: 'Học Viện Báo Chí & Tuyên Truyền',
    short: 'Báo Chí',
    aliases: ['ajc', 'hvbc', 'bao chi'],
    district: 'Quận Cầu Giấy',
  },
  {
    name: 'Học Viện Bưu Chính Viễn Thông',
    short: 'Bưu Chính',
    aliases: ['ptit', 'buu chinh'],
    district: 'Quận Hà Đông',
  },
  {
    name: 'Học Viện Ngoại Giao',
    short: 'Ngoại Giao',
    aliases: ['dav', 'hvng', 'ngoai giao'],
    district: 'Quận Đống Đa',
  },
  {
    name: 'ĐH Giao Thông Vận Tải',
    short: 'GTVT',
    aliases: ['utc', 'gtvt', 'giao thong'],
    district: 'Quận Đống Đa',
  },
  {
    name: 'ĐH Y Hà Nội',
    short: 'ĐH Y',
    aliases: ['hmu', 'dhy', 'y ha noi'],
    district: 'Quận Đống Đa',
  },
  {
    name: 'ĐH Luật Hà Nội',
    short: 'ĐH Luật',
    aliases: ['hlu', 'dhluat', 'luat'],
    district: 'Quận Đống Đa',
  },
  {
    name: 'ĐH Kiến Trúc Hà Nội',
    short: 'Kiến Trúc',
    aliases: ['hau', 'dhkt', 'kien truc'],
    district: 'Quận Hà Đông',
  },
  {
    name: 'ĐH Hà Nội',
    short: 'HANU',
    aliases: ['hanu', 'dhhn', 'dh ha noi'],
    district: 'Quận Nam Từ Liêm',
  },
  {
    name: 'ĐH Thủy Lợi',
    short: 'Thủy Lợi',
    aliases: ['tlu', 'dhtl', 'thuy loi'],
    district: 'Quận Đống Đa',
  },
  {
    name: 'ĐH Công Nghiệp Hà Nội',
    short: 'Công Nghiệp',
    aliases: ['haui', 'dhcn', 'cong nghiep'],
    district: 'Quận Bắc Từ Liêm',
  },
  {
    name: 'ĐH FPT Hà Nội',
    short: 'FPT',
    aliases: ['fpt'],
    district: 'Khu CNC Hòa Lạc',
  },
];

// Danh sách các quận trọng điểm tại Hà Nội
export const HANOI_DISTRICTS_DATA = [
  { name: 'Quận Cầu Giấy', short: 'Cầu Giấy' },
  { name: 'Quận Đống Đa', short: 'Đống Đa' },
  { name: 'Quận Hai Bà Trưng', short: 'Hai Bà Trưng' },
  { name: 'Quận Thanh Xuân', short: 'Thanh Xuân' },
  { name: 'Quận Nam Từ Liêm', short: 'Nam Từ Liêm' },
  { name: 'Quận Bắc Từ Liêm', short: 'Bắc Từ Liêm' },
  { name: 'Quận Hà Đông', short: 'Hà Đông' },
  { name: 'Quận Ba Đình', short: 'Ba Đình' },
  { name: 'Quận Hoàng Mai', short: 'Hoàng Mai' },
  { name: 'Quận Hoàn Kiếm', short: 'Hoàn Kiếm' },
  { name: 'Quận Tây Hồ', short: 'Tây Hồ' },
  { name: 'Quận Long Biên', short: 'Long Biên' },
];

// Danh sách địa danh, tuyến đường & cụm sinh viên nổi tiếng
export const HANOI_LANDMARKS_DATA = [
  { name: 'Khu vực Chùa Láng', keyword: 'chùa láng', district: 'Quận Đống Đa' },
  { name: 'Ngã tư Sở', keyword: 'ngã tư sở', district: 'Quận Đống Đa' },
  { name: 'Khu vực Hồ Triều Khúc', keyword: 'triều khúc', district: 'Quận Thanh Xuân' },
  { name: 'Chợ Nhà Xanh Cầu Giấy', keyword: 'nhà xanh', district: 'Quận Cầu Giấy' },
  { name: 'Khu Đô Thị Trung Hòa Nhân Chính', keyword: 'trung hòa', district: 'Quận Cầu Giấy' },
  { name: 'Khu Đô Thị Mễ Trì', keyword: 'mễ trì', district: 'Quận Nam Từ Liêm' },
  { name: 'Đường Hồ Tùng Mậu', keyword: 'hồ tùng mậu', district: 'Quận Cầu Giấy' },
  { name: 'Khu Bách Kinh Xây (Tạ Quang Bửu)', keyword: 'tạ quang bửu', district: 'Quận Hai Bà Trưng' },
  { name: 'Phố Dịch Vọng Hậu', keyword: 'dịch vọng hậu', district: 'Quận Cầu Giấy' },
];

// Highlight matching text helper
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;

  const normalizedText = removeVietnameseTones(text).toLowerCase();
  const normalizedQuery = removeVietnameseTones(query).toLowerCase();
  const matchIndex = normalizedText.indexOf(normalizedQuery);

  if (matchIndex === -1) return <span>{text}</span>;

  const before = text.substring(0, matchIndex);
  const matched = text.substring(matchIndex, matchIndex + query.length);
  const after = text.substring(matchIndex + query.length);

  return (
    <span>
      {before}
      <strong className="text-[#006d37] font-black bg-emerald-100/60 px-0.5 rounded-xs">{matched}</strong>
      {after}
    </span>
  );
}

export interface SearchAutocompleteProps {
  placeholder?: string;
  initialValue?: string;
  rooms?: any[];
  onSelect?: (value: string, type: 'university' | 'district' | 'landmark') => void;
  className?: string;
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  placeholder = 'Tìm phòng theo trường ĐH, quận hoặc địa danh (vd: Bách Khoa, Cầu Giấy, Chùa Láng...)',
  initialValue = '',
  rooms: propRooms,
  onSelect,
  className = '',
}) => {
  const navigate = useNavigate();
  const { rooms: storeRooms = [] } = useAppStore();
  const [inputValue, setInputValue] = useState<string>(initialValue);
  const debouncedQuery = useDebounce(inputValue.trim(), 250);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  useOutsideClick(containerRef, () => setIsOpen(false), isOpen);

  // Sync internal state when initialValue changes
  useEffect(() => {
    setInputValue(initialValue || '');
  }, [initialValue]);

  // Lấy danh sách các phòng hợp lệ & công khai đang hoạt động
  const activeRooms = useMemo(() => {
    const raw = (propRooms && propRooms.length > 0 ? propRooms : storeRooms) || [];
    return raw.filter(isPublicRoom);
  }, [propRooms, storeRooms]);

  // 1. Tính toán số phòng THỰC TẾ cho từng trường ĐH theo thời gian thực
  const universitiesWithCounts = useMemo(() => {
    return HANOI_UNIVERSITIES_DATA.map((uni) => {
      const count = activeRooms.filter((r) => {
        if (!r.nearestSchool) return false;
        // Kiểm tra khớp tên chuẩn
        if (isSchoolMatch(uni.name, r.nearestSchool)) return true;
        // Kiểm tra khớp tên ngắn
        if (isSchoolMatch(uni.short, r.nearestSchool)) return true;
        // Kiểm tra khớp bất kỳ alias nào (hust, neu, ftu...)
        return uni.aliases.some((alias) => isSchoolMatch(alias, r.nearestSchool));
      }).length;

      return {
        ...uni,
        count,
      };
    });
  }, [activeRooms]);

  // 2. Tính toán số phòng THỰC TẾ cho từng quận theo thời gian thực
  const districtsWithCounts = useMemo(() => {
    return HANOI_DISTRICTS_DATA.map((d) => {
      const count = activeRooms.filter((r) => isDistrictMatch(r.district, d.name)).length;
      return {
        ...d,
        count,
      };
    });
  }, [activeRooms]);

  // 3. Tính toán số phòng THỰC TẾ cho từng địa danh theo thời gian thực
  const landmarksWithCounts = useMemo(() => {
    return HANOI_LANDMARKS_DATA.map((l) => {
      const normKw = removeVietnameseTones(l.keyword).toLowerCase();
      const count = activeRooms.filter((r) => {
        const fullSearchable = removeVietnameseTones(
          `${r.title} ${r.address} ${r.district} ${r.nearestSchool || ''} ${r.description || ''}`
        ).toLowerCase();
        return fullSearchable.includes(normKw);
      }).length;

      return {
        ...l,
        count,
      };
    });
  }, [activeRooms]);

  // Lọc và sắp xếp thông minh danh sách gợi ý
  const suggestions = useMemo(() => {
    if (!debouncedQuery) {
      // Khi chưa gõ gì: ưu tiên hiển thị những nơi ĐANG CÓ PHÒNG THỰC TẾ (> 0) lên trước
      const sortedUnis = [...universitiesWithCounts]
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      const sortedDistricts = [...districtsWithCounts]
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      const sortedLandmarks = [...landmarksWithCounts]
        .sort((a, b) => b.count - a.count)
        .slice(0, 2);

      return {
        universities: sortedUnis,
        districts: sortedDistricts,
        landmarks: sortedLandmarks,
      };
    }

    const normQ = removeVietnameseTones(debouncedQuery).toLowerCase();
    const expandedSchoolQ = normalizeSchoolName(debouncedQuery);

    // Lọc trường ĐH (khớp tên, viết tắt, alias hoặc quận)
    const universities = universitiesWithCounts
      .filter((u) => {
        const normName = removeVietnameseTones(u.name).toLowerCase();
        const normShort = removeVietnameseTones(u.short).toLowerCase();
        const matchAlias = u.aliases.some((a) => a.includes(normQ) || normQ.includes(a));
        const matchName = normName.includes(normQ) || normQ.includes(normName);
        const matchShort = normShort.includes(normQ) || normQ.includes(normShort);
        const matchExpanded = expandedSchoolQ ? isSchoolMatch(debouncedQuery, u.name) : false;
        return matchName || matchShort || matchAlias || matchExpanded;
      })
      .sort((a, b) => b.count - a.count);

    // Lọc quận (khớp tên hoặc tên không tiền tố)
    const districts = districtsWithCounts
      .filter((d) => {
        const normName = removeVietnameseTones(d.name).toLowerCase();
        const normShort = removeVietnameseTones(d.short).toLowerCase();
        return normName.includes(normQ) || normShort.includes(normQ) || isDistrictMatch(d.name, debouncedQuery);
      })
      .sort((a, b) => b.count - a.count);

    // Lọc địa danh (khớp tên, keyword hoặc quận)
    const landmarks = landmarksWithCounts
      .filter((l) => {
        const normName = removeVietnameseTones(l.name).toLowerCase();
        const normKw = removeVietnameseTones(l.keyword).toLowerCase();
        const normDist = removeVietnameseTones(l.district).toLowerCase();
        return normName.includes(normQ) || normKw.includes(normQ) || normDist.includes(normQ);
      })
      .sort((a, b) => b.count - a.count);

    return { universities, districts, landmarks };
  }, [debouncedQuery, universitiesWithCounts, districtsWithCounts, landmarksWithCounts]);

  const totalResults =
    suggestions.universities.length + suggestions.districts.length + suggestions.landmarks.length;

  const handleSelect = (text: string, type: 'university' | 'district' | 'landmark') => {
    const cleanText = text.replace(/^Gần\s+/i, '').trim();
    setInputValue(cleanText);
    setIsOpen(false);
    if (onSelect) {
      onSelect(cleanText, type);
    } else {
      if (type === 'district') {
        navigate(`/tim-kiem?khuVuc=${encodeURIComponent(cleanText)}`);
      } else if (type === 'university') {
        navigate(`/tim-kiem?truong=${encodeURIComponent(cleanText)}`);
      } else {
        navigate(`/tim-kiem?q=${encodeURIComponent(cleanText)}`);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsOpen(false);
      const query = inputValue.trim();
      if (onSelect) {
        onSelect(query, 'landmark');
      } else {
        if (query) {
          navigate(`/tim-kiem?q=${encodeURIComponent(query)}`);
        } else {
          navigate('/tim-kiem');
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setIsOpen(false);
    if (onSelect) {
      onSelect('', 'landmark');
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
            onClick={handleClear}
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
                <p className="text-xs font-bold text-gray-800">Không tìm thấy địa điểm khớp "{inputValue}"</p>
                <p className="text-[11px] text-gray-500">
                  Gợi ý tìm kiếm nhanh:
                  {['Cầu Giấy', 'Đống Đa', 'Bách Khoa', 'Chùa Láng', 'NEU', 'FTU'].map((quick) => (
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
                            <p className="text-[10px] text-gray-400">
                              {uni.district} • {uni.short}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 transition ${
                            uni.count > 0
                              ? 'text-[#006d37] bg-emerald-50 border-emerald-200/60'
                              : 'text-gray-400 bg-gray-50 border-gray-200/50'
                          }`}
                        >
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
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 transition ${
                            d.count > 0
                              ? 'text-[#006d37] bg-emerald-50 border-emerald-200/60'
                              : 'text-gray-400 bg-gray-50 border-gray-200/50'
                          }`}
                        >
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
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 transition ${
                            l.count > 0
                              ? 'text-[#006d37] bg-emerald-50 border-emerald-200/60'
                              : 'text-gray-400 bg-gray-50 border-gray-200/50'
                          }`}
                        >
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
                      navigate(
                        inputValue.trim()
                          ? `/tim-kiem?q=${encodeURIComponent(inputValue.trim())}`
                          : '/tim-kiem'
                      );
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-[#006d37] hover:bg-emerald-50 rounded-xl transition cursor-pointer"
                  >
                    <span>Xem tất cả phòng trọ Hà Nội ({activeRooms.length} phòng)</span>
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
