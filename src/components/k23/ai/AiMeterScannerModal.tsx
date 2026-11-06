import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Zap,
  Droplets,
  RotateCcw,
  Check,
  Cpu,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { AiMeterScanResult, MeterScanType } from '../../../types/k23AiScanner';
import { scanMeterImage, validateAiScanResult } from '../../../lib/ai/meterOcrEngine';

interface AiMeterScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomNumber?: string;
  meterType?: MeterScanType;
  previousReading?: number;
  onScanSuccess: (newReading: number, photoUrl?: string) => void;
}

export const AiMeterScannerModal: React.FC<AiMeterScannerModalProps> = ({
  isOpen,
  onClose,
  roomNumber = 'P.302',
  meterType = 'electricity',
  previousReading = 1450,
  onScanSuccess,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<AiMeterScanResult | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreviewImage(dataUrl);
      setIsScanning(true);

      try {
        const result = await scanMeterImage(dataUrl, meterType, previousReading);
        setScanResult(result);
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleMockLiveCameraCapture = async () => {
    // Giả lập chụp từ camera công tơ mẫu
    const mockImage =
      meterType === 'electricity'
        ? 'https://images.unsplash.com/photo-1558441719-8b449c6ff67c?auto=format&fit=crop&w=800&q=80'
        : 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=800&q=80';

    setPreviewImage(mockImage);
    setIsScanning(true);

    try {
      const result = await scanMeterImage(mockImage, meterType, previousReading);
      setScanResult(result);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirm = () => {
    if (!scanResult) return;
    onScanSuccess(scanResult.detectedValue, scanResult.capturedImageUrl);
    onClose();
  };

  const handleReset = () => {
    setScanResult(null);
    setPreviewImage(null);
  };

  const validation = scanResult ? validateAiScanResult(scanResult.detectedValue, previousReading) : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                  K23 PMS • P3-01 (AI)
                </span>
                <span className="text-xs text-indigo-200 font-bold">OCR Vision Engine</span>
              </div>
              <h2 className="text-base font-black text-white mt-0.5">
                AI Quét Số Công Tơ {meterType === 'electricity' ? 'Điện' : 'Nước'} ({roomNumber})
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nội dung */}
        <div className="p-5 space-y-4 text-xs">
          {/* Thông tin số cũ */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-600">
              Chỉ số {meterType === 'electricity' ? 'điện' : 'nước'} kỳ trước:
            </span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {previousReading} {meterType === 'electricity' ? 'kWh' : 'm³'}
            </span>
          </div>

          {/* Vùng ngắm Camera Viewfinder hoặc Ảnh đã chụp */}
          <div className="relative aspect-4/3 rounded-2xl bg-slate-950 overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-700">
            {previewImage ? (
              <img src={previewImage} alt="Mặt công tơ" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center space-y-2 p-6">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white/70 mx-auto">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-slate-300 font-bold text-xs">
                  Hướng camera vào ô chữ số của đồng hồ {meterType === 'electricity' ? 'điện' : 'nước'}
                </p>
                <p className="text-slate-500 text-[11px]">
                  AI sẽ tự động nhận diện chữ số mặt kính với độ chính xác trên 98%
                </p>
              </div>
            )}

            {/* Tia Laser Quét Mô Phỏng */}
            {isScanning && (
              <div className="absolute inset-0 bg-indigo-500/10 flex flex-col items-center justify-center">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse absolute top-1/2 -translate-y-1/2" />
                <div className="bg-slate-900/90 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-cyan-400/50 shadow-xl">
                  <Cpu className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span>AI đang phân tích vùng chữ số...</span>
                </div>
              </div>
            )}

            {/* Khung Viewfinder viền góc */}
            <div className="absolute inset-8 pointer-events-none border-2 border-white/30 rounded-xl">
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
            </div>
          </div>

          {/* Kết quả nhận diện */}
          {scanResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> Kết quả AI nhận diện:
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                  Độ chính xác: {(scanResult.confidenceScore * 100).toFixed(1)}%
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div className="text-2xl font-mono font-black text-emerald-700">
                  {scanResult.detectedValue} <span className="text-xs font-sans text-emerald-900">{meterType === 'electricity' ? 'kWh' : 'm³'}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-[11px] block">Tiêu thụ tháng này:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    +{scanResult.detectedValue - previousReading} {meterType === 'electricity' ? 'kWh' : 'm³'}
                  </span>
                </div>
              </div>

              {validation?.warning && (
                <div className="p-2 rounded-lg bg-amber-100/80 border border-amber-300 text-amber-900 text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                  <span>{validation.warning}</span>
                </div>
              )}
            </div>
          )}

          {/* Nút hành động */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {!scanResult ? (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                size="md"
                onClick={handleTriggerUpload}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Tải ảnh chụp sẵn
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleMockLiveCameraCapture}
                leftIcon={<Camera className="w-4 h-4" />}
              >
                Chụp trực tiếp
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                size="md"
                onClick={handleReset}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Quét lại
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirm}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Chấp nhận & Điền số
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
