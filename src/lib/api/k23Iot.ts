import { K23IotDevice, LockTemporaryPasscode } from '../../types/k23Iot';

const MOCK_IOT_DEVICES: K23IotDevice[] = [
  {
    id: 'iot_meter_302',
    building_id: 'bld_1',
    room_id: 'room_1',
    room_number: 'P.302',
    device_type: 'smart_meter_tuya',
    device_name: 'Đồng Hồ Điện P302 (Tuya WiFi)',
    device_mac: 'A4:C1:38:9B:45:12',
    status: 'online',
    latest_reading_kwh: 1520,
    last_synced_at: new Date().toISOString(),
    firmware_version: 'v2.4.1',
  },
  {
    id: 'iot_lock_302',
    building_id: 'bld_1',
    room_id: 'room_1',
    room_number: 'P.302',
    device_type: 'smart_lock_ttlock',
    device_name: 'Khóa Vân Tay Cửa P302',
    device_mac: 'E8:68:E7:22:90:AB',
    status: 'online',
    latest_lock_battery: 88,
    last_synced_at: new Date().toISOString(),
    firmware_version: 'v3.1.0',
  },
  {
    id: 'iot_meter_303',
    building_id: 'bld_1',
    room_id: 'room_2',
    room_number: 'P.303',
    device_type: 'smart_meter_zigbee',
    device_name: 'Đồng Hồ Điện P303 (Zigbee)',
    device_mac: 'B0:4E:26:11:78:CC',
    status: 'online',
    latest_reading_kwh: 890,
    last_synced_at: new Date().toISOString(),
    firmware_version: 'v2.1.8',
  },
  {
    id: 'iot_meter_304',
    building_id: 'bld_1',
    room_id: 'room_3',
    room_number: 'P.304',
    device_type: 'smart_meter_tuya',
    device_name: 'Đồng Hồ Điện P304 (Tuya WiFi)',
    device_mac: 'C8:2B:96:44:11:EE',
    status: 'online',
    latest_reading_kwh: 1025,
    last_synced_at: new Date().toISOString(),
    firmware_version: 'v2.4.1',
  },
];

let inMemoryIot = [...MOCK_IOT_DEVICES];

export async function getIotDevices(buildingId: string = 'bld_1'): Promise<K23IotDevice[]> {
  return inMemoryIot.filter((d) => d.building_id === buildingId || buildingId === 'bld_1');
}

/**
 * Đồng bộ chỉ số điện thoại từ Gateway phần cứng về hệ thống
 */
export async function syncIotMeter(deviceId: string): Promise<{ success: boolean; newReading: number }> {
  await new Promise((res) => setTimeout(res, 800)); // Giả lập độ trễ mạng IoT 800ms
  const target = inMemoryIot.find((d) => d.id === deviceId);
  if (!target || !target.latest_reading_kwh) {
    return { success: false, newReading: 0 };
  }

  // Tăng ngẫu nhiên từ 3 đến 8 kWh giả lập điện tiêu thụ thực tế
  const delta = Math.floor(Math.random() * 6) + 3;
  const newReading = target.latest_reading_kwh + delta;

  target.latest_reading_kwh = newReading;
  target.last_synced_at = new Date().toISOString();
  target.status = 'online';

  return { success: true, newReading };
}

/**
 * Sinh mã mở cửa tạm thời 6 số có hiệu lực
 */
export async function generateLockPasscode(
  roomNumber: string,
  hoursValid: number = 24
): Promise<LockTemporaryPasscode> {
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const validFrom = new Date();
  const validTo = new Date(validFrom.getTime() + hoursValid * 60 * 60 * 1000);

  return {
    passcode: pin,
    room_number: roomNumber,
    valid_from: validFrom.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    valid_to: validTo.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ngày ' + validTo.toLocaleDateString('vi-VN'),
  };
}

