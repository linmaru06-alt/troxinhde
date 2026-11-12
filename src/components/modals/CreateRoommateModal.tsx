import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { RoommateCard } from '../ui/Cards';
import { RoommatePost } from '../../types';
import { createRoommatePost } from '../../lib/api/roommates';
import {
  Users,
  Sparkles,
  Check,
  X,
  PlusCircle,
  Home,
  Search,
  Image as ImageIcon,
  Upload,
  Save,
  Eye,
  AlertTriangle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  MapPin,
  LocateFixed,
} from 'lucide-react';
import { MapPinPicker } from '../map/TroXinhMap';
import { geocodeAddressCached, resolveEntityCoordsSync } from '../../lib/geocoding';

interface CreateRoommateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_HABITS = [
  'Không hút thuốc',
  'Giữ vệ sinh sạch sẽ',
  'Không ồn ào sau 23h',
  'Yêu thích thú cưng',
  'Nấu ăn tại nhà',
  'Ngủ sớm dậy sớm',
  'Thích không gian yên tĩnh',
  'Hòa đồng, thân thiện',
  'Tôn trọng không gian riêng',
  'Đã đi làm / Sinh viên năm cuối',
];

const DISTRICTS = [
  'Quận Cầu Giấy',
  'Quận Đống Đa',
  'Quận Hai Bà Trưng',
  'Quận Thanh Xuân',
  'Quận Nam Từ Liêm',
  'Quận Hà Đông',
  'Quận Ba Đình',
  'Quận Bắc Từ Liêm',
  'Quận Hoàng Mai',
  'Quận Tây Hồ',
  'Quận Long Biên',
];

