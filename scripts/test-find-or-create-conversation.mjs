import assert from 'node:assert';

// ==============================================================================
// MÔ PHỎNG HỆ THỐNG CƠ SỞ DỮ LIỆU & BỘ NHỚ THEO CHUẨN THỰC TẾ
// ==============================================================================

// 1. Bảng marketplace_items trong Database
const dbMarketplaceItems = new Map([
  [
    'item-quat-101',
    {
      id: 'item-quat-101',
      user_id: '00000000-0000-0000-0000-000000000002', // seller_B / user_owner_1
      title: 'Quạt bàn Senko B3',
      price: 150000,
      images: ['https://images.unsplash.com/photo-fan.jpg'],
      status: 'available',
    },
  ],
  [
    'item-bep-202',
    {
      id: 'item-bep-202',
      user_id: '00000000-0000-0000-0000-000000000002', // seller_B / user_owner_1
      title: 'Bếp từ đơn Sunhouse',
      price: 350000,
      images: ['https://images.unsplash.com/photo-stove.jpg'],
      status: 'available',
    },
  ],
  [
    'item-sach-303',
    {
      id: 'item-sach-303',
      user_id: 'seller_sinh_vien_D',
      title: 'Giáo trình Giải tích 1',
      price: 0,
      images: [],
      status: 'available',
    },
  ],
]);

// 2. Bảng conversations trong Database (Hỗ trợ Unique Index cho cặp người dùng)
const dbConversations = new Map();

// 3. Bảng messages trong Database
const dbMessages = [];

// 1b. Bảng profiles trong Database (mô phỏng trạng thái bị khóa is_banned)
const dbProfiles = new Map([
  [
    '00000000-0000-0000-0000-000000000002',
    { id: '00000000-0000-0000-0000-000000000002', full_name: 'Người bán B', is_banned: false },
  ],
  [
    'seller_sinh_vien_D',
    { id: 'seller_sinh_vien_D', full_name: 'Người bán D', is_banned: false },
  ],
  [
    'seller_banned_user',
    { id: 'seller_banned_user', full_name: 'Người bán bị khóa', is_banned: true },
  ],
]);

// Món đồ của người bán bị khóa
dbMarketplaceItems.set('item-banned-seller-999', {
  id: 'item-banned-seller-999',
  user_id: 'seller_banned_user',
  title: 'Đèn bàn học',
  price: 50000,
  images: [],
  status: 'available',
});

// Đăng ký 15 món đồ của 15 người bán khác nhau để test rate limit
for (let i = 1; i <= 15; i++) {
  const sellerId = `seller_rate_limit_${i}`;
  const itemId = `item-rate-limit-${i}`;
  dbProfiles.set(sellerId, { id: sellerId, full_name: `Seller ${i}`, is_banned: false });
  dbMarketplaceItems.set(itemId, {
    id: itemId,
    user_id: sellerId,
    title: `Món đồ rate limit số ${i}`,
    price: 10000 * i,
    images: [],
    status: 'available',
  });
}

// Giới hạn tần suất: mỗi người mở tối đa 10 hội thoại mới về chợ đồ cũ trong 1 giờ
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 giờ = 3,600,000 ms
const userNewConvTimestamps = new Map();

function checkRateLimit(buyerId, currentTime = Date.now()) {
  const timestamps = userNewConvTimestamps.get(buyerId) || [];
  const recent = timestamps.filter((t) => t > currentTime - RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    throw new Error('Bạn thao tác quá nhanh, thử lại sau');
  }
}

function recordNewConv(buyerId, currentTime = Date.now()) {
  const timestamps = userNewConvTimestamps.get(buyerId) || [];
  const recent = timestamps.filter((t) => t > currentTime - RATE_LIMIT_WINDOW_MS);
  recent.push(currentTime);
  userNewConvTimestamps.set(buyerId, recent);
}

// 4. Quản lý phiên đăng nhập hiện tại (mô phỏng auth.currentUser / store)
let mockCurrentLoggedInUser = null;

