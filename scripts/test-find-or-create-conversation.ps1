# Kiểm thử tự động hàm findOrCreateConversation bằng PowerShell
$ErrorActionPreference = "Stop"

$inMemoryStore = @{}

function Safe-GetStorage([string]$key) {
  if ($inMemoryStore.ContainsKey($key)) {
    return $inMemoryStore[$key]
  }
  return $null
}

function Safe-SetStorage([string]$key, [string]$value) {
  $inMemoryStore[$key] = $value
}

$LOCAL_CONVS_KEY = 'troxinh_local_conversations'
$LOCAL_MSGS_KEY = 'troxinh_local_messages'
$CONV_META_PREFIX = 'troxinh_conv_meta_'

$KNOWN_DEMO_UUIDS = @{
  'demo_admin_uuid' = '00000000-0000-0000-0000-000000000001'
  'demo_owner_uuid' = '00000000-0000-0000-0000-000000000002'
  'user_owner_1'    = '00000000-0000-0000-0000-000000000002'
  'demo_renter_uuid' = '00000000-0000-0000-0000-000000000003'
  'user_renter_1'   = '00000000-0000-0000-0000-000000000003'
}

function Is-SameUserId([string]$id1, [string]$id2) {
  if ([string]::IsNullOrWhiteSpace($id1) -or [string]::IsNullOrWhiteSpace($id2)) { return $false }
  $c1 = $id1.Trim()
  $c2 = $id2.Trim()
  if ($c1 -eq $c2) { return $true }

  $DEMO_GROUPS = @(
    @('00000000-0000-0000-0000-000000000001', 'demo_admin_uuid'),
    @('00000000-0000-0000-0000-000000000002', 'demo_owner_uuid', 'user_owner_1'),
    @('00000000-0000-0000-0000-000000000003', 'demo_renter_uuid', 'user_renter_1')
  )

  foreach ($grp in $DEMO_GROUPS) {
    if (($grp -contains $c1) -and ($grp -contains $c2)) {
      return $true
    }
  }
  return $false
}

function Resolve-UserIdToUuid([string]$userId) {
  if ([string]::IsNullOrWhiteSpace($userId)) { return "" }
  $trimmed = $userId.Trim()
  if ($trimmed -match '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') {
    return $trimmed
  }
  if ($KNOWN_DEMO_UUIDS.ContainsKey($trimmed)) {
    return $KNOWN_DEMO_UUIDS[$trimmed]
  }
  return "mock-$trimmed"
}

function Get-ConversationMeta([string]$convId) {
  $raw = Safe-GetStorage "$CONV_META_PREFIX$convId"
  if ($raw) {
    return ($raw | ConvertFrom-Json)
  }
  return $null
}

function Save-ConversationMeta([string]$convId, [hashtable]$meta) {
  $existing = Get-ConversationMeta $convId
  $obj = @{}
  if ($existing) {
    foreach ($prop in $existing.PSObject.Properties) {
      $obj[$prop.Name] = $prop.Value
    }
  }
  foreach ($k in $meta.Keys) {
    $obj[$k] = $meta[$k]
  }
  $json = ($obj | ConvertTo-Json -Compress)
  Safe-SetStorage "$CONV_META_PREFIX$convId" $json
}

function Get-LocalConversations() {
  $raw = Safe-GetStorage $LOCAL_CONVS_KEY
  if ($raw) {
    $parsed = ($raw | ConvertFrom-Json)
    if ($parsed -is [array]) { return @($parsed) }
    return @($parsed)
  }
  return @()
}

function Save-LocalConversation([hashtable]$conv) {
  $list = @(Get-LocalConversations | Where-Object { $_.id -ne $conv['id'] })
  $pso = [PSCustomObject]$conv
  $newList = @($pso) + $list
  $json = (ConvertTo-Json -InputObject @($newList) -Compress)
  Safe-SetStorage $LOCAL_CONVS_KEY $json
}

$localMessagesStore = @{}

function Get-LocalMessages([string]$conversationId) {
  if (-not $localMessagesStore.ContainsKey($conversationId)) {
    $localMessagesStore[$conversationId] = [System.Collections.ArrayList]::new()
  }
  return @($localMessagesStore[$conversationId])
}

function Save-LocalMessage([hashtable]$msg) {
  $cid = $msg['conversation_id']
  if (-not $localMessagesStore.ContainsKey($cid)) {
    $localMessagesStore[$cid] = [System.Collections.ArrayList]::new()
  }
  [void]$localMessagesStore[$cid].Add([PSCustomObject]$msg)
}

