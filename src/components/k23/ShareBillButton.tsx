import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { Share2, Download, Check, Loader2 } from 'lucide-react';

interface Props {
  targetRef: React.RefObject<HTMLElement>;
  invoiceCode: string;
  roomTitle?: string;
  className?: string;
}

export const ShareBillButton: React.FC<Props> = ({
  targetRef,
  invoiceCode,
  roomTitle = 'phong',
  className = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!targetRef.current) return null;
    return html2canvas(targetRef.current, {
      scale: 2, // High resolution for crisp text & QR code
      useCORS: true, // Allow loading VietQR remote image
      backgroundColor: '#ffffff',
      logging: false,
    });
  };

  const handleShare = async () => {
    if (!targetRef.current) return;
    setLoading(true);

    try {
      const canvas = await generateCanvas();
      if (!canvas) return;

      const fileName = `Bill-${roomTitle.replace(/\s+/g, '-')}-${invoiceCode}.png`;

      // Check if native Web Share API with files is supported (Mobile)
      if (navigator.canShare && navigator.canShare({ files: [] })) {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], fileName, { type: 'image/png' });
          try {
            await navigator.share({
              title: `Hóa đơn ${roomTitle}`,
              text: `Hóa đơn tiền nhà ${roomTitle} (#${invoiceCode})`,
              files: [file],
            });
          } catch (err: any) {
            // User cancelled or share failed, fallback to download
            if (err.name !== 'AbortError') {
              downloadDataUrl(canvas.toDataURL('image/png'), fileName);
            }
          }
        }, 'image/png');
      } else {
        // Fallback: download image directly
        const dataUrl = canvas.toDataURL('image/png');
        downloadDataUrl(dataUrl, fileName);

        // Also attempt to copy image to clipboard
        try {
          canvas.toBlob(async (blob) => {
            if (blob && navigator.clipboard && window.ClipboardItem) {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob }),
              ]);
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            }
          });
        } catch {
          // Clipboard write image may be restricted on some browsers
        }
      }
    } catch (error) {
      console.error('[ShareBillButton] capture error:', error);
      alert('Không thể xuất ảnh hóa đơn. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const downloadDataUrl = (dataUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:from-emerald-700 hover:to-teal-700 active:scale-95 transition-all disabled:opacity-60 ${className}`}
      title="Xuất ảnh hóa đơn đẹp gửi Zalo"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang tạo ảnh bill...</span>
        </>
      ) : copied ? (
        <>
          <Check className="w-4 h-4 text-emerald-200" />
          <span>Đã copy ảnh!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span>Gửi Bill qua Zalo / Tải ảnh</span>
        </>
      )}
    </button>
  );
};

