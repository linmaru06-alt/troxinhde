export type IotDeviceType = 'smart_meter_tuya' | 'smart_meter_zigbee' | 'smart_lock_ttlock';

export interface K23IotDevice {
  id: string;
  building_id: string;
  room_id: string;
  room_number: string;
  device_type: IotDeviceType;
  device_name: string;
  device_mac: string;
  status: 'online' | 'offline' | 'syncing';
  latest_reading_kwh?: number; // Số điện đọc tự động
  latest_lock_battery?: number; // Pin khóa vân tay (%)
  last_synced_at: string;
  firmware_version?: string;
}

export interface LockTemporaryPasscode {
  passcode: string;
  valid_from: string;
  valid_to: string;
  room_number: string;
}

export const IOT_DEVICE_META: Record<IotDeviceType, { label: string; iconType: 'meter' | 'lock'; provider: string }> = {
  smart_meter_tuya: {
    label: 'Công Tơ Điện Thông Minh Tuya WiFi',
    iconType: 'meter',
    provider: 'Tuya Smart Cloud API',
  },
  smart_meter_zigbee: {
    label: 'Công Tơ Điện Đo Từ Xa Zigbee 3.0',
    iconType: 'meter',
    provider: 'Zigbee Gateway Hub',
  },
  smart_lock_ttlock: {
    label: 'Khóa Cửa Thông Minh Vân Tay TTLock',
    iconType: 'lock',
    provider: 'TTLock Open Platform',
  },
};

