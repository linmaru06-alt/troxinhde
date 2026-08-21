import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { formatPrice } from '../components/ui/Cards';
import {
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  ArrowLeft,
  Home,
  ShieldCheck,
} from 'lucide-react';

export const BookingPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { rooms, currentUser, createBooking, showToast } = useAppStore();

  const room = rooms.find((r) => r.id === roomId) || rooms[0];

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState<string>('09:00 - 10:00');
  const [name, setName] = useState<string>(currentUser?.name || 'Nguyễn Minh Anh');
  const [phone, setPhone] = useState<string>(currentUser?.phone || '0987654321');
  const [note, setNote] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const timeSlots = [
    '08:30 - 09:30',
    '09:30 - 10:30',
    '10:30 - 11:30',
    '14:00 - 15:00',
    '15:00 - 16:00',
    '16:30 - 17:30',
    '18:00 - 19:00',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showToast('Vui lòng điền đủ họ tên và số điện thoại', '', 'error');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
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
      setIsSuccess(true);
    }, 500);
  };

  if (!room) {
    return <div className="p-8 text-center">Không tìm thấy phòng</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Back button */}
      <Link to={`/phong/${room.id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> Quay lại chi tiết phòng
      </Link>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6 animate-fadeIn">
        {isSuccess ? (
          /* SUCCESS STATE */
          <div className="text-center py-6 space-y-6">
            <div className="w-20 h-20 bg-emerald-100 text-[#006d37] rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-gray-900">Đặt Lịch Thành Công!</h2>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Yêu cầu xem phòng của bạn đã được chuyển tới chủ trọ <strong>{room.ownerName}</strong>.
              </p>
            </div>

            {/* Booking Summary Card */}
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 text-left space-y-2 text-xs">
              <div className="font-bold text-emerald-900 text-sm">{room.title}</div>
              <p className="text-gray-600">📅 Ngày hẹn: <strong className="text-gray-900">{date}</strong></p>
              <p className="text-gray-600">⏰ Khung giờ: <strong className="text-gray-900">{selectedSlot}</strong></p>
              <p className="text-gray-600">📍 Địa chỉ: {room.address}, {room.district}</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" size="md" className="flex-1" onClick={() => navigate('/tim-kiem')}>
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
              <h1 className="text-2xl font-black text-gray-900">Đặt Lịch Xem Phòng Trực Tiếp</h1>
              <p className="text-xs text-gray-500">Chủ nhà sẽ chuẩn bị phòng và đón bạn đúng giờ</p>
            </div>

            {/* Room mini card */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200">
              <img src={room.images[0]} alt="" className="w-16 h-16 rounded-xl object-cover" />
              <div className="flex-1 overflow-hidden space-y-0.5">
                <span className="text-xs font-bold text-[#006d37]">{formatPrice(room.price)}</span>
                <h4 className="text-xs font-bold text-gray-900 truncate">{room.title}</h4>
                <p className="text-[11px] text-gray-400 truncate">{room.address}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Date selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase">1. Chọn ngày xem phòng:</label>
                <input
                  type="date"
                  required
                  value={date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006d37]"
                />
              </div>

              {/* Time slot grid */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase">2. Chọn khung giờ rảnh:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-2.5 text-xs rounded-xl border font-semibold transition ${
                        selectedSlot === slot
                          ? 'bg-[#006d37] text-white border-[#006d37] shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Họ và tên người xem"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  leftIcon={<User className="w-4 h-4" />}
                />
                <Input
                  label="Số điện thoại liên hệ"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0987 654 321"
                  leftIcon={<Phone className="w-4 h-4" />}
                />
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase">Lời nhắn cho chủ trọ (Tùy chọn):</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Em muốn xem thêm phòng bên cạnh cùng tầm giá..."
                  className="w-full text-xs rounded-xl border border-gray-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-[#006d37]"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
                leftIcon={<Calendar className="w-5 h-5" />}
              >
                Gửi Yêu Cầu Đặt Lịch
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
