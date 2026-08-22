import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

export function useRealtimeRoomStatus() {
  const { currentUser, rooms, approveRoom, updateRoomStatus, showToast } = useAppStore();

  useEffect(() => {
    if (!currentUser?.id || !isSupabaseConfigured) return;

    const channel = supabase
      .channel('owner-room-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `owner_id=eq.${currentUser.id}`,
        },
        (payload: any) => {
          const updatedRoom = payload.new;
          if (!updatedRoom) return;

          const existing = rooms.find((r) => r.id === updatedRoom.id);
          const oldStatus = existing?.status;
          const newStatus = updatedRoom.status;

          if (oldStatus !== newStatus) {
            updateRoomStatus(updatedRoom.id, newStatus);

            if (newStatus === 'Còn trống' && oldStatus === 'Chờ duyệt') {
              showToast(
                'Tin đăng phòng đã được duyệt! 🎉',
                `Phòng "${updatedRoom.title || existing?.title}" đã chính thức hiển thị trên hệ thống.`,
                'success'
              );
            } else if (newStatus === 'Bị từ chối') {
              showToast(
                'Tin đăng phòng bị từ chối',
                `Lý do: ${updatedRoom.rejection_reason || 'Cần bổ sung thêm thông tin'}`,
                'warning'
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, rooms, approveRoom, updateRoomStatus, showToast]);
}
