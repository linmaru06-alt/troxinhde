import React, { useState, useRef } from 'react';
import { UploadFolder, uploadImage, validateImageFile } from '../../lib/cloudinary';
import { useAppStore } from '../../store/useAppStore';
import { Camera, Loader2 } from 'lucide-react';

export interface AvatarUploaderProps {
  currentUrl?: string;
  onComplete: (urls: string[]) => void;
  folder?: UploadFolder;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  currentUrl,
  onComplete,
  folder = 'troxinh/avatars',
  size = 'lg',
  disabled = false,
}) => {
  const { showToast } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentUrl);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  };

  const handleFileSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || disabled) return;

    const file = fileList[0];
    const error = validateImageFile(file);
    if (error) {
      showToast(error, '', 'error');
      return;
    }

    // Optimistic local preview
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setIsUploading(true);

    try {
      const secureUrl = await uploadImage(file, folder);
      setPreviewUrl(secureUrl);
      onComplete([secureUrl]);
      showToast('Đổi ảnh đại diện thành công!', '', 'success');
    } catch (err: any) {
      showToast('Tải lên ảnh thất bại', err?.message || '', 'error');
      setPreviewUrl(currentUrl);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative inline-block group">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => handleFileSelected(e.target.files)}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <div
        onClick={() => {
          if (!disabled && !isUploading && fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
          }
        }}
        className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-white shadow-md bg-gray-100 cursor-pointer group-hover:ring-2 group-hover:ring-[#006d37] transition-all`}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-[#006d37] font-bold text-xl">
            👤
          </div>
        )}

        {/* Hover Overlay */}
        {!disabled && !isUploading && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200">
            <Camera className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Đổi ảnh</span>
          </div>
        )}

        {/* Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-1">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span className="text-[9px] font-semibold">Đang tải...</span>
          </div>
        )}
      </div>
    </div>
  );
};
