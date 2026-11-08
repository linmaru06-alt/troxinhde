// =====================================================================
// K23 MONETIZATION — LISTING VERIFICATION (KIỂU BATDONGSAN)
// Xác thực tin miễn phí: Cấp Tick Xanh + Tặng 48 giờ Đẩy Tin tự động
// Theo tài liệu: "Trọ Xinh - Mô hình thu tiền mới - Đã chốt vòng đời tin 30 ngày"
// =====================================================================

import React, { useState } from 'react';
import { ShieldCheck, Sparkles, Upload, CheckCircle2, AlertCircle, FileText, Video } from 'lucide-react';
import { Room } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';

interface ListingVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
}

export const ListingVerificationModal: React.FC<ListingVerificationModalProps> = ({
  isOpen,
  onClose,
  room,
}) => {
  const { showToast } = useAppStore();
  const [docType, setDocType] = useState<'so_do' | 'hop_dong_uy_quyen' | 'video_phong'>('so_do');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [note, setNote] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmitVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    setTimeout(() => {
      // Giả lập kích hoạt xác thực và tặng 48 giờ đẩy tin VIP
      room.isVerifiedListing = true;
      room.verifiedAt = new Date().toISOString();
      room.isBoosted = true;
      room.boostBadge = 'Xác Thực 48h';
      room.boostExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      setIsUploading(false);
      onClose();
      showToast(
        'Đã gửi hồ sơ xác thực thành công! 🛡️',
        `Phòng ${room.roomNumber} đã nhận Tick Xanh và được kích hoạt 48 giờ đẩy tin tự động miễn phí!`,
        'success'
      );
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-[#00a854] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900">Xác Thực Tin Đăng Chính Chủ</h3>
              <p className="text-[11px] text-gray-500">Phòng {room.roomNumber} - {room.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Khung quyền lợi: Tick xanh + Tặng 48h VIP */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-300 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3 h-3" /> ĐẶC QUYỀN MIỄN PHÍ KIỂU BATDONGSAN
          </div>
          <h4 className="text-sm font-black text-emerald-950">
            Tặng Ngay Tick Xanh + 48 Giờ Đẩy Tin Tự Động (0 Xu)
          </h4>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Tin xác thực có tỷ lệ khách gọi điện xem phòng cao hơn <strong>2.8 lần</strong> so với tin thường. Trọ Xinh cam kết bảo mật 100% hồ sơ pháp lý theo Nghị định 13/2023/NĐ-CP.
          </p>
        </div>

        <form onSubmit={handleSubmitVerification} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-800 block mb-1.5">Loại Giấy Tờ Xác Thực:</label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDocType('so_do')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer font-bold ${
                  docType === 'so_do'
                    ? 'border-[#00a854] bg-emerald-50 text-[#006d37]'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                <span>Sổ đỏ / Sổ hồng</span>
              </button>

              <button
                type="button"
                onClick={() => setDocType('hop_dong_uy_quyen')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer font-bold ${
                  docType === 'hop_dong_uy_quyen'
                    ? 'border-[#00a854] bg-emerald-50 text-[#006d37]'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                <span>HĐ Ủy quyền</span>
              </button>

              <button
                type="button"
                onClick={() => setDocType('video_phong')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer font-bold ${
                  docType === 'video_phong'
                    ? 'border-[#00a854] bg-emerald-50 text-[#006d37]'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Video className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                <span>Video thực tế</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-800 block mb-1.5">Tải Lên Hình Ảnh / Video Minh Chứng:</label>
            <div className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer transition bg-gray-50/50">
              <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
              <p className="text-xs font-bold text-gray-700">Bấm để chọn tệp hoặc kéo thả vào đây</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Hỗ trợ JPG, PNG, PDF, MP4 (Tối đa 25MB)</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-800 block mb-1">Ghi Chú Bổ Sung (Nếu có):</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Vd: Tôi là chủ nhà chính chủ, phòng vừa hoàn thiện..."
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:border-[#00a854] outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="w-2/3 py-2.5 rounded-xl bg-[#00a854] hover:bg-[#008f47] text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isUploading ? 'Đang gửi thẩm định...' : 'Gửi Thẩm Định & Nhận 48h VIP'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
