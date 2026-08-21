import React from 'react';
import { Button } from './Button';
import { SearchX, Inbox, HeartOff, BellOff, ShoppingBag } from 'lucide-react';

export interface EmptyStateProps {
  icon?: 'search' | 'inbox' | 'saved' | 'bell' | 'market';
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'search',
  title,
  description,
  actionText,
  onAction,
}) => {
  const renderIcon = () => {
    switch (icon) {
      case 'inbox':
        return <Inbox className="w-12 h-12 text-gray-400" />;
      case 'saved':
        return <HeartOff className="w-12 h-12 text-gray-400" />;
      case 'bell':
        return <BellOff className="w-12 h-12 text-gray-400" />;
      case 'market':
        return <ShoppingBag className="w-12 h-12 text-gray-400" />;
      default:
        return <SearchX className="w-12 h-12 text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-white rounded-2xl border border-dashed border-gray-300 max-w-lg mx-auto my-6 animate-fadeIn">
      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 ring-8 ring-gray-50/50">
        {renderIcon()}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <Button onClick={onAction} variant="primary" size="md">
          {actionText}
        </Button>
      )}
    </div>
  );
};