function Format-ItemContextMessage([string]$itemName, [double]$price, [string]$itemId) {
  $name = if ($itemName) { "`"$itemName`"" } else { "món đồ thanh lý của bạn" }
  $priceText = ""
  if ($PSBoundParameters.ContainsKey('price')) {
    if ($price -eq 0) {
      $priceText = " (Đồ tặng miễn phí)"
    } else {
      $formatted = [string]::Format([System.Globalization.CultureInfo]::GetCultureInfo("vi-VN"), "{0:N0}", $price)
      $priceText = " ($formatted đ)"
    }
  }
  return "👋 Xin chào! Tôi quan tâm đến $name$priceText. Món này còn không bạn?"
}

function Send-TestMessage([string]$conversationId, [string]$senderId, [string]$content, [string]$senderName = "Người mua") {
  $msg = @{
    id              = "msg_$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
    conversation_id = $conversationId
    sender_id       = $senderId
    content         = $content
    sender_name     = $senderName
    created_at      = (Get-Date).ToString("o")
  }
  Save-LocalMessage $msg
  return $msg
}

function Find-Or-Create-Conversation(
  [string]$buyerId,
  [string]$sellerId,
  [string]$itemId,
  [hashtable]$options = @{}
) {
  # 1. Kiểm tra đầu vào
  if ([string]::IsNullOrWhiteSpace($buyerId) -or [string]::IsNullOrWhiteSpace($sellerId)) {
    throw "Thiếu thông tin người tham gia hội thoại."
  }
  $cleanItemId = if ($itemId) { $itemId.Trim() } else { "" }
  if ([string]::IsNullOrWhiteSpace($cleanItemId)) {
    throw "Thiếu thông tin món đồ cần trao đổi."
  }

  # 2. Chặn tự nhắn tin cho chính mình
  if (Is-SameUserId $buyerId $sellerId) {
    throw "Không thể tự nhắn tin cho chính mình."
  }
  $cleanBuyerId = Resolve-UserIdToUuid $buyerId
  $cleanSellerId = Resolve-UserIdToUuid $sellerId
  if ($cleanBuyerId -eq $cleanSellerId) {
    throw "Không thể tự nhắn tin cho chính mình."
  }

  # 3. Tìm cuộc trò chuyện hiện có
  $existingId = $null
  $isNew = $false
  $contextInserted = $false

  $localList = Get-LocalConversations
  foreach ($c in $localList) {
    $p1 = $c.participant_1
    $p2 = $c.participant_2
    if (((Is-SameUserId $p1 $cleanBuyerId) -and (Is-SameUserId $p2 $cleanSellerId)) -or
        ((Is-SameUserId $p1 $cleanSellerId) -and (Is-SameUserId $p2 $cleanBuyerId))) {
      $existingId = $c.id
      break
    }
  }

  # 4. Nếu chưa có -> Tạo mới
  if (-not $existingId) {
    $isNew = $true
    $existingId = "conv_$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())_$([Guid]::NewGuid().ToString().Substring(0,8))"

    Save-ConversationMeta $existingId @{
      other_name      = if ($options['sellerName']) { $options['sellerName'] } else { "Người bán" }
      other_avatar    = if ($options['sellerAvatar']) { $options['sellerAvatar'] } else { "/images/user-avatar.jpg" }
      last_item_id    = $cleanItemId
      last_item_name  = $options['itemName']
      last_item_price = $options['itemPrice']
      discussed_items = @($cleanItemId)
    }

    Save-LocalConversation @{
      id              = $existingId
      participant_1   = $cleanBuyerId
      participant_2   = $cleanSellerId
      item_id         = $cleanItemId
      last_message    = "Bắt đầu cuộc trò chuyện..."
      last_message_at = (Get-Date).ToString("o")
      created_at      = (Get-Date).ToString("o")
    }

    $priceVal = if ($options.ContainsKey('itemPrice')) { [double]$options['itemPrice'] } else { 0 }
    $contextMsg = if ($options['initialMessage']) { $options['initialMessage'] } else {
      Format-ItemContextMessage $options['itemName'] $priceVal $cleanItemId
    }
    [void](Send-TestMessage $existingId $cleanBuyerId $contextMsg $options['buyerName'])
    $contextInserted = $true
  } else {
    # 5. Nếu đã có -> Kiểm tra xem đã có ngữ cảnh món này chưa
    $isNew = $false
    $meta = Get-ConversationMeta $existingId
    $discussed = @()
    if ($meta -and $meta.discussed_items) {
      $discussed = @($meta.discussed_items)
    } elseif ($meta -and $meta.last_item_id) {
      $discussed = @($meta.last_item_id)
    }

    $isSameItem = ($meta -and ($meta.last_item_id -eq $cleanItemId)) -or ($discussed -contains $cleanItemId)

    if ($isSameItem) {
      # Cùng món: Không tạo trùng, không chèn lại ngữ cảnh thừa
      $contextInserted = $false
    } else {
      # Món khác: Chèn ngữ cảnh món mới vào hội thoại chung
      $priceVal = if ($options.ContainsKey('itemPrice')) { [double]$options['itemPrice'] } else { 0 }
      $contextMsg = if ($options['initialMessage']) { $options['initialMessage'] } else {
        Format-ItemContextMessage $options['itemName'] $priceVal $cleanItemId
      }
      [void](Send-TestMessage $existingId $cleanBuyerId $contextMsg $options['buyerName'])
      $contextInserted = $true

      $newDiscussed = @($discussed) + @($cleanItemId) | Select-Object -Unique
      Save-ConversationMeta $existingId @{
        last_item_id    = $cleanItemId
        last_item_name  = $options['itemName']
        last_item_price = $options['itemPrice']
        discussed_items = $newDiscussed
      }
    }
  }

  return [PSCustomObject]@{
    id              = $existingId
    conversationId  = $existingId
    isNew           = $isNew
    contextInserted = $contextInserted
    itemId          = $cleanItemId
  }
}

# ==============================================================
# BẮT ĐẦU CHẠY KIỂM THỬ
# ==============================================================
Write-Host "=== CHẠY TEST SUITE POWERSHELL CHO findOrCreateConversation ===" -ForegroundColor Cyan

$totalPassed = 0
$totalFailed = 0

function Assert-Test([string]$name, [scriptblock]$sb) {
  try {
    & $sb
    Write-Host "  PASS: $name" -ForegroundColor Green
    $script:totalPassed++
  } catch {
    Write-Host "  FAIL: $name - $($_.Exception.Message)" -ForegroundColor Red
    $script:totalFailed++
  }
}

# Test 1: Tự nhắn mình bị từ chối
Assert-Test "Tự nhắn mình bị từ chối khi buyerId trùng khớp sellerId" {
  $caught = $false
  try {
    [void](Find-Or-Create-Conversation "user_1" "user_1" "item-101")
  } catch {
    if ($_.Exception.Message -match "Không thể tự nhắn tin cho chính mình") {
      $caught = $true
    }
  }
  if (-not $caught) { throw "Phải ném lỗi 'Không thể tự nhắn tin cho chính mình'" }
}

# Test 1b: Tự nhắn mình với alias demo
Assert-Test "Tự nhắn mình bị từ chối với alias demo (demo_renter_uuid và user_renter_1)" {
  $caught = $false
  try {
    [void](Find-Or-Create-Conversation "demo_renter_uuid" "user_renter_1" "item-101")
  } catch {
    if ($_.Exception.Message -match "Không thể tự nhắn tin cho chính mình") {
      $caught = $true
    }
  }
  if (-not $caught) { throw "Phải nhận diện alias trỏ về cùng tài khoản" }
}

# Test 2: Gọi lần đầu tạo cuộc hội thoại mới và chèn ngữ cảnh
$convRes1 = $null
Assert-Test "Gọi lần đầu: tạo hội thoại mới (isNew=true, contextInserted=true)" {
  $script:convRes1 = Find-Or-Create-Conversation "buyer_A" "seller_B" "item-quat-senko" @{
    itemName  = "Quạt đứng Senko lỡ 5 cánh"
    itemPrice = 150000
  }
  if (-not $convRes1.conversationId) { throw "Thiếu conversationId" }
  if ($convRes1.isNew -ne $true) { throw "isNew phải là true" }
  if ($convRes1.contextInserted -ne $true) { throw "contextInserted phải là true" }
  if ($convRes1.itemId -ne "item-quat-senko") { throw "itemId không khớp" }

  $msgs = @(Get-LocalMessages $convRes1.conversationId)
  if ($msgs.Count -ne 1) { throw "Phải có đúng 1 tin nhắn ngữ cảnh mở đầu, thực tế có $($msgs.Count)" }
  if (-not $msgs[0].content.Contains("Quạt đứng Senko lỡ 5 cánh")) { throw "Tin nhắn phải có tên món đồ" }
}

# Test 3: Gọi lần 2 với CÙNG MÓN ĐỒ -> không tạo trùng, không chèn lại ngữ cảnh
Assert-Test "Gọi lần 2 với cùng món đồ: trả về hội thoại cũ, không tạo trùng (isNew=false, contextInserted=false)" {
  $convRes2 = Find-Or-Create-Conversation "buyer_A" "seller_B" "item-quat-senko" @{
    itemName  = "Quạt đứng Senko lỡ 5 cánh"
    itemPrice = 150000
  }
  if ($convRes2.conversationId -ne $convRes1.conversationId) { throw "ID hội thoại phải trùng nhau" }
  if ($convRes2.isNew -ne $false) { throw "isNew phải là false" }
  if ($convRes2.contextInserted -ne $false) { throw "contextInserted phải là false" }

  $msgs = @(Get-LocalMessages $convRes2.conversationId)
  if ($msgs.Count -ne 1) { throw "Không được gửi tin nhắn trùng lặp vào hội thoại, thực tế có $($msgs.Count)" }
}

# Test 4: Món khác của cùng người bán -> Giữ hội thoại chung và chèn ngữ cảnh món mới
Assert-Test "Món khác của cùng người bán: giữ hội thoại chung và chèn ngữ cảnh món mới (contextInserted=true)" {
  $convRes3 = Find-Or-Create-Conversation "buyer_A" "seller_B" "item-bep-tu" @{
    itemName  = "Bếp từ đơn Kangaroo"
    itemPrice = 200000
  }
  if ($convRes3.conversationId -ne $convRes1.conversationId) { throw "Phải giữ nguyên hội thoại chung giữa 2 người" }
  if ($convRes3.isNew -ne $false) { throw "Không tạo thêm phòng chat rác giữa 2 người (isNew=false)" }
  if ($convRes3.contextInserted -ne $true) { throw "Phải chèn ngữ cảnh món mới vào luồng chat (contextInserted=true)" }
  if ($convRes3.itemId -ne "item-bep-tu") { throw "itemId phải cập nhật món mới" }

  $msgs = @(Get-LocalMessages $convRes3.conversationId)
  if ($msgs.Count -ne 2) { throw "Hội thoại bây giờ phải có 2 tin nhắn, thực tế có $($msgs.Count)" }
  if (-not $msgs[1].content.Contains("Bếp từ đơn Kangaroo")) { throw "Tin nhắn thứ 2 phải chứa tên món mới" }
}

# Test 5: Gọi lại món thứ 2 -> không chèn lại ngữ cảnh
Assert-Test "Gọi lại món thứ 2 đã chèn ngữ cảnh: không chèn lại" {
  $convRes4 = Find-Or-Create-Conversation "buyer_A" "seller_B" "item-bep-tu" @{
    itemName  = "Bếp từ đơn Kangaroo"
    itemPrice = 200000
  }
  if ($convRes4.conversationId -ne $convRes1.conversationId) { throw "ID hội thoại phải trùng nhau" }
  if ($convRes4.isNew -ne $false) { throw "isNew phải là false" }
  if ($convRes4.contextInserted -ne $false) { throw "Đã có ngữ cảnh món này nên contextInserted phải là false" }

  $msgs = Get-LocalMessages $convRes4.conversationId
  if ($msgs.Count -ne 2) { throw "Số lượng tin nhắn vẫn giữ nguyên 2" }
}

# Test 6: Đồ tặng miễn phí (itemPrice = 0)
Assert-Test "Đồ tặng miễn phí (itemPrice = 0) hiển thị nhãn '(Đồ tặng miễn phí)'" {
  $convFree = Find-Or-Create-Conversation "buyer_C" "seller_D" "item-giao-trinh" @{
    itemName  = "Giáo trình Giải tích 1"
    itemPrice = 0
  }
  if ($convFree.isNew -ne $true) { throw "isNew phải là true" }
  if ($convFree.contextInserted -ne $true) { throw "contextInserted phải là true" }

  $msgs = Get-LocalMessages $convFree.conversationId
  if (-not $msgs[0].content.Contains("Đồ tặng miễn phí")) { throw "Tin nhắn phải có nhãn Đồ tặng miễn phí" }
}

# Test 7: Thiếu tham số bị từ chối
Assert-Test "Thiếu buyerId, sellerId hoặc itemId ném lỗi rõ ràng" {
  $err1 = $false
  $err2 = $false
  try { [void](Find-Or-Create-Conversation "" "seller_1" "item-1") } catch { $err1 = $true }
  try { [void](Find-Or-Create-Conversation "buyer_1" "seller_1" "") } catch { $err2 = $true }
  if (-not $err1 -or -not $err2) { throw "Thiếu tham số phải ném lỗi" }
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "KẾT QUẢ: $totalPassed Passed, $totalFailed Failed" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if ($totalFailed -gt 0) {
  exit 1
} else {
  exit 0
}
