import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { formatPrice } from '../components/ui/Cards';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
  Loader2,
} from 'lucide-react';

export const BookingPage: React.FC = () => {
  const { roomId } = useParams<{ roomId?: string }>();
  const navigate = useNavigate();
  const { rooms, currentUser, showToast } = useAppStore();

  const room = roomId ? rooms.find((r) => r.id === roomId) : null;

  const [date, setDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<string>('09:30 - 10:30 (Sáng)');
  const [name, setName] = useState<string>(currentUser?.name || '');
  const [phone, setPhone] = useState<string>(currentUser?.phone || '');
  const [note, setNote] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Danh sách lịch hẹn nạp từ Supabase thật
  const [cloudBookings, setCloudBookings] = useState<any[]>([]);
  const [isFetchingBookings, setIsFetchingBookings] = useState<boolean>(true);

  // Nạp danh sách lịch hẹn khi người dùng xem /lich-hen
  useEffect(() => {
    if (roomId || !currentUser?.id || !isSupabaseConfigured) {
      setIsFetchingBookings(false);
      return;
    }

    let isMounted = true;
    setIsFetchingBookings(true);

    async function loadBookings() {
      try {
        const { data, error } = await supabase
          .from('viewing_requests')
          .select(`
            id,
            room_id,
            renter_id,
            owner_id,
            requested_date,
            requested_time,
            message,
            contact_phone,
            status,
            owner_response_note,
            created_at,
            rooms(id, name, price),
            owner:profiles!owner_id(id, full_name, name, phone, avatar_url)
          `)
          .eq('renter_id', currentUser!.id)
          .order('created_at', { ascending: false });

        if (isMounted) {
          if (error) {
            console.error('[BookingPage] Lỗi truy vấn viewing_requests:', error);
          } else {
            setCloudBookings(data || []);
          }
        }
      } catch (err) {
        console.error('[BookingPage] Exception khi tải viewing_requests:', err);
      } finally {
        if (isMounted) setIsFetchingBookings(false);
      }
    }

    loadBookings();

    return () => {
      isMounted = false;
    };
  }, [roomId, currentUser?.id]);

  // Xử lý hủy lịch hẹn thật trên Supabase
  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('viewing_requests')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      setCloudBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
      );
      showToast('Đã hủy lịch hẹn', 'Bạn có thể đặt lại lịch bất kỳ lúc nào.', 'info');
    } catch (err: any) {
      showToast('Không thể hủy lịch', err?.message || 'Vui lòng thử lại sau.', 'error');
    }
  };

  const handleRespondToReschedule = async (bookingId: string, accept: boolean, proposedTime?: string) => {
    try {
      const updates: any = accept 
        ? { status: 'confirmed' }
        : { status: 'cancelled' };
      
      if (accept && proposedTime) {
        updates.time_slot = proposedTime;
      }
        
      const { error } = await supabase
        .from('viewing_requests')
        .update(updates)
        .eq('id', bookingId);

      if (error) throw error;

      setCloudBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, ...updates } : b))
      );
      showToast(
        accept ? 'Đã chấp nhận giờ hẹn mới' : 'Đã từ chối đổi giờ',
        accept ? 'Lịch hẹn của bạn đã được cập nhật thành công.' : 'Lịch hẹn đã bị hủy.',
        accept ? 'success' : 'info'
      );
    } catch (err: any) {
      showToast('Không thể phản hồi', err?.message || 'Vui lòng thử lại sau.', 'error');
    }
  };

  // 1. Trường hợp roomId không hợp lệ hoặc không tìm thấy phòng
  if (roomId && !room) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center space-y-4 bg-white p-8 rounded-3xl border border-gray-200 shadow-md">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-gray-900">Không tìm thấy phòng trọ</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Phòng trọ bạn đang cố gắng đặt lịch không tồn tại hoặc đã bị gỡ bỏ khỏi hệ thống.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link to="/tim-kiem">
              <Button variant="primary" size="md" className="w-full font-bold">
                Tìm phòng trọ khác
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" size="md" className="w-full">
                Về trang chủ
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Trường hợp truy cập /lich-hen (không có roomId): hiển thị danh sách tất cả lịch hẹn thật từ DB
  if (!roomId) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-100 text-[#006d37]">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Lịch Hẹn Xem Phòng Trực Tiếp
              </h1>
              <p className="text-xs text-gray-500">
                Theo dõi trạng thái lịch hẹn, thời gian và thông tin liên hệ chủ nhà
              </p>
            </div>
          </div>
          <Link to="/tim-kiem">
            <Button variant="primary" size="sm">
              Tìm Phòng Mới
            </Button>
          </Link>
        </div>

        {isFetchingBookings ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-gray-200">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#006d37]" />
            <p className="text-xs text-gray-500">Đang tải danh sách lịch hẹn từ hệ thống...</p>
          </div>
        ) : cloudBookings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 p-8 space-y-4 shadow-xs">
            <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-800">Bạn chưa có lịch hẹn xem phòng nào</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Khám phá các phòng trọ đã xác minh và bấm "Đặt lịch" để được hẹn xem trực tiếp miễn phí.
              </p>
            </div>
            <Link to="/tim-kiem" className="inline-block pt-2">
              <Button variant="primary" size="md" className="font-bold shadow-md">
                Khám phá phòng trọ ngay
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {cloudBookings.map((b) => {
              const statusLabel =
                b.status === 'confirmed'
                  ? 'Đã xác nhận'
                  : b.status === 'cancelled' || b.status === 'declined'
                  ? 'Đã hủy'
                  : b.status === 'completed'
                  ? 'Đã xem phòng'
                  : b.status === 'rescheduled'
                  ? 'Chủ trọ đề xuất đổi giờ'
                  : 'Chờ chủ trọ xác nhận';

              const statusColor =
                b.status === 'confirmed'
                  ? 'bg-emerald-100 text-[#006d37]'
                  : b.status === 'cancelled' || b.status === 'declined'
                  ? 'bg-gray-100 text-gray-500'
                  : b.status === 'completed'
                  ? 'bg-blue-100 text-blue-800'
                  : b.status === 'rescheduled'
                  ? 'bg-blue-100 text-blue-700 animate-pulse'
                  : 'bg-amber-100 text-amber-800 animate-pulse';

              const roomTitle = b.rooms?.title || 'Phòng trọ';
              const roomPrice = b.rooms?.price;
              const ownerPhone = b.owner?.phone;

              return (
                <div
                  key={b.id}
                  className="bg-white rounded-3xl p-5 border border-gray-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:shadow-md"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${statusColor}`}>
                        {statusLabel}
                      </span>
                      {roomPrice && (
                        <span className="text-xs font-black text-[#006d37]">
                          {formatPrice(roomPrice)}/tháng
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 leading-snug">{roomTitle}</h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 pt-1">
                      <span className="flex items-center gap-1 font-semibold text-gray-700">
                        <Calendar className="w-3.5 h-3.5 text-[#006d37]" /> {b.requested_date}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-gray-700">
                        <Clock className="w-3.5 h-3.5 text-[#006d37]" /> {b.requested_time}
                      </span>
                    </div>

                    {/* Số điện thoại chủ trọ: Chỉ hiển thị khi chủ trọ đã xác nhận lịch hẹn */}
                    <div className="pt-1 text-xs space-y-2">
                      {b.status === 'confirmed' && ownerPhone ? (
                        <span className="inline-flex items-center gap-1 text-[#006d37] font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                          <Phone className="w-3 h-3" /> Chủ trọ: {ownerPhone}
                        </span>
                      ) : b.status === 'rescheduled' ? (
                        <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl space-y-2">
                          <p className="text-blue-900 font-medium">Chủ trọ đề xuất giờ xem mới:</p>
                          <p className="text-blue-800 font-bold bg-white px-2 py-1 inline-block rounded border border-blue-100">
                            {b.owner_response_note}
                          </p>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleRespondToReschedule(b.id, true, b.owner_response_note)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition text-xs"
                            >
                              Đồng ý
                            </button>
                            <button
                              onClick={() => handleRespondToReschedule(b.id, false)}
                              className="px-3 py-1.5 bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 font-bold rounded-lg transition text-xs"
                            >
                              Từ chối
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px]">
                          Số điện thoại chủ trọ sẽ hiển thị sau khi yêu cầu được xác nhận
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                    {b.room_id && (
                      <Link to={`/phong/${b.room_id}`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          Chi tiết phòng
                        </Button>
                      </Link>
                    )}
                    {b.status === 'pending' && (
                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 font-bold rounded-xl transition cursor-pointer"
                      >
                        Hủy hẹn
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

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
    if (!room) return;

    if (!currentUser?.id) {
      showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để đặt lịch xem phòng.', 'warning');
      navigate(`/dang-nhap?returnUrl=${encodeURIComponent(`/dat-lich/${room.id}`)}`);
      return;
    }

    if (!name.trim() || !phone.trim()) {
      showToast('Vui lòng điền đủ họ tên và số điện thoại', '', 'error');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Lưu chính xác vào Supabase viewing_requests
      const viewingPayload = {
        room_id: room.id,
        renter_id: currentUser.id,
        owner_id: room.ownerId,
        requested_date: date,
        requested_time: selectedSlot,
        contact_phone: phone.trim(),
        message: note.trim() || null,
        status: 'pending',
      };

      const { data: createdReq, error: insertErr } = await supabase
        .from('viewing_requests')
        .insert(viewingPayload)
        .select()
        .single();

      if (insertErr) {
        throw insertErr;
      }

      // 2. Gửi notification thật cho Chủ trọ vào bảng notifications
      try {
        await supabase.from('notifications').insert({
          user_id: room.ownerId,
          type: 'booking_request',
          title: `Lịch hẹn xem phòng mới: ${room.title} 📅`,
          body: `Khách thuê ${name.trim()} (${phone.trim()}) đã đặt lịch xem phòng vào ngày ${date}, khung giờ ${selectedSlot}.`,
          cta_url: '/chu-tro/tong-quan',
          cta_label: 'Xem lịch hẹn',
          is_read: false,
        });
      } catch (notifErr) {
        console.warn('[Booking] Lỗi tạo thông báo cho chủ trọ:', notifErr);
      }

      setIsSuccess(true);
      showToast('Đã gửi yêu cầu đặt lịch!', 'Chủ trọ sẽ nhận được thông báo và liên hệ lại.', 'success');
    } catch (err: any) {
      console.error('[Booking] Lỗi đặt lịch hẹn trên Supabase:', err);
      showToast(
        'Không thể đặt lịch hẹn',
        err?.message || 'Có lỗi xảy ra khi lưu lịch hẹn vào cơ sở dữ liệu. Vui lòng thử lại.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
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
              <img src={room.images?.[0] || '/images/hero-banner.webp'} alt="" className="w-16 h-16 rounded-xl object-cover ring-1 ring-black/5 shrink-0" />
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
