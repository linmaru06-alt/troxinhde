import React, { useState, useRef, useEffect } from 'react';
import { UploadFolder, uploadImage, validateImageFile } from '../../lib/cloudinary';
import { useAppStore } from '../../store/useAppStore';
import { Image as ImageIcon, X, Check, AlertCircle, Loader2, GripVertical, Plus, ChevronLeft, ChevronRight, Star, RotateCw } from 'lucide-react';

export interface ImageUploaderProps {
  folder: UploadFolder;
  maxFiles?: number;
  maxSizeMB?: number;
  onComplete: (urls: string[]) => void;
  existingUrls?: string[];
  accept?: string;
  disabled?: boolean;
  label?: string;
  helperText?: string;
}

export interface UploadFileItem {
  id: string;
  file?: File;
  url: string;
  status: 'local' | 'uploading' | 'done' | 'error';
  progress?: number;
  errorMsg?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  folder,
  maxFiles = 10,
  maxSizeMB = 5,
  onComplete,
  existingUrls = [],
  accept = 'image/jpeg,image/png,image/webp',
  disabled = false,
  label = 'Ảnh tải lên',
  helperText = 'Ảnh đầu tiên sẽ hiển thị làm ảnh bìa',
}) => {
  const { showToast } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize from existingUrls
  const [items, setItems] = useState<UploadFileItem[]>(() =>
    existingUrls.map((url, i) => ({
      id: `existing_${i}_${url.slice(-10)}`,
      url,
      status: 'done',
    }))
  );

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Sync external existingUrls when changed
  useEffect(() => {
    if (existingUrls.length > 0 && items.length === 0) {
      setItems(
        existingUrls.map((url, i) => ({
          id: `existing_${i}_${url.slice(-10)}`,
          url,
          status: 'done',
        }))
      );
    }
  }, [existingUrls]);

  const notifyUrls = (currentItems: UploadFileItem[]) => {
    const doneUrls = currentItems
      .filter((it) => it.status === 'done' || it.status === 'local')
      .map((it) => it.url);
    onComplete(doneUrls);
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || disabled) return;

    const remainingSlots = maxFiles - items.length;
    if (remainingSlots <= 0) {
      showToast(`Đã đạt giới hạn tối đa ${maxFiles} ảnh`, '', 'warning');
      return;
    }

    const filesArray = Array.from(fileList).slice(0, remainingSlots);
    if (fileList.length > remainingSlots) {
      showToast(`Chỉ có thể chọn thêm ${remainingSlots} ảnh nữa`, '', 'warning');
    }

    const validNewItems: UploadFileItem[] = [];
    const filesToUpload: { file: File; id: string }[] = [];

    for (const file of filesArray) {
      const error = validateImageFile(file);
      if (error) {
        showToast(error, '', 'error');
        continue;
      }

      const tempId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const localUrl = URL.createObjectURL(file);

      const newItem: UploadFileItem = {
        id: tempId,
        file,
        url: localUrl,
        status: 'uploading',
        progress: 0,
      };

      validNewItems.push(newItem);
      filesToUpload.push({ file, id: tempId });
    }

    if (validNewItems.length === 0) return;

    const nextItems = [...items, ...validNewItems];
    setItems(nextItems);
    setIsUploading(true);

    // Sequential Upload UX
    let updatedItemsState = [...nextItems];

    for (let i = 0; i < filesToUpload.length; i++) {
      const { file, id } = filesToUpload[i];
      try {
        const secureUrl = await uploadImage(file, folder);
        updatedItemsState = updatedItemsState.map((it) =>
          it.id === id ? { ...it, url: secureUrl, status: 'done', progress: 100 } : it
        );
        setItems([...updatedItemsState]);
      } catch (err: any) {
        const errorMsg = err?.message || 'Tải lên thất bại';
        updatedItemsState = updatedItemsState.map((it) =>
          it.id === id ? { ...it, status: 'error', errorMsg } : it
        );
        setItems([...updatedItemsState]);
        showToast(`Tải lên ảnh ${file.name} thất bại`, errorMsg, 'error');
      }
    }

    setIsUploading(false);
    notifyUrls(updatedItemsState);
  };

  const handleRemove = (idToRemove: string) => {
    const filtered = items.filter((it) => it.id !== idToRemove);
    setItems(filtered);
    notifyUrls(filtered);
  };

  // Move item left or right (convenient for mobile and quick reordering)
  const handleMove = (index: number, direction: 'left' | 'right') => {
    if (disabled || isUploading) return;
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setItems(reordered);
    notifyUrls(reordered);
  };

  // Make an image the cover photo (move to index 0)
  const handleSetCover = (index: number) => {
    if (disabled || isUploading || index === 0) return;
    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    reordered.unshift(moved);
    setItems(reordered);
    notifyUrls(reordered);
    showToast('Đã đặt làm ảnh bìa', 'Ảnh này sẽ hiển thị đầu tiên trên tin đăng', 'success');
  };

  // Retry uploading a failed image
  const handleRetry = async (idToRetry: string) => {
    const itemToRetry = items.find((it) => it.id === idToRetry);
    if (!itemToRetry || !itemToRetry.file) return;

    setItems((prev) =>
      prev.map((it) => (it.id === idToRetry ? { ...it, status: 'uploading', errorMsg: undefined } : it))
    );
    setIsUploading(true);

    try {
      const secureUrl = await uploadImage(itemToRetry.file, folder);
      setItems((prev) => {
        const next = prev.map((it) =>
          it.id === idToRetry ? { ...it, url: secureUrl, status: 'done' as const, progress: 100 } : it
        );
        notifyUrls(next);
        return next;
      });
      showToast('Tải lại ảnh thành công', '', 'success');
    } catch (err: any) {
      const errorMsg = err?.message || 'Tải lại thất bại';
      setItems((prev) =>
        prev.map((it) => (it.id === idToRetry ? { ...it, status: 'error' as const, errorMsg } : it))
      );
      showToast('Tải lại ảnh thất bại', errorMsg, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // HTML5 Drag & Drop reorder
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverItem = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const reordered = [...items];
    const draggedItem = reordered[draggedIndex];
    reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    setItems(reordered);
    notifyUrls(reordered);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const doneCount = items.filter((it) => it.status === 'done').length;
  const errorCount = items.filter((it) => it.status === 'error').length;
  const uploadingCount = items.filter((it) => it.status === 'uploading').length;

  return (
    <div className="space-y-3">
      {/* Label & Header */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
            {label} <span className="text-gray-400 font-normal">({items.length}/{maxFiles})</span>
          </label>
          {helperText && <p className="text-[11px] text-gray-500 mt-0.5">{helperText}</p>}
        </div>
        <div className="flex items-center gap-2">
          {errorCount > 0 && (
            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
              {errorCount} ảnh tải lỗi
            </span>
          )}
          {isUploading && (
            <div className="flex items-center gap-1.5 text-xs text-[#006d37] font-semibold animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Đang tải lên ({doneCount}/{items.length})...</span>
            </div>
          )}
        </div>
      </div>

      {/* Upload Zone & Previews Grid */}
      <div className="space-y-3">
        {/* Upload Dropzone */}
        {items.length < maxFiles && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFilesSelected(e.dataTransfer.files);
            }}
            onClick={() => {
              if (!disabled && fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
              }
            }}
            className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
              disabled
                ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200'
                : isDragging
                ? 'border-[#006d37] bg-emerald-50/70 scale-[0.99]'
                : 'border-gray-300 hover:border-[#006d37] bg-gray-50/50 hover:bg-emerald-50/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={accept}
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
              disabled={disabled}
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-gray-200 flex items-center justify-center text-[#006d37]">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold text-gray-800">
                  Kéo thả ảnh vào đây hoặc <span className="text-[#006d37] underline">chọn từ thiết bị</span>
                </p>
                <p className="text-[11px] text-gray-400">
                  Tối đa {maxFiles} ảnh • Mỗi ảnh không quá {maxSizeMB}MB • Kéo thả hoặc bấm nút mũi tên để sắp xếp thứ tự
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#006d37] h-full transition-all duration-300 rounded-full"
              style={{
                width: `${items.length > 0 ? (doneCount / items.length) * 100 : 0}%`,
              }}
            />
          </div>
        )}

        {/* Images Grid Previews */}
        {items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
            {items.map((item, index) => {
              const isCover = index === 0;
              return (
                <div
                  key={item.id}
                  draggable={!disabled && !isUploading}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOverItem(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group relative aspect-4/3 rounded-2xl overflow-hidden border bg-gray-100 shadow-2xs transition-all ${
                    isCover ? 'border-[#006d37] ring-2 ring-emerald-500/30' : 'border-gray-200'
                  } ${draggedIndex === index ? 'opacity-40 scale-95' : 'hover:shadow-md'}`}
                >
                  {/* Thumbnail Image */}
                  <img
                    src={item.url}
                    alt={`Ảnh ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Position Badge (Top Left) */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                    {isCover ? (
                      <span className="bg-[#006d37] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-1">
                        ★ Ảnh Bìa
                      </span>
                    ) : (
                      <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                        #{index + 1}
                      </span>
                    )}
                  </div>

                  {/* Top Right: Delete Button */}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(item.id);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-rose-600 text-white flex items-center justify-center transition shadow-sm z-10 cursor-pointer"
                      title="Xóa ảnh này"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Status Overlay: Uploading */}
                  {item.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex flex-col items-center justify-center text-white gap-1 p-2 z-20">
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                      <span className="text-[10px] font-semibold">Đang tải lên...</span>
                    </div>
                  )}

                  {/* Status Overlay: Error with retry & remove options */}
                  {item.status === 'error' && (
                    <div className="absolute inset-0 bg-rose-950/85 backdrop-blur-2xs flex flex-col items-center justify-center text-white p-2 text-center gap-1.5 z-20">
                      <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
                      <span className="text-[10px] font-bold leading-tight line-clamp-2 text-rose-200">
                        {item.errorMsg || 'Tải ảnh lỗi'}
                      </span>
                      <div className="flex items-center gap-1 pt-1">
                        {item.file && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetry(item.id);
                            }}
                            className="bg-white/20 hover:bg-white/30 text-white text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition"
                            title="Thử tải lại ảnh này"
                          >
                            <RotateCw className="w-3 h-3" />
                            Thử lại
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(item.id);
                          }}
                          className="bg-rose-600/80 hover:bg-rose-600 text-white text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer transition"
                          title="Bỏ qua ảnh này"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Bottom Action Bar: Set as cover & Reorder Arrows */}
                  {!disabled && !isUploading && item.status !== 'uploading' && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 flex items-center justify-between opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
                      {/* Left arrow */}
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMove(index, 'left');
                        }}
                        className={`w-5 h-5 rounded flex items-center justify-center text-white transition ${
                          index === 0 ? 'opacity-30 cursor-not-allowed' : 'bg-white/20 hover:bg-white/40 cursor-pointer'
                        }`}
                        title="Chuyển sang trước"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      {/* Set as cover button (if not already cover) */}
                      {!isCover && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetCover(index);
                          }}
                          className="px-1.5 py-0.5 rounded bg-amber-500/90 hover:bg-amber-500 text-white text-[9px] font-bold flex items-center gap-0.5 transition cursor-pointer shadow-xs"
                          title="Đặt ảnh này làm ảnh bìa"
                        >
                          <Star className="w-2.5 h-2.5 fill-white" />
                          <span>Làm bìa</span>
                        </button>
                      )}

                      {/* Right arrow */}
                      <button
                        type="button"
                        disabled={index === items.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMove(index, 'right');
                        }}
                        className={`w-5 h-5 rounded flex items-center justify-center text-white transition ${
                          index === items.length - 1 ? 'opacity-30 cursor-not-allowed' : 'bg-white/20 hover:bg-white/40 cursor-pointer'
                        }`}
                        title="Chuyển sang sau"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