export const CreateRoommateModal: React.FC<CreateRoommateModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, rooms, buildings, addRoommatePost, showToast } = useAppStore();

  // 1. Tất cả các trường thông tin đều để trống theo yêu cầu của người dùng
  const [userName, setUserName] = useState<string>('');
  const [userGender, setUserGender] = useState<'Nam' | 'Nữ' | 'Khác' | ''>('');
  const [userAge, setUserAge] = useState<number | ''>('');
  const [userSchool, setUserSchool] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [desiredAddress, setDesiredAddress] = useState<string>('');
  const [budgetShare, setBudgetShare] = useState<number | ''>('');
  const [genderPreference, setGenderPreference] = useState<'Chỉ tìm Nữ' | 'Chỉ tìm Nam' | 'Tất cả' | ''>('');
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [intro, setIntro] = useState<string>('');

  // 2. Tùy chọn: Đã có phòng sẵn hay chưa + Tọa độ hiển thị bản đồ
  const [hasRoom, setHasRoom] = useState<boolean>(false);
  const [roomAddress, setRoomAddress] = useState<string>('');
  const [roomPrice, setRoomPrice] = useState<number | ''>('');
  const [roomArea, setRoomArea] = useState<number | ''>('');
  const [linkedRoomId, setLinkedRoomId] = useState<string>('');
  const [roomGeo, setRoomGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [showMapPicker, setShowMapPicker] = useState<boolean>(false);
  const [isLocatingPin, setIsLocatingPin] = useState<boolean>(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploadingImg, setIsUploadingImg] = useState<boolean>(false);

  // Quản lý lưu nháp
  const DRAFT_KEY = 'troxinh_draft_roommate';
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Tải nháp khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.userName) setUserName(d.userName);
        if (d.userGender) setUserGender(d.userGender);
        if (d.userAge) setUserAge(d.userAge);
        if (d.userSchool) setUserSchool(d.userSchool);
        if (d.district) setDistrict(d.district);
        if (d.desiredAddress) setDesiredAddress(d.desiredAddress);
        if (d.budgetShare) setBudgetShare(d.budgetShare);
        if (d.genderPreference) setGenderPreference(d.genderPreference);
        if (d.selectedHabits) setSelectedHabits(d.selectedHabits);
        if (d.intro) setIntro(d.intro);
        if (typeof d.hasRoom === 'boolean') setHasRoom(d.hasRoom);
        if (d.roomAddress) setRoomAddress(d.roomAddress);
        if (d.roomPrice) setRoomPrice(d.roomPrice);
        if (d.roomArea) setRoomArea(d.roomArea);
        if (d.linkedRoomId) setLinkedRoomId(d.linkedRoomId);
        if (d.roomGeo) setRoomGeo(d.roomGeo);
        if (d.uploadedImages) setUploadedImages(d.uploadedImages);
        if (d.savedAt) setLastSavedTime(d.savedAt);
        setHasDraft(true);
      } else if (currentUser?.name) {
        setUserName(currentUser.name);
      }
    } catch (e) {
      console.error('Lỗi nạp nháp roommate:', e);
    }
  }, [isOpen, currentUser]);

  // Tự động lưu nháp
  useEffect(() => {
    if (!isOpen) return;
    // Chỉ lưu nếu có ít nhất 1 thông tin
    if (userName || userSchool || district || intro || uploadedImages.length > 0) {
      const timer = setTimeout(() => {
        const draftData = {
          userName,
          userGender,
          userAge,
          userSchool,
          district,
          desiredAddress,
          budgetShare,
          genderPreference,
          selectedHabits,
          intro,
          hasRoom,
          roomAddress,
          roomPrice,
          roomArea,
          linkedRoomId,
          roomGeo,
          uploadedImages,
          savedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
        setLastSavedTime(draftData.savedAt);
        setHasDraft(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [
    isOpen,
    userName,
    userGender,
    userAge,
    userSchool,
    district,
    desiredAddress,
    budgetShare,
    genderPreference,
    selectedHabits,
    intro,
    hasRoom,
    roomAddress,
    roomPrice,
    roomArea,
    linkedRoomId,
    roomGeo,
    uploadedImages,
  ]);

  const handleManualSaveDraft = () => {
    const draftData = {
      userName,
      userGender,
      userAge,
      userSchool,
      district,
      desiredAddress,
      budgetShare,
      genderPreference,
      selectedHabits,
      intro,
      hasRoom,
      roomAddress,
      roomPrice,
      roomArea,
      linkedRoomId,
      roomGeo,
      uploadedImages,
      savedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    setLastSavedTime(draftData.savedAt);
    setHasDraft(true);
    showToast('Đã lưu bản nháp', `Bản nháp đã lưu lúc ${draftData.savedAt}. Bạn có thể tiếp tục chỉnh sửa bất kỳ lúc nào.`, 'success');
  };

  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setUserName('');
    setUserGender('');
    setUserAge('');
    setUserSchool('');
    setDistrict('');
    setDesiredAddress('');
    setBudgetShare('');
    setGenderPreference('');
    setSelectedHabits([]);
    setIntro('');
    setHasRoom(false);
    setRoomAddress('');
    setRoomPrice('');
    setRoomArea('');
    setLinkedRoomId('');
    setRoomGeo(null);
    setShowMapPicker(false);
    setUploadedImages([]);
    setHasDraft(false);
    setLastSavedTime(null);
    setSubmitError(null);
    showToast('Đã xóa bản nháp', 'Form đã được làm mới hoàn toàn', 'info');
  };

  const handleMoveImage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= uploadedImages.length) return;
    setUploadedImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  };

  const handleSetMainImage = (idx: number) => {
    if (idx === 0) return;
    handleMoveImage(idx, 0);
    showToast('Đã đặt làm ảnh chính', 'Ảnh đầu tiên sẽ hiển thị nổi bật trên danh sách.', 'info');
  };

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const toggleHabit = (habit: string) => {
    if (selectedHabits.includes(habit)) {
      setSelectedHabits(selectedHabits.filter((h) => h !== habit));
    } else {
      setSelectedHabits([...selectedHabits, habit]);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - uploadedImages.length;
    if (remainingSlots <= 0) {
      showToast('Đạt giới hạn ảnh', 'Bạn chỉ có thể tải lên tối đa 5 ảnh', 'warning');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    setIsUploadingImg(true);

    const readers = filesToProcess.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers)
      .then((base64Urls) => {
        setUploadedImages((prev) => [...prev, ...base64Urls]);
      })
      .catch((err) => {
        console.error('Lỗi đọc ảnh:', err);
        showToast('Lỗi tải ảnh', 'Không thể đọc file ảnh. Vui lòng thử lại!', 'error');
      })
      .finally(() => {
        setIsUploadingImg(false);
        e.target.value = '';
      });
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setUploadedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (currentUser?.isBanned) {
      showToast(
        'Tài khoản đang bị khóa',
        currentUser.bannedReason || 'Tài khoản của bạn đang bị khóa chức năng đăng tin.',
        'error'
      );
      return;
    }

    if (!userName.trim()) {
      showToast('Vui lòng nhập họ tên', '', 'warning');
      return;
    }
    if (!userSchool.trim()) {
      showToast('Vui lòng nhập trường ĐH hoặc nơi làm việc', '', 'warning');
      return;
    }
    if (!userGender) {
      showToast('Vui lòng chọn giới tính của bạn', '', 'warning');
      return;
    }
    if (!userAge || Number(userAge) < 16) {
      showToast('Vui lòng nhập độ tuổi hợp lệ', '', 'warning');
      return;
    }
    if (!district) {
      showToast('Vui lòng chọn khu vực mong muốn', '', 'warning');
      return;
    }
    if (!budgetShare || Number(budgetShare) <= 0) {
      showToast('Vui lòng nhập ngân sách dự kiến chia sẻ', '', 'warning');
      return;
    }
    if (!genderPreference) {
      showToast('Vui lòng chọn đối tượng bạn cùng phòng mong muốn', '', 'warning');
      return;
    }
    if (!intro.trim()) {
      showToast('Vui lòng nhập vài dòng giới thiệu bản thân', '', 'warning');
      return;
    }

    const validGender = userGender as 'Nam' | 'Nữ' | 'Khác';
    const validGenderPreference = genderPreference as 'Chỉ tìm Nữ' | 'Chỉ tìm Nam' | 'Tất cả';

    const selectedRoom = rooms.find((r) => r.id === linkedRoomId);
    const selectedRoomBuilding = selectedRoom?.buildingId
      ? buildings.find((b) => b.id === selectedRoom.buildingId)
      : undefined;
    // Ưu tiên UUID của tài khoản hiện tại, nếu ID dạng khác thì dùng profile UUID hợp lệ trong DB
    const posterId = (currentUser?.id && currentUser.id.length === 36)
      ? currentUser.id
      : '0016bd8f-d19e-4348-9175-3a4379cffad4';

    // Tổng hợp danh sách ảnh phòng thực tế
    const finalImages = hasRoom
      ? (uploadedImages.length > 0 ? uploadedImages : (selectedRoom?.images || []))
      : [];

    const finalAddress = hasRoom
      ? (roomAddress.trim() || selectedRoom?.address || selectedRoomBuilding?.address || '')
      : (desiredAddress.trim() || '');

    setIsSubmitting(true);
    try {
      let finalCoords = roomGeo;
      if (!finalCoords) {
        if (finalAddress) {
          finalCoords = await geocodeAddressCached(finalAddress, district, userSchool.trim());
        }
        if (!finalCoords) {
          const fallback = resolveEntityCoordsSync({
            lat: hasRoom ? selectedRoom?.lat : undefined,
            lng: hasRoom ? selectedRoom?.lng : undefined,
            address: finalAddress || (hasRoom ? selectedRoom?.address : undefined),
            district,
            school: userSchool.trim(),
            buildingGeo: hasRoom ? selectedRoomBuilding?.geo : null,
            buildingAddress: hasRoom ? selectedRoomBuilding?.address : undefined,
          });
          finalCoords = { lat: fallback.lat, lng: fallback.lng };
        }
      }

      const finalLinkedTitle = hasRoom ? (finalAddress || selectedRoom?.title || 'Phòng trọ đang ở') : undefined;
      const finalLinkedPrice = hasRoom ? (Number(roomPrice) || selectedRoom?.price || Number(budgetShare) * 2) : undefined;
      const finalLinkedArea = hasRoom ? (Number(roomArea) || selectedRoom?.area) : undefined;

      const created = await createRoommatePost({
        poster_id: posterId,
        room_id: (hasRoom && selectedRoom?.id && selectedRoom.id.length === 36) ? selectedRoom.id : undefined,
        nickname: userName.trim(),
        age: Number(userAge),
        gender: validGender === 'Nam' ? 'male' : validGender === 'Nữ' ? 'female' : 'any',
        preferred_gender: validGenderPreference === 'Chỉ tìm Nam' ? 'male' : validGenderPreference === 'Chỉ tìm Nữ' ? 'female' : 'any',
        budget_per_person: Number(budgetShare),
        lifestyle_tags: selectedHabits,
        self_intro: intro.trim(),
        district,
        address: finalAddress || undefined,
        lat: finalCoords.lat,
        lng: finalCoords.lng,
        school: userSchool.trim(),
        images: finalImages.slice(0, 5),
        linked_room_title: finalLinkedTitle,
        linked_room_price: finalLinkedPrice,
        linked_room_area: finalLinkedArea,
      });

      const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      const finalPostId = created?.id || generateUUID();

      addRoommatePost({
        id: finalPostId,
        userId: currentUser?.id || posterId,
        userName: userName.trim(),
        userAvatar: currentUser?.avatarUrl || '/images/user-avatar.jpg',
        userGender: validGender,
        userAge: Number(userAge),
        userSchool: userSchool.trim(),
        district,
        address: finalAddress || undefined,
        lat: finalCoords.lat,
        lng: finalCoords.lng,
        budgetShare: Number(budgetShare),
        genderPreference: validGenderPreference,
        habits: selectedHabits,
        lifestyleTags: selectedHabits.slice(0, 3),
        intro: intro.trim(),
        linkedRoomId: hasRoom ? (selectedRoom?.id || `room_custom_${Date.now()}`) : undefined,
        linkedRoomTitle: finalLinkedTitle,
        linkedRoomPrice: finalLinkedPrice,
        linkedRoomArea: finalLinkedArea,
        linkedRoomImage: finalImages[0],
        images: finalImages,
        status: 'Đang tìm',
      });

      // Xóa bản nháp khi đăng thành công
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      setSubmitError(null);

      showToast('Đăng tin tìm bạn thành công! 🎉', 'Hồ sơ của bạn đã được hiển thị trên cộng đồng Trọ Xinh.', 'success');
      onClose();
    } catch (err: any) {
      console.error('[Roommate] Lỗi đăng bài:', err);
      const errMsg = err?.message || 'Không thể đăng tin lúc này. Dữ liệu đã nhập của bạn được giữ nguyên!';
      setSubmitError(errMsg);
      showToast('Lỗi khi đăng tin tìm bạn', errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedLinkedRoom = rooms.find((r) => r.id === linkedRoomId);
  const selectedLinkedBuilding = selectedLinkedRoom?.buildingId
    ? buildings.find((b) => b.id === selectedLinkedRoom.buildingId)
    : undefined;
  const effectivePin = roomGeo
    ? roomGeo
    : resolveEntityCoordsSync({
        lat: hasRoom ? selectedLinkedRoom?.lat : undefined,
        lng: hasRoom ? selectedLinkedRoom?.lng : undefined,
        address: (hasRoom ? (roomAddress.trim() || selectedLinkedRoom?.address) : desiredAddress.trim()) || undefined,
        district: district || selectedLinkedRoom?.district,
        school: userSchool.trim() || undefined,
        buildingGeo: hasRoom ? selectedLinkedBuilding?.geo : null,
        buildingAddress: hasRoom ? selectedLinkedBuilding?.address : undefined,
      });

  const handleSelectLinkedRoom = (nextRoomId: string) => {
    setLinkedRoomId(nextRoomId);
    const chosen = rooms.find((r) => r.id === nextRoomId);
    if (!chosen) return;
    if (chosen.address) setRoomAddress(chosen.address);
    if (chosen.district) setDistrict(chosen.district);
    if (!roomPrice && chosen.price) setRoomPrice(chosen.price);
    if (!roomArea && chosen.area) setRoomArea(chosen.area);
    const bld = chosen.buildingId ? buildings.find((b) => b.id === chosen.buildingId) : undefined;
    const resolved = resolveEntityCoordsSync({
      lat: chosen.lat,
      lng: chosen.lng,
      address: chosen.address || bld?.address,
      district: chosen.district || bld?.district,
      school: chosen.nearestSchool || userSchool.trim(),
      buildingGeo: bld?.geo,
      buildingAddress: bld?.address,
    });
    setRoomGeo({ lat: resolved.lat, lng: resolved.lng });
  };

  const handleLocateRoommatePin = async () => {
    const addr = hasRoom
      ? (roomAddress.trim() || selectedLinkedRoom?.address || '')
      : desiredAddress.trim();
    const dist = district || selectedLinkedRoom?.district || '';
    if (!addr && !dist && !userSchool.trim()) {
      showToast('Thiếu thông tin vị trí', 'Vui lòng chọn Quận/Huyện hoặc nhập tên đường/phố trước khi định vị.', 'warning');
      return;
    }
    setIsLocatingPin(true);
    try {
      const coords = await geocodeAddressCached(addr || undefined, dist || undefined, userSchool.trim() || undefined);
      if (coords) {
        setRoomGeo(coords);
        setShowMapPicker(true);
        showToast('Đã định vị trên bản đồ!', addr || dist || userSchool, 'success');
      } else {
        setShowMapPicker(true);
        showToast('Chưa khớp chính xác số nhà', 'Bản đồ đã mở ở khu vực gần nhất, bạn có thể nhấp/kéo ghim để chỉnh.', 'info');
      }
    } finally {
      setIsLocatingPin(false);
    }
  };

  const previewPost: RoommatePost = {
    id: 'preview_roommate',
    userId: currentUser?.id || 'preview_user',
    userName: userName.trim() || 'Họ và tên của bạn',
    userAvatar: currentUser?.avatarUrl || '/images/user-avatar.jpg',
    userGender: (userGender as any) || 'Nam',
    userAge: Number(userAge) || 20,
    userSchool: userSchool.trim() || 'Trường / Nơi làm việc',
    district: district || 'Khu vực mong muốn',
    address: (hasRoom ? roomAddress.trim() : desiredAddress.trim()) || undefined,
    lat: effectivePin.lat,
    lng: effectivePin.lng,
    budgetShare: Number(budgetShare) || 2000000,
    genderPreference: (genderPreference as any) || 'Tất cả',
    habits: selectedHabits.length > 0 ? selectedHabits : ['Giữ vệ sinh sạch sẽ'],
    lifestyleTags: selectedHabits.slice(0, 3),
    intro: intro.trim() || 'Chưa nhập lời giới thiệu bản thân...',
    linkedRoomTitle: hasRoom ? (roomAddress.trim() || 'Phòng trọ sẵn có') : undefined,
    linkedRoomPrice: hasRoom ? (Number(roomPrice) || 4000000) : undefined,
    linkedRoomImage: uploadedImages[0],
    images: uploadedImages,
    status: 'Đang tìm',
    createdAt: new Date().toISOString(),
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Đăng Tin Tìm Bạn Cùng Phòng" maxWidth="5xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Dải thông tin & Bản nháp nằm ngang gọn gàng */}
        <div className={`grid grid-cols-1 ${hasDraft ? 'lg:grid-cols-2' : ''} gap-3`}>
          <div className="px-3.5 py-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#006d37] text-white flex items-center justify-center font-bold shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-gray-900">Kết nối bạn ở ghép văn minh & an toàn</h4>
              <p className="text-[11px] text-gray-600 leading-snug">
                Bài đăng của bạn sẽ hiển thị công khai trên bảng tin cộng đồng sinh viên Trọ Xinh.
              </p>
            </div>
          </div>

          {hasDraft && (
            <div className="px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-800">
              <div className="flex items-center gap-2 min-w-0">
                <Save className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="leading-snug">
                  Đang dùng bản nháp {lastSavedTime ? `(lưu lúc ${lastSavedTime})` : ''} — Dữ liệu tự động lưu.
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearDraft}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline cursor-pointer shrink-0 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Xóa nháp
              </button>
            </div>
          )}
        </div>

        {/* Banner Lỗi Submit nếu có */}
        {submitError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Không thể đăng bài: {submitError}</p>
              <p className="text-[11px] text-rose-600 mt-0.5">
                Dữ liệu bạn đã điền vẫn được giữ nguyên đầy đủ. Vui lòng kiểm tra lại kết nối và thử gửi lại!
              </p>
            </div>
          </div>
        )}

        {/* BỐ CỤC NẰM NGANG 2 CỘT TRÊN DESKTOP */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* CỘT TRÁI: Thông tin cá nhân, ngân sách & thói quen */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-200/80 space-y-3.5">
              <h5 className="text-xs font-black text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#006d37] text-white text-[10px] flex items-center justify-center">
                  1
                </span>
                Thông tin cơ bản & Nhu cầu
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Họ và tên của bạn *</label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Nhập họ và tên của bạn"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#006d37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Trường ĐH / Nơi làm việc *</label>
                  <input
                    type="text"
                    required
                    value={userSchool}
                    onChange={(e) => setUserSchool(e.target.value)}
                    placeholder="VD: ĐH Bách Khoa, ĐH Kinh Tế..."
                    className="w-full px-3 py-2 bg-white rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#006d37] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Giới tính *</label>
                  <select
                    required
                    value={userGender}
                    onChange={(e) => setUserGender(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#006d37] focus:outline-none bg-white"
                  >
                    <option value="">-- Chọn --</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tuổi *</label>
                  <input
                    type="number"
                    min={16}
                    max={60}
                    required
                    value={userAge}
                    onChange={(e) => setUserAge(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#006d37] focus:outline-none"
                    placeholder="VD: 20"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Khu vực mong muốn *</label>
                  <select
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#006d37] focus:outline-none bg-white"
                  >
                    <option value="">-- Chọn Quận / Huyện --</option>
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Ngân sách share / tháng *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={100000}
                      min={300000}
                      max={30000000}
                      required
                      value={budgetShare}
                      onChange={(e) => setBudgetShare(e.target.value ? Number(e.target.value) : '')}
                      placeholder="VD: 2000000"
                      className="w-full px-3 py-2 pr-11 bg-white rounded-xl border border-gray-300 text-xs font-bold text-[#006d37] focus:ring-2 focus:ring-[#006d37] focus:outline-none"
                    />
                    <span className="absolute right-3 top-2 text-[11px] text-gray-400 font-semibold">VNĐ</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Đối tượng mong muốn *</label>
                  <select
                    required
                    value={genderPreference}
                    onChange={(e) => setGenderPreference(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-[#006d37] focus:outline-none bg-white"
                  >
                    <option value="">-- Chọn đối tượng tìm kiếm --</option>
                    <option value="Tất cả">Tất cả (Nam hoặc Nữ đều được)</option>
                    <option value="Chỉ tìm Nữ">Chỉ tìm bạn Nữ</option>
                    <option value="Chỉ tìm Nam">Chỉ tìm bạn Nam</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Habits Checklist */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200/90 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-xs font-black text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#006d37] text-white text-[10px] flex items-center justify-center">
                    2
                  </span>
                  Thói quen & Lối sống
                </h5>
                <span className="text-[11px] text-gray-500 font-medium">
                  Đã chọn {selectedHabits.length} mục
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_HABITS.map((habit) => {
                  const isSelected = selectedHabits.includes(habit);
                  return (
                    <button
                      type="button"
                      key={habit}
                      onClick={() => toggleHabit(habit)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-[#006d37] border-[#006d37] text-white shadow-xs font-bold'
                          : 'bg-gray-50/70 border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/50'
                      }`}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5 text-gray-400" />}
                      {habit}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: Vị trí bản đồ, Tình trạng phòng & Lời giới thiệu */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-4 bg-white rounded-2xl border border-gray-200/90 space-y-3">
              <h5 className="text-xs font-black text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#006d37] text-white text-[10px] flex items-center justify-center">
                  3
                </span>
                Vị trí trên bản đồ & Tình trạng phòng
              </h5>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 hover:bg-emerald-50/50 border border-gray-200/80 cursor-pointer select-none transition">
                <input
                  type="checkbox"
                  checked={hasRoom}
                  onChange={(e) => setHasRoom(e.target.checked)}
                  className="w-4 h-4 rounded text-[#006d37] focus:ring-[#006d37] border-gray-300 shrink-0"
                />
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-[#006d37] shrink-0" />
                  Tôi hiện đã thuê được phòng và đang tìm người dọn vào ở chung
                </span>
              </label>

              {/* Địa chỉ chi tiết khi chưa có phòng */}
              {!hasRoom && (
                <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200/70 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      Đường / Phố hoặc khu vực muốn ở ghép
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleLocateRoommatePin}
                        disabled={isLocatingPin}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold cursor-pointer"
                      >
                        <LocateFixed className={`w-3.5 h-3.5 ${isLocatingPin ? 'animate-spin' : ''}`} />
                        {isLocatingPin ? 'Đang định vị...' : 'Định vị'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowMapPicker((prev) => !prev)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 text-gray-700 border border-indigo-200 text-[11px] font-bold cursor-pointer"
                      >
                        {showMapPicker ? 'Ẩn bản đồ' : 'Ghim bản đồ'}
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={desiredAddress}
                    onChange={(e) => setDesiredAddress(e.target.value)}
                    placeholder="VD: Ngõ 165 Xuân Thủy, Phố Chùa Láng, KĐT Văn Quán..."
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Thông tin phòng đã có (chỉ hiện khi hasRoom = true) */}
              {hasRoom && (
                <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-200/60 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h6 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-[#006d37]" />
                      Thông tin căn phòng đang ở
                    </h6>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleLocateRoommatePin}
                        disabled={isLocatingPin}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-[#006d37] border border-emerald-200 text-[11px] font-bold cursor-pointer"
                      >
                        <LocateFixed className={`w-3.5 h-3.5 ${isLocatingPin ? 'animate-spin' : ''}`} />
                        {isLocatingPin ? 'Đang định vị...' : 'Định vị địa chỉ'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowMapPicker((prev) => !prev)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-gray-700 border border-emerald-200 text-[11px] font-bold cursor-pointer"
                      >
                        {showMapPicker ? 'Ẩn bản đồ' : 'Ghim bản đồ'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Địa chỉ phòng trọ / Tên tòa nhà
                      </label>
                      <input
                        type="text"
                        value={roomAddress}
                        onChange={(e) => setRoomAddress(e.target.value)}
                        placeholder="VD: Số 25 ngõ 165 Cầu Giấy"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-[#006d37] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Diện tích (m²)</label>
                      <input
                        type="number"
                        min={10}
                        max={200}
                        value={roomArea}
                        onChange={(e) => setRoomArea(e.target.value ? Number(e.target.value) : '')}
                        placeholder="VD: 25"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-[#006d37] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Giá thuê nguyên phòng (VNĐ)
                      </label>
                      <input
                        type="number"
                        step={100000}
                        value={roomPrice}
                        onChange={(e) => setRoomPrice(e.target.value ? Number(e.target.value) : '')}
                        placeholder="VD: 4000000"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-[#006d37] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Hoặc liên kết phòng trên Trọ Xinh
                      </label>
                      <select
                        value={linkedRoomId}
                        onChange={(e) => handleSelectLinkedRoom(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-[#006d37] focus:outline-none"
                      >
                        <option value="">-- Tự nhập ở trên --</option>
                        {rooms.slice(0, 15).map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title} ({r.district})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* UPLOAD & SẮP XẾP ẢNH PHÒNG TRỰC TIẾP */}
                  <div className="space-y-2 pt-2 border-t border-emerald-200/60">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-[#006d37]" />
                        Ảnh thực tế phòng ({uploadedImages.length}/5)
                      </label>
                      <span className="text-[10px] text-gray-500 font-medium">Bấm mũi tên để sắp xếp</span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {uploadedImages.map((imgUrl, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-emerald-200 bg-gray-100 shadow-xs">
                          <img src={imgUrl} alt={`Ảnh phòng ${idx + 1}`} className="w-full h-full object-cover" />

                          <span className={`absolute top-1 left-1 text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs ${
                            idx === 0 ? 'bg-[#006d37] text-white' : 'bg-black/60 text-white'
                          }`}>
                            {idx === 0 ? '★ Bìa' : `#${idx + 1}`}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 hover:bg-rose-600 text-white flex items-center justify-center transition cursor-pointer"
                            title="Xóa ảnh"
                          >
                            <X className="w-3 h-3" />
                          </button>

                          <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between">
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveImage(idx, idx - 1)}
                                className="w-4 h-4 rounded bg-white/80 hover:bg-white text-gray-800 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center"
                                title="Chuyển sang trước"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === uploadedImages.length - 1}
                                onClick={() => handleMoveImage(idx, idx + 1)}
                                className="w-4 h-4 rounded bg-white/80 hover:bg-white text-gray-800 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center"
                                title="Chuyển sang sau"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>

                            {idx !== 0 && (
                              <button
                                type="button"
                                onClick={() => handleSetMainImage(idx)}
                                className="px-1 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[8px] font-bold"
                                title="Đặt ảnh này làm ảnh bìa"
                              >
                                Bìa
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {uploadedImages.length < 5 && (
                        <label className="border-2 border-dashed border-emerald-300 hover:border-[#006d37] bg-white hover:bg-emerald-50/50 aspect-square rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition p-1.5 text-center">
                          <Upload className="w-4 h-4 text-[#006d37]" />
                          <span className="text-[10px] font-bold text-emerald-800 leading-tight">
                            {isUploadingImg ? 'Đang tải...' : '+ Thêm ảnh'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={isUploadingImg}
                            onChange={handleImageSelect}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Bản đồ ghim vị trí */}
              {showMapPicker && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
                    <span>Nhấp hoặc kéo ghim để chọn vị trí chính xác</span>
                    <span className="text-emerald-700">
                      {effectivePin.lat.toFixed(5)}, {effectivePin.lng.toFixed(5)}
                    </span>
                  </div>
                  <MapPinPicker
                    initialLat={effectivePin.lat}
                    initialLng={effectivePin.lng}
                    onLocationChange={(loc) => {
                      setRoomGeo({ lat: loc.lat, lng: loc.lng });
                      if (hasRoom) {
                        if (!roomAddress.trim() && loc.address) setRoomAddress(loc.address);
                      } else {
                        if (!desiredAddress.trim() && loc.address) setDesiredAddress(loc.address);
                      }
                    }}
                    className="h-44 rounded-xl overflow-hidden"
                  />
                </div>
              )}
            </div>

            {/* Intro */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200/90 space-y-2">
              <h5 className="text-xs font-black text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#006d37] text-white text-[10px] flex items-center justify-center">
                  4
                </span>
                Lời giới thiệu bản thân & Yêu cầu cụ thể *
              </h5>
              <textarea
                required
                rows={4}
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="VD: Mình là sinh viên năm 3 vui vẻ, sạch sẽ, không hút thuốc. Cần tìm 1 bạn ở ghép để share tiền phòng khu vực Cầu Giấy, ưu tiên bạn nào ngoan ngoãn và ít tụ tập bạn bè muộn..."
                className="w-full p-3 rounded-xl border border-gray-300 text-xs font-medium leading-relaxed focus:ring-2 focus:ring-[#006d37] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleManualSaveDraft}
              leftIcon={<Save className="w-3.5 h-3.5 text-emerald-700" />}
            >
              Lưu Nháp
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreviewModal(true)}
              leftIcon={<Eye className="w-3.5 h-3.5 text-gray-700" />}
            >
              Xem Trước
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" size="md" onClick={onClose}>
              Hủy Bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting || isUploadingImg}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              {isSubmitting ? 'Đang Đăng Tin...' : 'Đăng Tin'}
            </Button>
          </div>
        </div>
      </form>

      {/* MODAL XEM TRƯỚC HỒ SƠ TÌM BẠN */}
      {showPreviewModal && (
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title="Xem Trước Hồ Sơ Tìm Bạn Ở Ghép"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Đây là giao diện hồ sơ của bạn khi hiển thị với các thành viên khác trên cộng đồng.</span>
            </div>

            <div className="max-w-md mx-auto">
              <RoommateCard post={previewPost} />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowPreviewModal(false)}>
                Đóng & Chỉnh Sửa Tiếp
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setShowPreviewModal(false)}
              >
                Quay Lại Form Đăng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
