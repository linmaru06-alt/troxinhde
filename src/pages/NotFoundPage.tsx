import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col items-center justify-center p-6 text-center space-y-6 animate-fadeIn">
      <div className="text-8xl font-black text-[#006d37]/20 select-none">404</div>
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Trang Không Tồn Tại</h1>
        <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
          Đường dẫn bạn truy cập có thể đã bị xóa hoặc thay đổi. Hãy quay về trang chủ để tiếp tục tìm phòng trọ nhé!
        </p>
      </div>

      <div className="flex gap-3">
        <Link to="/">
          <Button variant="primary" size="md" leftIcon={<Home className="w-4 h-4" />}>
            Về Trang Chủ
          </Button>
        </Link>
        <Link to="/tim-kiem">
          <Button variant="outline" size="md">
            Tìm Phòng Trọ
          </Button>
        </Link>
      </div>
    </div>
  );
};
