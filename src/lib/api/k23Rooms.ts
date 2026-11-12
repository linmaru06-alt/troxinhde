import { supabase, isSupabaseConfigured } from '../supabase';
import { resolveUserIdToUuid } from './messages';
import { Room } from '../../types';

export type K23RoomStatus = 'Còn trống' | 'Đã cho thuê' | 'Đang cọc' | 'Bảo trì' | 'Chờ duyệt';

export interface BatchCreateRoomsParams {
  buildingId: string;
  buildingName: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerAvatar?: string;
  address: string;
  district: string;
  lat?: number;
  lng?: number;
  startFloor: number;
  endFloor: number;
  roomsPerFloor: number;
  roomNumberFormat: 'P.{floor}0{room}' | '{floor}0{room}' | 'P.{floor}.{room}' | '{floor}.{room}';
  roomType: 'Phòng đơn' | 'Studio' | 'Phòng ghép' | 'Căn hộ mini';
  price: number;
  deposit: number;
  area: number;
  electricityPrice: number;
  waterPrice: number;
  amenities: string[];
  defaultImage?: string;
}

export interface GeneratedRoomPreview {
  roomNumber: string;
  floor: number;
  title: string;
  price: number;
  deposit: number;
  area: number;
}

/**
 * Hàm sinh danh sách phòng xem trước (Preview) theo cấu hình tầng & phòng
 */
export function generateRoomsPreview(params: {
  startFloor: number;
  endFloor: number;
  roomsPerFloor: number;
  roomNumberFormat: string;
  roomType: string;
  price: number;
  deposit: number;
  area: number;
}): GeneratedRoomPreview[] {
  const result: GeneratedRoomPreview[] = [];
  const startF = Math.max(1, params.startFloor);
  const endF = Math.max(startF, params.endFloor);
  const perFloor = Math.max(1, Math.min(20, params.roomsPerFloor));

  for (let f = startF; f <= endF; f++) {
    for (let r = 1; r <= perFloor; r++) {
      let roomNum = '';
      const rPadded = r < 10 ? `0${r}` : `${r}`;

      if (params.roomNumberFormat === 'P.{floor}0{room}') {
        roomNum = `P.${f}${rPadded}`;
      } else if (params.roomNumberFormat === '{floor}0{room}') {
        roomNum = `${f}${rPadded}`;
      } else if (params.roomNumberFormat === 'P.{floor}.{room}') {
        roomNum = `P.${f}.${r}`;
      } else {
        roomNum = `${f}.${r}`;
      }

      result.push({
        roomNumber: roomNum,
        floor: f,
        title: `${params.roomType} ${roomNum}`,
        price: params.price,
        deposit: params.deposit,
        area: params.area,
      });
    }
  }

  return result;
}

/**
 * Tạo hàng loạt phòng vào Supabase & hệ thống Trọ Xinh
 */
export async function createBatchRooms(params: BatchCreateRoomsParams): Promise<{
  success: boolean;
  createdRooms: Room[];
  error?: string;
}> {
  try {
    const previewList = generateRoomsPreview({
      startFloor: params.startFloor,
      endFloor: params.endFloor,
      roomsPerFloor: params.roomsPerFloor,
      roomNumberFormat: params.roomNumberFormat,
      roomType: params.roomType,
      price: params.price,
      deposit: params.deposit,
      area: params.area,
    });

    const defaultImg =
      params.defaultImage ||
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80';

    const now = new Date().toISOString();
    const createdRooms: Room[] = [];

    // 1. Chuẩn bị dữ liệu danh sách phòng
    const dbPayloads: any[] = [];
    let cleanOwnerUuid = params.ownerId;
    if (isSupabaseConfigured) {
      try {
        cleanOwnerUuid = await resolveUserIdToUuid(params.ownerId);
      } catch {
        cleanOwnerUuid = params.ownerId;
      }
    }

    for (let i = 0; i < previewList.length; i++) {
      const item = previewList[i];
      const roomId = `room_batch_${Date.now()}_${i + 1}_${Math.random().toString(36).substring(2, 6)}`;

      const newRoom: Room = {
        id: roomId,
        buildingId: params.buildingId,
        buildingName: params.buildingName,
        ownerId: params.ownerId,
        ownerName: params.ownerName,
        ownerPhone: params.ownerPhone,
        ownerAvatar: params.ownerAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=owner',
        title: item.title,
        roomNumber: item.roomNumber,
        price: item.price,
        deposit: item.deposit,
        electricityPrice: params.electricityPrice,
        waterPrice: params.waterPrice,
        area: item.area,
        floor: item.floor,
        type: params.roomType,
        status: 'Còn trống',
        verified: true,
        amenities: params.amenities.length > 0 ? params.amenities : ['Wifi', 'Điều hòa', 'Nóng lạnh', 'Chỗ để xe'],
        images: [defaultImg],
        distanceToSchoolKm: 1.2,
        nearestSchool: 'Đại học Quốc Gia Hà Nội',
        address: params.address,
        district: params.district,
        lat: params.lat,
        lng: params.lng,
        description: `Phòng ${item.roomNumber} tại ${params.buildingName}, tầng ${item.floor}. Đầy đủ nội thất, điều hòa, nóng lạnh, giờ giấc tự do, an ninh 24/7.`,
        views: 0,
        savedCount: 0,
        createdAt: now,
      };

      createdRooms.push(newRoom);

      if (isSupabaseConfigured) {
        dbPayloads.push({
          title: newRoom.title,
          name: newRoom.title,
          room_number: newRoom.roomNumber,
          building_id: params.buildingId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
            ? params.buildingId
            : null,
          owner_id: cleanOwnerUuid,
          price: newRoom.price,
          deposit: newRoom.deposit,
          electricity_price: newRoom.electricityPrice,
          water_price: newRoom.waterPrice,
          area: newRoom.area,
          room_type: newRoom.type,
          amenities: newRoom.amenities,
          description: newRoom.description,
          images: newRoom.images,
          address: newRoom.address,
          district: newRoom.district,
          lat: newRoom.lat,
          lng: newRoom.lng,
          status: 'available',
        });
      }
    }

    // 2. Insert vào Supabase nếu đã kết nối
    if (isSupabaseConfigured && dbPayloads.length > 0) {
      let { data, error } = await supabase.from('rooms').insert(dbPayloads).select();
      if (error && /column .* does not exist|schema cache/i.test(error.message || '')) {
        const legacyPayloads = dbPayloads.map(({ address, district, lat, lng, ...rest }) => rest);
        const retry = await supabase.from('rooms').insert(legacyPayloads).select();
        data = retry.data;
        error = retry.error;
      }
      if (error) {
        console.warn('[K23 Batch Rooms] Supabase insert warning (fallback local state):', error.message);
      } else if (data && data.length > 0) {
        // Cập nhật lại ID từ Supabase nếu có
        data.forEach((dbItem: any, idx: number) => {
          if (createdRooms[idx]) {
            createdRooms[idx].id = dbItem.id;
          }
        });
      }
    }

    return {
      success: true,
      createdRooms,
    };
  } catch (err: any) {
    console.error('[K23 Batch Rooms] Error creating batch rooms:', err);
    return {
      success: false,
      createdRooms: [],
      error: err.message || 'Lỗi khi khởi tạo phòng hàng loạt',
    };
  }
}