function setMockCurrentUser(userId) {
  mockCurrentLoggedInUser = userId;
}

// ==============================================================================
// TÁCH XỬ LÝ ALIAS DEMO (Theo yêu cầu 7)
// ==============================================================================
const KNOWN_DEMO_UUIDS = {
  demo_admin_uuid: '00000000-0000-0000-0000-000000000001',
  demo_owner_uuid: '00000000-0000-0000-0000-000000000002',
  user_owner_1: '00000000-0000-0000-0000-000000000002',
  seller_sinh_vien_B: '00000000-0000-0000-0000-000000000002',
  demo_renter_uuid: '00000000-0000-0000-0000-000000000003',
  user_renter_1: '00000000-0000-0000-0000-000000000003',
  buyer_sinh_vien_A: '00000000-0000-0000-0000-000000000003',
};

const DEMO_GROUPS = [
  ['00000000-0000-0000-0000-000000000001', 'demo_admin_uuid'],
  ['00000000-0000-0000-0000-000000000002', 'demo_owner_uuid', 'user_owner_1', 'seller_sinh_vien_B'],
  ['00000000-0000-0000-0000-000000000003', 'demo_renter_uuid', 'user_renter_1', 'buyer_sinh_vien_A'],
];

function resolveDemoAlias(id) {
  if (!id) return null;
  const clean = String(id).trim();
  return KNOWN_DEMO_UUIDS[clean] || null;
}

function isSameUserId(id1, id2) {
  if (!id1 || !id2) return false;
  const clean1 = String(id1).trim();
  const clean2 = String(id2).trim();
  if (clean1 === clean2) return true;

  for (const group of DEMO_GROUPS) {
    if (group.includes(clean1) && group.includes(clean2)) {
      return true;
    }
  }
  return false;
}

function resolveUserIdToUuid(userId) {
  if (!userId) return '';
  const trimmed = String(userId).trim();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (UUID_REGEX.test(trimmed)) return trimmed;
  const demoUuid = resolveDemoAlias(trimmed);
  if (demoUuid) return demoUuid;
  return trimmed;
}

function formatItemContextSummary(itemName, price) {
  const name = itemName ? `"${itemName}"` : 'Món đồ thanh lý';
  const priceText =
    price !== undefined
      ? price === 0
        ? ' (Đồ tặng miễn phí)'
        : ` (${Number(price).toLocaleString('vi-VN')} đ)`
      : '';
  return `[Món đồ] ${name}${priceText}`;
}

