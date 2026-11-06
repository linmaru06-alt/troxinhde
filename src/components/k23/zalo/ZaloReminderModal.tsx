import React, { useState, useMemo } from 'react';
import {
  X,
  MessageSquare,
  Copy,
  ExternalLink,
  Check,
  Send,
  AlertTriangle,
  Clock,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import {
  ZaloTemplateType,
  ZaloMessageData,
  buildZaloMessage,
  openZaloDeepLink,
} from '../../../utils/zaloTemplateBuilder';

interface ZaloReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ZaloMessageData;
}

export const ZaloReminderModal: React.FC<ZaloReminderModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ZaloTemplateType>('bill_announcement');
  const [customText, setCustomText] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Sinh nội dung mặc định theo template được chọn
  const defaultMessage = useMemo(() => {
    return buildZaloMessage(selectedTemplate, data);
  }, [selectedTemplate, data]);

  // Khi đổi template, cập nhật lại customText
  React.useEffect(() => {
    setCustomText(defaultMessage);
  }, [defaultMessage]);

  const handleCopyAndOpenZalo = async () => {
    const textToSend = customText || defaultMessage;
    await openZaloDeepLink(data.tenantPhone, textToSend);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleCopyOnly = async () => {
    const textToSend = customText || defaultMessage;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(textToSend);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <MessageSquare className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">Soạn Tin Nhắn Zalo 1-Chạm</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase tracking-wider">
                  M-06 NẤC 1
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Gửi tới: <strong className="text-white">{data.tenantName}</strong> ({data.roomNumber}) — SĐT: {data.tenantPhone || 'Chưa cập nhật'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Mẫu Template Tabs */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-slate-100 border-b border-slate-200 text-xs shrink-0">
          <button
            onClick={() => setSelectedTemplate('bill_announcement')}
            className={`p-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              selectedTemplate === 'bill_announcement'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span className="truncate">1. Bill đầu tháng</span>
          </button>

          <button
            onClick={() => setSelectedTemplate('gentle_reminder')}
            className={`p-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              selectedTemplate === 'gentle_reminder'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="truncate">2. Nhắc sắp đến hạn</span>
          </button>

          <button
            onClick={() => setSelectedTemplate('overdue_warning')}
            className={`p-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              selectedTemplate === 'overdue_warning'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="truncate">3. Cảnh báo quá hạn</span>
          </button>
        </div>

        {/* Body Textarea */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Nội dung tin nhắn (bạn có thể gõ thêm lời nhắn riêng):</span>
            <span className="text-[11px] text-slate-400 font-mono">{customText.length} ký tự</span>
          </div>

          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            rows={11}
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 leading-relaxed focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition resize-none"
          />

          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Khi bấm <strong>&quot;Sao Chép &amp; Mở Zalo Chat&quot;</strong>, hệ thống sẽ tự động sao chép toàn bộ văn bản trên vào bộ nhớ đệm và mở trang chat Zalo của khách thuê để bạn dán (Ctrl+V) gửi ngay trong 3 giây.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyOnly}
            leftIcon={isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            {isCopied ? 'Đã sao chép tin nhắn!' : 'Chỉ sao chép văn bản'}
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              Đóng
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleCopyAndOpenZalo}
              leftIcon={<Send className="w-4 h-4" />}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full sm:w-auto"
            >
              Sao Chép &amp; Mở Zalo Chat →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

