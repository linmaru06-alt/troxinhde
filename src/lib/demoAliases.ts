export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