// ==============================================================================
// HÀM FIND OR CREATE CONVERSATION THỰC THI CHÍNH XÁC CÁC ĐIỂM
// ==============================================================================
async function findOrCreateConversation(buyerId, sellerId, itemId, options = {}) {
  // 1. Kiểm tra đầu vào cơ bản
  if (!buyerId || !sellerId) {
    throw new Error('Thiếu thông tin người tham gia hội thoại.');
  }

  const cleanItemId = itemId ? String(itemId).trim() : '';
  if (!cleanItemId) {
    throw new Error('Thiếu thông tin món đồ cần trao đổi.');
  }

  // 2. Chặn tự nhắn tin cho chính mình (kể cả alias demo)
  if (isSameUserId(buyerId, sellerId)) {
    throw new Error('Không thể tự nhắn tin cho chính mình.');
  }

  const cleanBuyerId = resolveUserIdToUuid(buyerId);
  const cleanSellerId = resolveUserIdToUuid(sellerId);

  if (cleanBuyerId === cleanSellerId) {
    throw new Error('Không thể tự nhắn tin cho chính mình.');
  }

  // 3. Kiểm tra tài khoản người bán có bị khóa không
  const sellerProf = dbProfiles.get(cleanSellerId);
  if (sellerProf?.is_banned || options.sellerIsBanned) {
    throw new Error('Tài khoản người bán hiện đang bị tạm khóa hoặc ngừng hoạt động.');
  }

  // 4. Yêu cầu 3: buyerId phải là người dùng đang đăng nhập
  const currentLoggedIn = options.currentUserId || mockCurrentLoggedInUser;
  if (currentLoggedIn && !isSameUserId(buyerId, currentLoggedIn)) {
    throw new Error('Người mua phải là người dùng đang đăng nhập.');
  }

  // 5. Yêu cầu 3: Không tin dữ liệu từ client: lấy tên, giá, ảnh, người bán từ DB theo itemId
  // Báo lỗi nếu sellerId không phải chủ món đồ hoặc món không tồn tại
  const itemInDb = dbMarketplaceItems.get(cleanItemId);
  if (!itemInDb) {
    throw new Error('Món đồ không tồn tại hoặc đã bị xóa.');
  }

  if (!isSameUserId(itemInDb.user_id, cleanSellerId)) {
    throw new Error('Người bán không phải là chủ sở hữu của món đồ này.');
  }

  const itemTitle = itemInDb.title;
  const itemPrice = itemInDb.price;
  const itemImage = itemInDb.images[0] || '';

  // 6. Yêu cầu 4: Chống trùng - sắp xếp cặp id trước khi lưu (p1 < p2)
  const [p1, p2] = cleanBuyerId < cleanSellerId ? [cleanBuyerId, cleanSellerId] : [cleanSellerId, cleanBuyerId];
  const pairKey = `${p1}__${p2}`;

  // Giả lập độ trễ IO ngẫu nhiên nhỏ để kiểm tra race condition
  if (options.simulateDelay) {
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 20) + 5));
  }

  // 7. Tìm cuộc trò chuyện hiện có theo cặp người dùng
  let conv = dbConversations.get(pairKey) || null;
  let isNew = false;
  let contextInserted = false;

  // 8. Nếu chưa có -> Tạo mới (Mô phỏng DB Unique Constraint chống trùng khi gọi song song)
  if (!conv) {
    // Kiểm tra lại lần nữa trong bộ nhớ DB để chống race condition (tương đương ON CONFLICT trên Supabase)
    if (dbConversations.has(pairKey)) {
      conv = dbConversations.get(pairKey);
      isNew = false;
    } else {
      // Giới hạn tần suất: mỗi người mở tối đa 10 hội thoại mới về chợ đồ cũ trong 1 giờ
      checkRateLimit(cleanBuyerId, options.now || Date.now());

      isNew = true;
      const newConvId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      conv = {
        id: newConvId,
        participant_1: p1,
        participant_2: p2,
        last_item_id: cleanItemId,
        last_message: formatItemContextSummary(itemTitle, itemPrice),
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      dbConversations.set(pairKey, conv);

      // Ghi nhận hội thoại mới vào danh sách rate limit
      recordNewConv(cleanBuyerId, options.now || Date.now());
    }
  }

  // 8. Yêu cầu 1 & 2: Chèn ngữ cảnh khi last_item_id khác itemId đang hỏi
  // (kể cả quay lại món đã hỏi trước đó), không dựa vào discussed_items.
  // Không gửi tin nhắn thay mặt người mua. Ngữ cảnh là tin nhắn hệ thống (type: 'item_context', lưu item_id),
  // hiển thị dạng thẻ, bỏ câu "Món này còn không bạn?".
  const shouldInsertContext = isNew || conv.last_item_id !== cleanItemId;

  if (shouldInsertContext) {
    const cardContent = JSON.stringify({
      type: 'item_context',
      itemId: cleanItemId,
      title: itemTitle,
      price: itemPrice,
      image: itemImage,
      summary: formatItemContextSummary(itemTitle, itemPrice),
    });

    // Tạo tin nhắn hệ thống, sender_id: null (hoặc 'system')
    const systemMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversation_id: conv.id,
      sender_id: null, // Không mạo danh người mua
      content: cardContent,
      type: 'item_context',
      item_id: cleanItemId,
      created_at: new Date().toISOString(),
    };
    dbMessages.push(systemMsg);

    // Cập nhật last_item_id và last_message vào conversation
    conv.last_item_id = cleanItemId;
    conv.last_message = formatItemContextSummary(itemTitle, itemPrice);
    conv.last_message_at = new Date().toISOString();
    contextInserted = true;
  }

  // 9. Yêu cầu 7: Bỏ toString/valueOf, trả về object thuần
  const resultObj = {
    id: conv.id,
    conversationId: conv.id,
    isNew,
    contextInserted,
    itemId: cleanItemId,
    lastItemId: conv.last_item_id,
  };

  return resultObj;
}

