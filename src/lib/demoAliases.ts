export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

import { supabase, isSupabaseConfigured } from "./supabase";

export const KNOWN_DEMO_UUIDS: Record<string, string> = {
  demo_admin_uuid: "00000000-0000-0000-0000-000000000001",
  demo_admin_troxinh: "00000000-0000-0000-0000-000000000001",
  usr_admin_quan66934: "00000000-0000-0000-0000-000000000001",
  "admin@troxinh.vn": "00000000-0000-0000-0000-000000000001",

  demo_owner_uuid: "00000000-0000-0000-0000-000000000002",
  demo_owner_troxinh: "00000000-0000-0000-0000-000000000002",
  user_owner_1: "00000000-0000-0000-0000-000000000002",
  "chutro@troxinh.vn": "00000000-0000-0000-0000-000000000002",

  demo_renter_uuid: "00000000-0000-0000-0000-000000000003",
  demo_renter_troxinh: "00000000-0000-0000-0000-000000000003",
  user_renter_1: "00000000-0000-0000-0000-000000000003",
  user_renter_2: "00000000-0000-0000-0000-000000000003",
  "nguoithue@troxinh.vn": "00000000-0000-0000-0000-000000000003",
};

export const KNOWN_USER_NAMES: Record<
  string,
  { name: string; avatar: string }
> = {
  "00000000-0000-0000-0000-000000000001": {
    name: "Ban Quản Trị Trọ Xinh",
    avatar: "/images/user-avatar.jpg",
  },
  "00000000-0000-0000-0000-000000000002": {
    name: "Trần Quốc Tuấn (Chủ Trọ)",
    avatar: "/images/user-avatar.jpg",
  },
  "00000000-0000-0000-0000-000000000003": {
    name: "Nguyễn Văn An (Người Thuê)",
    avatar: "/images/user-avatar.jpg",
  },
  demo_admin_uuid: {
    name: "Ban Quản Trị Trọ Xinh",
    avatar: "/images/user-avatar.jpg",
  },
  demo_owner_uuid: {
    name: "Trần Quốc Tuấn (Chủ Trọ)",
    avatar: "/images/user-avatar.jpg",
  },
  demo_renter_uuid: {
    name: "Nguyễn Văn An (Người Thuê)",
    avatar: "/images/user-avatar.jpg",
  },
  user_owner_1: {
    name: "Trần Quốc Tuấn (Chủ Trọ)",
    avatar: "/images/user-avatar.jpg",
  },
  user_renter_1: {
    name: "Nguyễn Văn An (Người Thuê)",
    avatar: "/images/user-avatar.jpg",
  },
};

export const DEMO_GROUPS: string[][] = [
  [
    "00000000-0000-0000-0000-000000000001",
    "demo_admin_uuid",
    "demo_admin_troxinh",
    "usr_admin_quan66934",
    "admin@troxinh.vn",
  ],
  [
    "00000000-0000-0000-0000-000000000002",
    "demo_owner_uuid",
    "demo_owner_troxinh",
    "user_owner_1",
    "chutro@troxinh.vn",
  ],
  [
    "00000000-0000-0000-0000-000000000003",
    "demo_renter_uuid",
    "demo_renter_troxinh",
    "user_renter_1",
    "user_renter_2",
    "nguoithue@troxinh.vn",
  ],
];

/**
 * Phân giải một ID hoặc alias demo về UUID tương ứng nếu có
 */
export function resolveDemoAlias(id?: string | null): string | null {
  if (!id) return null;
  const trimmed = id.trim();
  if (KNOWN_DEMO_UUIDS[trimmed]) {
    return KNOWN_DEMO_UUIDS[trimmed];
  }
  return null;
}

/**
 * Kiểm tra một ID có phải thuộc về tài khoản demo/mock không
 */
export function isDemoUser(id?: string | null): boolean {
  if (!id) return false;
  const trimmed = id.trim();
  if (KNOWN_DEMO_UUIDS[trimmed]) return true;
  if (trimmed.startsWith("demo_") || trimmed.startsWith("user_") || trimmed.startsWith("mock-")) {
    return true;
  }
  return DEMO_GROUPS.some((group) => group.includes(trimmed));
}

/**
 * Kiểm tra xem 2 ID người dùng có trỏ về cùng một tài khoản hay không
 * (Bao gồm chuẩn hóa giữa UUID trong database và các ID demo/mock)
 */
export function isSameUserId(
  id1?: string | null,
  id2?: string | null,
): boolean {
  if (!id1 || !id2) return false;
  const clean1 = id1.trim();
  const clean2 = id2.trim();
  if (clean1 === clean2) return true;

  for (const group of DEMO_GROUPS) {
    if (group.includes(clean1) && group.includes(clean2)) {
      return true;
    }
  }

  return false;
}

/**
 * Chuẩn hóa ID người dùng thành UUID hợp lệ để không gây lỗi SQL syntax trong PostgreSQL
 */
export async function resolveUserIdToUuid(userId: string): Promise<string> {
  if (!userId) return "";
  const trimmed = userId.trim();

  // 1. Đã là UUID chuẩn -> trả về ngay
  if (UUID_REGEX.test(trimmed)) {
    return trimmed;
  }

  // 2. Demo alias (usr_admin_quan66934, usr_renter_..., usr_owner_...) -> lấy UUID tương ứng
  const demoUuid = resolveDemoAlias(trimmed);
  if (demoUuid) {
    return demoUuid;
  }

  // 3. Nếu là currentUser trong localStorage đã có profile id là UUID -> lấy ngay (0ms)
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      const raw = localStorage.getItem("troxinh_storage_v4");
      if (raw) {
        const parsed = JSON.parse(raw);
        const current = parsed?.state?.currentUser;
        if (current?.id && UUID_REGEX.test(current.id)) {
          if (current.id === trimmed || current.firebaseUid === trimmed || isSameUserId(current.id, trimmed)) {
            return current.id;
          }
        }
      }
    }
  } catch {}

  // 4. Tra cứu trên bảng profiles bằng firebase_uid
  if (isSupabaseConfigured) {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("firebase_uid", trimmed)
        .maybeSingle();

      if (!error && profile?.id && UUID_REGEX.test(profile.id)) {
        return profile.id;
      }
    } catch (err) {
      console.warn(
        "[UserResolver] Không thể tra cứu profile UUID cho userId:",
        trimmed,
        err,
      );
    }
  }

  // 5. Fallback an toàn: Sinh UUID xác định (deterministic) từ chuỗi ID
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash << 5) - hash + trimmed.charCodeAt(i);
    hash |= 0;
  }
  const hexPart = Math.abs(hash).toString(16).padStart(12, "0").slice(0, 12);
  return `00000000-0000-4000-8000-${hexPart}`;
}
