import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nanhmbnpihlaojbwfebb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aIbyNWURIM1qwQG6g_bTUg_lukLkC4f';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ SUPABASE CHAT & BOOKING ---');

  // 1. Lấy 2 profiles thật từ Supabase để làm test participants
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, full_name')
    .limit(2);

  if (profErr || !profiles || profiles.length < 2) {
    console.error('❌ Không thể lấy 2 profiles mẫu:', profErr?.message);
    process.exit(1);
  }

  const p1 = profiles[0].id;
  const p2 = profiles[1].id;
  console.log(`✅ Profiles mẫu: P1=${p1} (${profiles[0].full_name}), P2=${p2} (${profiles[1].full_name})`);

  // 2. Lấy 1 room thật
  const { data: rooms, error: roomErr } = await supabase
    .from('rooms')
    .select('id, name, owner_id')
    .limit(1);

  if (roomErr || !rooms || rooms.length === 0) {
    console.error('❌ Không thể lấy phòng mẫu:', roomErr?.message);
    process.exit(1);
  }

  const testRoom = rooms[0];
  console.log(`✅ Phòng mẫu: ${testRoom.name} (ID: ${testRoom.id})`);

  let testConvId = null;
  let testMsgId = null;
  let testReqId = null;
  let testNotifId = null;

  try {
    // 3. Test tạo hoặc lấy conversation
    console.log('\n[TEST 1] Tạo/Kiểm tra bảng conversations...');
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        participant_1: p1,
        participant_2: p2,
        room_id: testRoom.id,
        last_message: 'Tin nhắn kiểm thử tự động',
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (convErr) {
      // Nếu đã có do unique constraint -> query lại
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('room_id', testRoom.id)
        .limit(1)
        .single();

      if (!existingConv) throw convErr;
      testConvId = existingConv.id;
      console.log(`✅ Conversation đã tồn tại: ${testConvId}`);
    } else {
      testConvId = conv.id;
      console.log(`✅ Tạo mới conversation thành công: ${testConvId}`);
    }

    // 4. Test gửi tin nhắn vào bảng messages (schema chuẩn: conversation_id, sender_id, content)
    console.log('\n[TEST 2] Gửi tin nhắn vào bảng messages...');
    const testContent = `Xin chào! Kiểm thử tự động lúc ${new Date().toISOString()}`;
    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: testConvId,
        sender_id: p1,
        content: testContent,
        is_read: false,
      })
      .select('id, conversation_id, content, created_at')
      .single();

    if (msgErr) throw msgErr;
    testMsgId = msg.id;
    console.log(`✅ Gửi tin nhắn thành công: ID=${msg.id}, Content="${msg.content}"`);

    // 5. Test tạo viewing_request (schema chuẩn: room_id, renter_id, owner_id, requested_date, requested_time...)
    console.log('\n[TEST 3] Tạo yêu cầu xem phòng vào bảng viewing_requests...');
    const { data: viewingReq, error: reqErr } = await supabase
      .from('viewing_requests')
      .insert({
        room_id: testRoom.id,
        renter_id: p1,
        owner_id: testRoom.owner_id || p2,
        requested_date: '2026-03-10',
        requested_time: '09:30 - 10:30 (Sáng)',
        contact_phone: '0988112233',
        message: 'Khách hẹn xem phòng kiểm thử',
        status: 'pending',
      })
      .select('id, requested_date, requested_time, status')
      .single();

    if (reqErr) throw reqErr;
    testReqId = viewingReq.id;
    console.log(`✅ Tạo viewing_request thành công: ID=${viewingReq.id}, Status=${viewingReq.status}`);

    // 6. Test tạo notification thật cho chủ trọ
    console.log('\n[TEST 4] Tạo thông báo vào bảng notifications...');
    const { data: notif, error: notifErr } = await supabase
      .from('notifications')
      .insert({
        user_id: testRoom.owner_id || p2,
        type: 'booking_request',
        title: `Lịch hẹn xem phòng mới: ${testRoom.name} 📅`,
        body: 'Khách hẹn xem phòng kiểm thử tự động',
        cta_url: '/chu-tro/tong-quan',
        cta_label: 'Xem lịch hẹn',
        is_read: false,
      })
      .select('id, type, title')
      .single();

    if (notifErr) throw notifErr;
    testNotifId = notif.id;
    console.log(`✅ Tạo notification thành công: ID=${notif.id}, Type=${notif.type}`);

    console.log('\n--- TOÀN BỘ 4 BƯỚC TEST SUPABASE HOÀN TẤT THÀNH CÔNG 100% ---');
  } catch (err) {
    console.error('❌ Lỗi trong quá trình kiểm thử:', err);
    process.exit(1);
  } finally {
    // 7. Dọn dẹp bản ghi kiểm thử
    console.log('\n[CLEANUP] Dọn dẹp dữ liệu kiểm thử...');
    if (testMsgId) {
      await supabase.from('messages').delete().eq('id', testMsgId);
      console.log('🧹 Đã xóa test message');
    }
    if (testReqId) {
      await supabase.from('viewing_requests').delete().eq('id', testReqId);
      console.log('🧹 Đã xóa test viewing_request');
    }
    if (testNotifId) {
      await supabase.from('notifications').delete().eq('id', testNotifId);
      console.log('🧹 Đã xóa test notification');
    }
    console.log('✨ Dọn dẹp hoàn tất!');
  }
}

runTests();