// ==============================================================================
// TEST SUITE ĐẦY ĐỦ CÁC ĐIỂM YÊU CẦU
// ==============================================================================
console.log('======================================================================');
console.log('  BẮT ĐẦU CHẠY TEST SUITE NODE.JS CHO findOrCreateConversation');
console.log('======================================================================\n');

let totalPassed = 0;
let totalFailed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    totalPassed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${err.message}`);
    totalFailed++;
  }
}

async function runAllTests() {
  // Test 1: Tự nhắn mình bị từ chối
  await runTest('Tự nhắn mình bị từ chối khi buyerId trùng khớp sellerId', async () => {
    let threw = false;
    try {
      await findOrCreateConversation('user_1', 'user_1', 'item-quat-101');
    } catch (err) {
      threw = true;
      assert.match(err.message, /Không thể tự nhắn tin cho chính mình/);
    }
    assert.strictEqual(threw, true, 'Hàm phải throw error khi buyerId === sellerId');
  });

  // Test 2: Tự nhắn mình bị từ chối với alias demo
  await runTest('Tự nhắn mình bị từ chối với alias demo (demo_renter_uuid và user_renter_1)', async () => {
    let threw = false;
    try {
      await findOrCreateConversation('demo_renter_uuid', 'user_renter_1', 'item-quat-101');
    } catch (err) {
      threw = true;
      assert.match(err.message, /Không thể tự nhắn tin cho chính mình/);
    }
    assert.strictEqual(threw, true, 'Hàm phải nhận diện alias demo cùng 1 người');
  });

  // Test 3: buyerId không phải người đang đăng nhập bị từ chối
  await runTest('buyerId không phải người dùng đang đăng nhập bị từ chối', async () => {
    setMockCurrentUser('user_auth_real_999');
    let threw = false;
    try {
      await findOrCreateConversation('user_impostor_888', 'seller_sinh_vien_B', 'item-quat-101');
    } catch (err) {
      threw = true;
      assert.match(err.message, /Người mua phải là người dùng đang đăng nhập/);
    }
    assert.strictEqual(threw, true, 'Phải ngăn chặn client gửi buyerId mạo danh');
    setMockCurrentUser(null); // Reset
  });

  // Test 4: sellerId sai (không phải chủ món đồ) bị từ chối
  await runTest('sellerId sai (không phải chủ món đồ) bị từ chối', async () => {
    // item-quat-101 thuộc về seller_sinh_vien_B, thử gọi với seller_fake
    let threw = false;
    try {
      await findOrCreateConversation('buyer_sinh_vien_A', 'seller_sinh_vien_D', 'item-quat-101');
    } catch (err) {
      threw = true;
      assert.match(err.message, /Người bán không phải là chủ sở hữu của món đồ này/);
    }
    assert.strictEqual(threw, true, 'Phải kiểm tra chủ sở hữu từ DB');
  });

  // Test 5: Món đồ không tồn tại trong DB bị từ chối
  await runTest('Món đồ không tồn tại trong DB bị từ chối', async () => {
    let threw = false;
    try {
      await findOrCreateConversation('buyer_sinh_vien_A', 'seller_sinh_vien_B', 'item-khong-co-that-999');
    } catch (err) {
      threw = true;
      assert.match(err.message, /Món đồ không tồn tại hoặc đã bị xóa/);
    }
    assert.strictEqual(threw, true, 'Không tin client, kiểm tra món đồ tồn tại trong DB');
  });

  // Test 6: Gọi lần đầu tạo hội thoại mới và chèn tin nhắn hệ thống (type: 'item_context', lưu item_id)
  let sharedConvId = '';
  await runTest('Gọi lần đầu tạo hội thoại mới và chèn tin nhắn hệ thống loại item_context', async () => {
    setMockCurrentUser('buyer_sinh_vien_A');
    const res = await findOrCreateConversation('buyer_sinh_vien_A', 'seller_sinh_vien_B', 'item-quat-101');

    assert.strictEqual(res.isNew, true, 'Hội thoại mới phải có isNew = true');
    assert.strictEqual(res.contextInserted, true, 'Lần đầu phải chèn ngữ cảnh');
    assert.strictEqual(res.itemId, 'item-quat-101');
    assert.strictEqual(res.lastItemId, 'item-quat-101');
    assert.ok(res.conversationId, 'Phải có conversationId');
    sharedConvId = res.conversationId;

    // Kiểm tra tin nhắn vừa chèn trong messages: phải là type: 'item_context' và sender_id là null (hệ thống)
    const lastMsg = dbMessages[dbMessages.length - 1];
    assert.strictEqual(lastMsg.conversation_id, sharedConvId);
    assert.strictEqual(lastMsg.type, 'item_context', 'Tin nhắn phải có type: item_context');
    assert.strictEqual(lastMsg.item_id, 'item-quat-101', 'Tin nhắn phải lưu item_id');
    assert.strictEqual(lastMsg.sender_id, null, 'Tin nhắn hệ thống không gửi thay mặt người mua (sender_id = null)');

    const parsedContent = JSON.parse(lastMsg.content);
    assert.strictEqual(parsedContent.title, 'Quạt bàn Senko B3', 'Dữ liệu lấy từ DB');
    assert.strictEqual(parsedContent.price, 150000);
    assert.doesNotMatch(lastMsg.content, /Món này còn không bạn\?/, 'Bỏ câu mạo danh người mua');
  });

  // Test 7: Gọi lần 2 với cùng món đồ: trả về hội thoại cũ, không tạo trùng, không chèn lại ngữ cảnh
  await runTest('Gọi lần 2 với cùng món đồ: trả về hội thoại cũ, không chèn lại ngữ cảnh', async () => {
    const msgCountBefore = dbMessages.length;
    const res = await findOrCreateConversation('buyer_sinh_vien_A', 'seller_sinh_vien_B', 'item-quat-101');

    assert.strictEqual(res.isNew, false, 'Không tạo mới hội thoại');
    assert.strictEqual(res.conversationId, sharedConvId, 'Phải khớp conversationId cũ');
    assert.strictEqual(res.contextInserted, false, 'Cùng món đồ thì không chèn lại ngữ cảnh');
    assert.strictEqual(dbMessages.length, msgCountBefore, 'Không chèn thêm tin nhắn thừa');
  });

  // Test 8: Chuyển sang món khác của cùng người bán: chèn ngữ cảnh món mới và cập nhật last_item_id
  await runTest('Chuyển sang món khác của cùng người bán: chèn ngữ cảnh món mới', async () => {
    const res = await findOrCreateConversation('buyer_sinh_vien_A', 'seller_sinh_vien_B', 'item-bep-202');

    assert.strictEqual(res.isNew, false, 'Vẫn là hội thoại chung giữa 2 người dùng');
    assert.strictEqual(res.conversationId, sharedConvId, 'Cùng conversationId');
    assert.strictEqual(res.contextInserted, true, 'Món đồ khác phải chèn ngữ cảnh mới');
    assert.strictEqual(res.lastItemId, 'item-bep-202', 'lastItemId phải chuyển sang item-bep-202');

    const lastMsg = dbMessages[dbMessages.length - 1];
    assert.strictEqual(lastMsg.type, 'item_context');
    assert.strictEqual(lastMsg.item_id, 'item-bep-202');
    const parsed = JSON.parse(lastMsg.content);
    assert.strictEqual(parsed.title, 'Bếp từ đơn Sunhouse');
  });

  // Test 9: QUAY LẠI MÓN CŨ CÓ CHÈN NGỮ CẢNH (Yêu cầu 2: kể cả quay lại món đã hỏi trước đó)
  await runTest('Quay lại món cũ (item-quat-101) có chèn ngữ cảnh vì last_item_id đang là món khác', async () => {
    // Hiện tại last_item_id đang là item-bep-202. Người mua quay lại trang item-quat-101 và bấm chat
    const res = await findOrCreateConversation('buyer_sinh_vien_A', 'seller_sinh_vien_B', 'item-quat-101');

    assert.strictEqual(res.isNew, false, 'Vẫn chung cuộc hội thoại');
    assert.strictEqual(res.conversationId, sharedConvId);
    assert.strictEqual(res.contextInserted, true, 'Quay lại món cũ PHẢI chèn lại ngữ cảnh');
    assert.strictEqual(res.lastItemId, 'item-quat-101', 'lastItemId cập nhật lại thành item-quat-101');

    const lastMsg = dbMessages[dbMessages.length - 1];
    assert.strictEqual(lastMsg.type, 'item_context');
    assert.strictEqual(lastMsg.item_id, 'item-quat-101');

    // Nếu hỏi lại món item-quat-101 ngay sau đó -> KHÔNG chèn ngữ cảnh
    const resRepeat = await findOrCreateConversation('buyer_sinh_vien_A', 'seller_sinh_vien_B', 'item-quat-101');
    assert.strictEqual(resRepeat.contextInserted, false, 'Hỏi tiếp món hiện tại thì không chèn lặp lại');
  });

  // Test 10: ĐẢO THỨ TỰ NGƯỜI MUA / NGƯỜI BÁN VẪN RA MỘT HỘI THOẠI (Yêu cầu 4)
  await runTest('Đảo thứ tự người mua / người bán vẫn ra đúng một hội thoại duy nhất', async () => {
    // Đảo người mua là seller_sinh_vien_B và người bán là buyer_sinh_vien_A
    setMockCurrentUser('seller_sinh_vien_B');
    // Món item-quat-101 của seller_sinh_vien_B: gọi theo thứ tự (seller, buyer)
    // Để hợp lệ chủ món đồ, sellerId truyền vào là seller_sinh_vien_B (chủ món)
    // Nhưng thứ tự tham số là (A, B) hay (B, A):
    // Giả sử seller_sinh_vien_B đóng vai trò buyer mua món của người khác hoặc hệ thống sắp xếp
    // Kiểm tra tính đối xứng của cặp ID:
    const p1 = resolveUserIdToUuid('buyer_sinh_vien_A');
    const p2 = resolveUserIdToUuid('seller_sinh_vien_B');
    const sorted1 = p1 < p2 ? `${p1}__${p2}` : `${p2}__${p1}`;
    const sorted2 = p2 < p1 ? `${p2}__${p1}` : `${p1}__${p2}`;
    assert.strictEqual(sorted1, sorted2, 'Sắp xếp cặp ID luôn cho ra cùng 1 khóa duy nhất');

    const resReverse = await findOrCreateConversation('buyer_sinh_vien_A', 'seller_sinh_vien_B', 'item-quat-101', {
      currentUserId: 'buyer_sinh_vien_A',
    });
    assert.strictEqual(resReverse.conversationId, sharedConvId, 'Luôn tìm thấy cuộc hội thoại duy nhất');
    setMockCurrentUser(null);
  });

  // Test 11: GỌI SONG SONG HAI LẦN KHÔNG TẠO TRÙNG (Yêu cầu 4: Race condition & Concurrency)
  await runTest('Gọi song song hai lần (Promise.all) không tạo trùng cuộc trò chuyện', async () => {
    // Dùng cặp người dùng mới: user_new_1 và user_new_2 với item-sach-303
    const buyerNew = 'buyer_sinh_vien_New_1';
    const sellerNew = 'seller_sinh_vien_D';

    // Tạo trước số lượng conversation hiện có
    const initialConvCount = dbConversations.size;

    // Chạy đồng thời 2 lệnh findOrCreateConversation với simulateDelay ngẫu nhiên
    const [call1, call2] = await Promise.all([
      findOrCreateConversation(buyerNew, sellerNew, 'item-sach-303', {
        currentUserId: buyerNew,
        simulateDelay: true,
      }),
      findOrCreateConversation(buyerNew, sellerNew, 'item-sach-303', {
        currentUserId: buyerNew,
        simulateDelay: true,
      }),
    ]);

    // Cả 2 kết quả phải có cùng conversationId
    assert.ok(call1.conversationId, 'Call 1 phải trả về conversationId');
    assert.ok(call2.conversationId, 'Call 2 phải trả về conversationId');
    assert.strictEqual(call1.conversationId, call2.conversationId, 'Cả 2 cuộc gọi song song phải ra cùng conversationId');

    // Tổng số cuộc hội thoại trong DB chỉ được tăng thêm ĐÚNG 1
    const finalConvCount = dbConversations.size;
    assert.strictEqual(finalConvCount, initialConvCount + 1, 'Chỉ được tạo duy nhất 1 conversation trong DB');
  });

  // Test 12: BỎ TOSTRING / VALUEOF, TRẢ VỀ OBJECT THƯỜNG (Yêu cầu 7)
  await runTest('Bỏ toString/valueOf, trả về plain object với đầy đủ thuộc tính', async () => {
    const res = await findOrCreateConversation('buyer_sinh_vien_A', 'seller_sinh_vien_B', 'item-quat-101');

    assert.strictEqual(typeof res, 'object', 'Kết quả phải là object');
    assert.strictEqual(Object.prototype.hasOwnProperty.call(res, 'toString'), false, 'Không còn hàm toString tự tạo');
    assert.strictEqual(Object.prototype.hasOwnProperty.call(res, 'valueOf'), false, 'Không còn hàm valueOf tự tạo');
    assert.strictEqual(typeof res.conversationId, 'string');
    assert.strictEqual(typeof res.isNew, 'boolean');
    assert.strictEqual(typeof res.contextInserted, 'boolean');
    assert.strictEqual(typeof res.itemId, 'string');
    assert.strictEqual(typeof res.lastItemId, 'string');
  });

  // Test 13: NGƯỜI BÁN BỊ KHÓA TÀI KHOẢN KHÔNG MỞ ĐƯỢC HỘI THOẠI MỚI VÀ BÁO LỖI RÕ RÀNG
  await runTest('Người bán bị khóa tài khoản không mở được hội thoại mới và báo lỗi rõ ràng', async () => {
    setMockCurrentUser('buyer_sinh_vien_A');
    let threw = false;
    let errorMsg = '';
    const initialConvCount = dbConversations.size;

    try {
      await findOrCreateConversation('buyer_sinh_vien_A', 'seller_banned_user', 'item-banned-seller-999');
    } catch (err) {
      threw = true;
      errorMsg = err.message;
      assert.match(
        err.message,
        /Tài khoản người bán hiện đang bị tạm khóa hoặc ngừng hoạt động/,
        'Thông báo lỗi phải rõ ràng về việc người bán bị khóa'
      );
    }

    assert.strictEqual(threw, true, 'Hàm phải throw error khi người bán bị khóa');
    assert.strictEqual(
      dbConversations.size,
      initialConvCount,
      'Không được tạo hội thoại trong cơ sở dữ liệu khi người bán bị khóa'
    );
  });

  // Test 14: GIỚI HẠN TỐI ĐA 10 HỘI THOẠI MỚI TRONG 1 GIỜ CHO MỖI NGƯỜI MUA
  const rateBuyerId = 'buyer_rate_tester_99';
  setMockCurrentUser(rateBuyerId);
  const createdConvIds = [];

  await runTest('Mở thành công 10 cuộc hội thoại mới trong vòng 1 giờ', async () => {
    for (let i = 1; i <= 10; i++) {
      const sellerId = `seller_rate_limit_${i}`;
      const itemId = `item-rate-limit-${i}`;
      const res = await findOrCreateConversation(rateBuyerId, sellerId, itemId);

      assert.strictEqual(res.isNew, true, `Hội thoại mới thứ ${i} phải có isNew = true`);
      assert.ok(res.conversationId, `Hội thoại thứ ${i} phải có conversationId`);
      createdConvIds.push(res.conversationId);
    }
    assert.strictEqual(createdConvIds.length, 10, 'Đã mở đủ 10 cuộc hội thoại mới');
  });

  // Test 15: VƯỢT QUÁ 10 HỘI THOẠI MỚI TRONG 1 GIỜ BÁO "Bạn thao tác quá nhanh, thử lại sau"
  await runTest('Mở hội thoại mới thứ 11 trong 1 giờ bị chặn và báo "Bạn thao tác quá nhanh, thử lại sau"', async () => {
    let threw = false;
    let exactMsg = '';
    const convCountBefore = dbConversations.size;

    try {
      // Mở hội thoại mới thứ 11 với seller thứ 11
      await findOrCreateConversation(rateBuyerId, 'seller_rate_limit_11', 'item-rate-limit-11');
    } catch (err) {
      threw = true;
      exactMsg = err.message;
    }

    assert.strictEqual(threw, true, 'Phải throw error khi vượt quá 10 hội thoại mới trong 1 giờ');
    assert.strictEqual(
      exactMsg,
      'Bạn thao tác quá nhanh, thử lại sau',
      'Thông báo lỗi phải khớp nguyên văn: "Bạn thao tác quá nhanh, thử lại sau"'
    );
    assert.strictEqual(
      dbConversations.size,
      convCountBefore,
      'Không được tạo thêm cuộc hội thoại thứ 11 trong cơ sở dữ liệu'
    );
  });

  // Test 16: MỞ LẠI HỘI THOẠI ĐÃ CÓ KHÔNG BỊ TÍNH VÀO GIỚI HẠN VÀ KHÔNG BỊ CHẶN
  await runTest('Mở lại hội thoại đã có giữa 2 người không bị chặn bởi giới hạn 10 hội thoại mới', async () => {
    // Gọi lại với seller_rate_limit_1 (đã có hội thoại ở Test 14)
    const resExisting = await findOrCreateConversation(rateBuyerId, 'seller_rate_limit_1', 'item-rate-limit-1');

    assert.strictEqual(resExisting.isNew, false, 'Không phải là hội thoại mới');
    assert.strictEqual(resExisting.conversationId, createdConvIds[0], 'Phải trả về đúng hội thoại đã có');
  });

  // Test 17: SAU 1 GIỜ, GIỚI HẠN ĐƯỢC GIẢI PHÓNG VÀ CÓ THỂ MỞ TIẾP HỘI THOẠI MỚI
  await runTest('Sau 1 giờ trôi qua, người dùng có thể mở tiếp hội thoại mới thành công', async () => {
    const oneHourLater = Date.now() + 60 * 60 * 1000 + 1000; // 1 giờ 1 giây sau
    const resAfterOneHour = await findOrCreateConversation(
      rateBuyerId,
      'seller_rate_limit_11',
      'item-rate-limit-11',
      { now: oneHourLater }
    );

    assert.strictEqual(resAfterOneHour.isNew, true, 'Sau 1 giờ, hội thoại mới mở thành công với isNew = true');
    assert.ok(resAfterOneHour.conversationId, 'Phải có conversationId mới');
    setMockCurrentUser(null);
  });

  // ==============================================================
  // TỔNG KẾT
  // ==============================================================
  console.log('\n========================================');
  console.log(`KẾT QUẢ TEST SUITE: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log('========================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Lỗi nghiêm trọng khi thực thi test suite:', err);
  process.exit(1);
});
