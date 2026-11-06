import React, { useState } from 'react';
import {
  X,
  History,
  ShieldCheck,
  User,
  Clock,
  FileText,
  Zap,
  Archive,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../ui/Button';

export interface AuditLogEntry {
  id: string;
  actorName: string;
  action: string;
  description: string;
  target: string;
  timestamp: string;
  badgeColor: string;
}

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log_1',
    actorName: 'Chủ trọ (Bạn)',
    action: 'CHỐT SỐ ĐIỆN NƯỚC',
    description: 'Chốt chỉ số điện P.302: Cũ 1240 ➔ Mới 1355 (+115 kWh).',
    target: 'Phòng 302',
    timestamp: 'Hôm nay lúc 14:30',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    id: 'log_2',
    actorName: 'SePay Webhook',
    action: 'ĐỐI SOÁT TỰ ĐỘNG',
    description: 'Ngân hàng MB báo nhận 4.200.000đ từ khách Nguyễn Văn An (TROXINH HD202611302). Gạch nợ thành công.',
    target: 'Hóa đơn #HD-2026-P302',
    timestamp: 'Hôm nay lúc 11:15',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    id: 'log_3',
    actorName: 'Chủ trọ (Bạn)',
    action: 'TẤT TOÁN TRẢ PHÒNG',
    description: 'Thanh lý hợp đồng HD-2026-P304. Khấu trừ cọc 650.000đ (Điện nước lẻ + Hỏng vòi sen). Hoàn lại khách 3.350.000đ. Phòng về trạng thái Trống.',
    target: 'Phòng 304',
    timestamp: 'Hôm qua lúc 16:45',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  {
    id: 'log_4',
    actorName: 'Chủ trọ (Bạn)',
    action: 'TẠO HỢP ĐỒNG MỚI',
    description: 'Ký hợp đồng 1 năm với khách Lê Thị Thu Mai. Cọc 3.800.000đ.',
    target: 'Phòng 303',
    timestamp: '01/11/2026 lúc 09:20',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
];

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose }) => {
  const [logs] = useState<AuditLogEntry[]>(MOCK_AUDIT_LOGS);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <History className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Nhật Ký Thao Tác Hệ Thống (Audit Log)</h3>
              <p className="text-xs text-slate-300">
                P1-08 • Minh bạch mọi biến động số liệu, chốt điện nước, thanh toán và cấn trừ cọc
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Danh sách log */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition-all shadow-xs space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${log.badgeColor}`}>
                    {log.action}
                  </span>
                  <span className="font-bold text-xs text-slate-900">{log.target}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {log.timestamp}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-medium">{log.description}</p>

              <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Thực hiện bởi: <strong>{log.actorName}</strong></span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};

