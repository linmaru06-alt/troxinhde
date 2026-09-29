import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = 12,
}) => {
  // 1. Nếu chỉ có 1 trang hoặc không có dữ liệu -> Ẩn thanh phân trang
  if (totalPages <= 1) {
    return null;
  }

  const handlePageSelect = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };

  // Tạo danh sách các số trang hiển thị thông minh (hỗ trợ ellipsis ...)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Luôn hiện trang 1
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Luôn hiện trang cuối
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 mt-6 border-t border-gray-100">
      {/* Thông tin số lượng hiển thị */}
      {totalItems !== undefined && (
        <div className="text-xs text-gray-500 font-medium order-2 sm:order-1">
          Hiển thị{' '}
          <span className="font-bold text-gray-900">
            {(currentPage - 1) * pageSize + 1}
          </span>
          {' – '}
          <span className="font-bold text-gray-900">
            {Math.min(currentPage * pageSize, totalItems)}
          </span>{' '}
          trên tổng số <span className="font-bold text-[#006d37]">{totalItems}</span> món đồ
        </div>
      )}

      {/* Cụm điều khiển phân trang */}
      <div className="flex items-center gap-1.5 order-1 sm:order-2 w-full sm:w-auto justify-center">
        {/* Nút Trước (Desktop + Mobile) */}
        <button
          type="button"
          disabled={isFirstPage}
          onClick={() => handlePageSelect(currentPage - 1)}
          className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            isFirstPage
              ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400'
              : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-gray-300 shadow-2xs cursor-pointer active:scale-95'
          }`}
          aria-label="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Trước</span>
        </button>

        {/* Các số trang hiển thị trên Desktop */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis_${idx}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-xs font-bold">
                  ...
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => handlePageSelect(pageNum)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-black transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#006d37] text-white shadow-xs scale-105'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Hiển thị vắn tắt trên Mobile: Trang X / Y */}
        <div className="sm:hidden flex items-center px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-bold text-gray-800">
          <span>{currentPage}</span>
          <span className="mx-1 text-gray-400">/</span>
          <span>{totalPages}</span>
        </div>

        {/* Nút Sau (Desktop + Mobile) */}
        <button
          type="button"
          disabled={isLastPage}
          onClick={() => handlePageSelect(currentPage + 1)}
          className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            isLastPage
              ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400'
              : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-gray-300 shadow-2xs cursor-pointer active:scale-95'
          }`}
          aria-label="Trang sau"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
