import React, { useEffect } from 'react';

/**
 * Lá chắn Client-Side chống Clickjacking theo chuẩn Qiangu Web
 * Tự động phát hiện và phá vỡ lồng iframe độc hại (Framebusting Defense)
 */
export const FramebustingGuard: React.FC = () => {
  useEffect(() => {
    try {
      // 1. Kiểm tra xem cửa sổ hiện tại có phải là cửa sổ cấp cao nhất (Top Window) không
      if (window.top !== window.self) {
        console.error('[Security Guard] PHÁT HIỆN HÀNH VI NHÚNG TRANG TRÁI PHÉP (CLICKJACKING ATTEMPT)!');

        // 2. Ẩn toàn bộ nội dung DOM ngay lập tức để kẻ tấn công không thể hiển thị giao diện ma
        document.documentElement.style.display = 'none';

        // 3. Tự động phá vỡ lồng iframe và chuyển hướng cửa sổ cha về domain chính thức
        if (window.top) {
          window.top.location.href = window.self.location.href;
        }
      }
    } catch {
      // Nếu bị chặn truy cập window.top do cross-origin iframe security, chắc chắn trang đang bị nhúng ngoài!
      document.documentElement.style.display = 'none';
      window.location.href = 'https://troxinh.vn';
    }
  }, []);

  return null;
};
