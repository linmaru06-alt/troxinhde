import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { formatPrice } from '../components/ui/Cards';
import { supabase } from '../lib/supabase';
import {
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  FileText,
  Download,
  AlertCircle,
  HelpCircle,
  MapPin,
} from 'lucide-react';

export const BookingPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { rooms, currentUser, createBooking, showToast } = useAppStore();

  const room = rooms.find((r) => r.id === roomId) || rooms[0];

  const [date, setDate] = useState<string>(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState<string>('09:30 - 10:30 (Sáng)');
  const [name, setName] = useState<string>(currentUser?.name || '');
  const [phone, setPhone] = useState<string>(currentUser?.phone || '');
  const [note, setNote] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const timeSlots = [
    { label: '08:30 - 09:30', period: 'Sáng' },
    { label: '09:30 - 10:30', period: 'Sáng' },
    { label: '10:30 - 11:30', period: 'Trưa' },
    { label: '14:00 - 15:00', period: 'Chiều' },
    { label: '15:30 - 16:30', period: 'Chiều' },
    { label: '17:30 - 18:30', period: 'Tối' },
    { label: '19:00 - 20:00', period: 'Tối' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showToast('Vui lòng điền đủ họ tên và số điện thoại', '', 'error');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Lưu vào Supabase Cloud viewing_requests
      const renterId = currentUser?.id || '00000000-0000-0000-0000-000000000003';
      const ownerId = room.ownerId || '00000000-0000-0000-0000-000000000002';

      await supabase.from('viewing_requests').insert({
        room_id: room.id.length === 36 ? room.id : undefined,
        renter_id: renterId.length === 36 ? renterId : undefined,
        owner_id: ownerId.length === 36 ? ownerId : undefined,
        requested_date: date,
        time_slot: selectedSlot,
        renter_name: name.trim(),
        renter_phone: phone.trim(),
        note: note.trim() || null,
        status: 'pending',
      });

      // 2. Gửi thông báo cho Chủ trọ
      await supabase.from('notifications').insert({
        user_id: ownerId.length === 36 ? ownerId : undefined,
        title: `Lịch hẹn xem phòng mới: ${room.title} 📅`,
        body: `Khách ${name} (${phone}) đã hẹn xem phòng vào ${date}, khung giờ ${selectedSlot}.`,
        type: 'booking',
        cta_url: '/chu-tro/tong-quan',
        cta_label: 'Xem lịch hẹn',
      });
    } catch (cloudErr) {
      console.warn('[Booking] Lỗi lưu viewing_request lên Cloud:', cloudErr);
    }

    createBooking({
      roomId: room.id,
      roomTitle: room.title,
      roomPrice: room.price,
      renterId: currentUser?.id || 'guest',
      renterName: name,
      renterPhone: phone,
      date,
      timeSlot: selectedSlot,
      note,
    });

    setIsLoading(false);
    setIsSuccess(true);
  };

  if (!room) {
    return <div className="p-8 text-center">Không tìm thấy phòng</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Back button */}
      <Link to={`/phong/${room.id}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition">
        <ArrowLeft className="w-4 h-4" /> Quay lại chi tiết phòng
      </Link>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6">
        {isSuccess ? (
          /* SUCCESS STATE */
          <div className="text-center py-6 space-y-6 animate-fadeIn">
            <div className="w-20 h-20 bg-emerald-100 text-[#00a854] rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#00a854] bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
                Xác nhận 2 chiều tự động
              </span>
              <h2 className="text-2xl font-black text-gray-950">Đặt Lịch Xem Phòng Thành Công!</h2>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Yêu cầu xem phòng đã được chuyển ngay tới chủ trọ <strong>{room.ownerName}</strong> ({room.ownerPhone}).
              </p>
            </div>

            {/* Booking Summary Card */}
            <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-left space-y-2 text-xs">
              <div className="font-black text-emerald-950 text-sm">{room.title}</div>
              <p className="text-gray-700">📅 Ngày hẹn: <strong className="text-gray-950 font-bold">{date}</strong></p>
              <p className="text-gray-700">⏰ Khung giờ: <strong className="text-gray-950 font-bold">{selectedSlot}</strong></p>
              <p className="text-gray-700">📍 Địa chỉ: <span className="font-semibold text-gray-900">{room.address}, {room.district}</span></p>
              <p className="text-gray-700">👤 Người xem: <span className="font-semibold text-gray-900">{name} - {phone}</span></p>
            </div>

            {/* Legal Contract & Deposit Prep Section */}
            <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200 text-left space-y-3 text-xs">
              <div className="flex items-center gap-2 text-blue-950 font-black text-sm">
                <FileText className="w-4 h-4 text-blue-600" />
                Chuẩn Bị Cho Buổi Xem Phòng & Ký Kết
              </div>
              <p className="text-gray-600 leading-relaxed">
                Tham khảo trước mẫu hợp đồng thuê phòng trọ và biên bản cọc chuẩn pháp lý của Trọ Xinh để đảm bảo quyền lợi khi ưng ý phòng.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link to="/hop-dong-mau" target="_blank" className="flex-1 min-w-[140px]">
                  <Button variant="outline" size="sm" fullWidth leftIcon={<FileText className="w-3.5 h-3.5 text-blue-600" />}>
                    Xem Hợp Đồng Mẫu
                  </Button>
                </Link>
                <Link to="/bien-ban-dat-coc" target="_blank" className="flex-1 min-w-[140px]">
                  <Button variant="outline" size="sm" fullWidth leftIcon={<Download className="w-3.5 h-3.5 text-blue-600" />}>
                    Mẫu Biên Bản Cọc
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="md" className="flex-1" onClick={() => navigate('/tim-phong')}>
                Tiếp Tục Tìm Phòng
              </Button>
              <Button variant="primary" size="md" className="flex-1" onClick={() => navigate('/toi')}>
                Xem Lịch Hẹn Của Tôi
              </Button>
            </div>
          </div>
        ) : (
          /* BOOKING FORM */
          <>
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#00a854] text-[11px] font-black">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Đặt lịch trực tiếp • Không mất phí môi giới</span>
              </span>
              <h1 className="text-2xl font-black text-gray-950 tracking-tight">Đặt Lịch Xem Phòng Trực Tiếp</h1>
              <p className="text-xs text-gray-500">Chủ nhà sẽ nhận thông báo, chuẩn bị phòng và đón bạn đúng giờ</p>
            </div>

            {/* Room mini card */}
            <div className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
              <img src={room.images[0]} alt="" className="w-16 h-16 rounded-xl object-cover ring-1 ring-black/5 shrink-0" />
              <div className="flex-1 overflow-hidden space-y-0.5">
                <span className="text-xs font-black text-[#00a854]">{formatPrice(room.price)}</span>
                <h4 className="text-xs font-bold text-gray-950 truncate">{room.title}</h4>
                <p className="text-[11px] text-gray-500 truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-gray-400 shrink-0" /> {room.address}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 1. Date selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#00a854]" /> 1. Chọn ngày xem phòng:
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 p-3 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00a854] bg-gray-50"
                />
              </div>

              {/* 2. Time slot grid */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#00a854]" /> 2. Chọn khung giờ rảnh:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {timeSlots.map((slot) => {
                    const fullLabel = `${slot.label} (${slot.period})`;
                    const isSelected = selectedSlot === fullLabel;
                    return (
                      <button
                        key={slot.label}
                        type="button"
                        onClick={() => setSelectedSlot(fullLabel)}
                        className={`p-2.5 text-xs rounded-2xl border font-bold transition text-left flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-50 border-[#00a854] text-[#00a854] ring-2 ring-[#00a854]/30 shadow-xs'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                        }`}
                      >
                        <span>{slot.label}</span>
                        <span className="text-[10px] opacity-70 font-semibold">{slot.period}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Contact information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#00a854]" /> Họ và tên của bạn:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="vd: Nguyễn Văn A"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl border border-gray-300 p-3 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00a854] bg-gray-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#00a854]" /> Số điện thoại liên hệ:
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0987654321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-2xl border border-gray-300 p-3 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00a854] bg-gray-50"
                  />
                </div>
              </div>

              {/* 4. Note */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wider">
                  Ghi chú cho chủ trọ (tùy chọn):
                </label>
                <textarea
                  rows={2}
                  placeholder="vd: Em là sinh viên năm 2 ĐH Bách Khoa, muốn xem phòng sau giờ học chiều..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 p-3 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00a854] bg-gray-50"
                />
              </div>

              {/* Anti-flake notice */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Cam kết văn minh:</strong> Nếu bạn có việc đột xuất không đến được, vui lòng hủy lịch hoặc nhắn tin trước 1 tiếng để chủ nhà không mất công chờ.
                </p>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#00a854] hover:bg-[#008f47] text-white font-black rounded-2xl text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                {isLoading ? 'Đang gửi yêu cầu...' : 'XÁC NHẬN ĐẶT LỊCH XEM PHÒNG'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
