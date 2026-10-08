import React from 'react';
import { CheckCircle2, Clock, XCircle, Calendar, AlertCircle, Sparkles, UserCheck } from 'lucide-react';

export interface BookingAuditEvent {
  id: string;
  bookingId?: string;
  fromStatus: string;
  toStatus: string;
  actorId?: string;
  actorRole: 'renter' | 'owner' | 'system' | 'admin' | string;
  actorName: string;
  note?: string;
  createdAt: string;
}

interface BookingTimelineProps {
  events: BookingAuditEvent[];
  className?: string;
}

export const BookingTimeline: React.FC<BookingTimelineProps> = ({ events, className = '' }) => {
  if (!events || events.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-gray-400 italic">
        Chưa có lịch sử thay đổi trạng thái cho lịch hẹn này.
      </div>
    );
  }

  const getStatusLabel = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'pending') return 'Chờ xác nhận';
    if (s === 'confirmed' || s === 'approved') return 'Đã xác nhận đón';
    if (s === 'rescheduled') return 'Đề xuất đổi giờ';
    if (s === 'completed') return 'Đã xem phòng xong';
    if (s.includes('cancelled') || s.includes('rejected')) return 'Đã hủy';
    if (s === 'expired') return 'Hết hạn phản hồi';
    return status;
  };

  const getActorLabel = (role: string, name?: string) => {
    if (name) return name;
    if (role === 'owner') return 'Chủ trọ';
    if (role === 'renter') return 'Khách thuê';
    if (role === 'admin') return 'Quản trị viên';
    return 'Hệ thống Trọ Xinh';
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'confirmed' || s === 'approved') return 'text-emerald-600 bg-emerald-50 border-emerald-500';
    if (s === 'completed') return 'text-purple-600 bg-purple-50 border-purple-500';
    if (s.includes('cancelled') || s === 'expired') return 'text-rose-600 bg-rose-50 border-rose-500';
    if (s === 'rescheduled') return 'text-amber-600 bg-amber-50 border-amber-500';
    return 'text-blue-600 bg-blue-50 border-blue-500';
  };

  return (
    <div className={`relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 ${className}`}>
      {events.map((evt, idx) => {
        const colorClass = getStatusColor(evt.toStatus);
        const isLast = idx === events.length - 1;

        return (
          <div key={evt.id || idx} className="relative group">
            {/* Timeline Dot Indicator */}
            <div
              className={`absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 flex items-center justify-center shadow-2xs transition-transform group-hover:scale-110 ${
                isLast ? 'border-[#00a854] ring-2 ring-[#00a854]/20' : 'border-gray-300'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isLast ? 'bg-[#00a854]' : 'bg-gray-400'
                }`}
              />
            </div>

            {/* Event Card */}
            <div className="bg-gray-50/90 hover:bg-gray-50 p-3 rounded-2xl border border-gray-200/80 transition-all space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-gray-900">
                    {getActorLabel(evt.actorRole, evt.actorName)}
                  </span>
                  <span className="text-gray-400 text-[10px]">chuyển sang</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${colorClass}`}>
                    {getStatusLabel(evt.toStatus)}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0 font-medium">
                  {new Date(evt.createdAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  •{' '}
                  {new Date(evt.createdAt).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </span>
              </div>

              {evt.note && (
                <div className="text-xs text-gray-600 bg-white p-2 rounded-xl border border-gray-100 mt-1 flex items-start gap-1.5">
                  <span className="text-[#00a854] text-xs">💬</span>
                  <span className="italic leading-relaxed">"{evt.note}"</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
