# Kiểm thử tự động bộ lọc Chợ đồ cũ bằng PowerShell (dùng fixture độc lập)
$ErrorActionPreference = "Stop"

$VALID_CATEGORIES = @('Nội thất', 'Đồ điện tử', 'Sách vở', 'Đồ gia dụng')
$VALID_DISTRICTS = @(
  'Quận Cầu Giấy', 'Quận Đống Đa', 'Quận Hai Bà Trưng', 'Quận Thanh Xuân',
  'Quận Nam Từ Liêm', 'Quận Hà Đông', 'Quận Ba Đình', 'Quận Bắc Từ Liêm', 'Quận Hoàng Mai'
)
$VALID_CONDITIONS = @('nhu_moi', 'con_tot', 'da_cu')
$VALID_DELIVERY_METHODS = @('tai_truong', 'giao_tan_noi', 'tu_den_lay')

function Remove-VietnameseTones([string]$str) {
  if ([string]::IsNullOrWhiteSpace($str)) { return "" }
  $normalized = $str.Normalize([System.Text.NormalizationForm]::FormD)
  $builder = [System.Text.StringBuilder]::new()
  foreach ($ch in $normalized.ToCharArray()) {
    $cat = [System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch)
    if ($cat -ne [System.Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$builder.Append($ch)
    }
  }
  return $builder.ToString().Replace('đ', 'd').Replace('Đ', 'D').ToLower().Trim()
}

function Normalize-Condition([string]$cond) {
  if ([string]::IsNullOrWhiteSpace($cond)) { return $null }
  $raw = Remove-VietnameseTones $cond

  # 1. "tặng miễn phí" / "miễn phí" trả về null (miễn phí là giá, không phải tình trạng)
  if ($raw.Contains('tang mien phi') -or $raw -eq 'mien phi' -or $raw.Contains('0d') -or $raw.Contains('0 dong')) {
    return $null
  }

  # 2. Mã chuẩn
  if ($raw -eq 'nhu_moi') { return 'nhu_moi' }
  if ($raw -eq 'con_tot') { return 'con_tot' }
  if ($raw -eq 'da_cu') { return 'da_cu' }

  # 3. Phần trăm: >=95% -> nhu_moi, 70-94% -> con_tot, <70% -> da_cu
  if ($raw -match '(\d+)\s*%') {
    $percent = [int]$Matches[1]
    if ($percent -ge 95) { return 'nhu_moi' }
    if ($percent -ge 70) { return 'con_tot' }
    return 'da_cu'
  }

  # 4. Từ khóa
  if ($raw.Contains('nhu moi') -or $raw.Contains('moi tinh') -or $raw.StartsWith('moi')) {
    return 'nhu_moi'
  }
  if ($raw.Contains('con dung tot') -or $raw.Contains('con tot') -or $raw.Contains('dung tot') -or $raw.Contains('tot')) {
    return 'con_tot'
  }
  if ($raw.Contains('da qua su dung') -or $raw.Contains('da cu') -or $raw.Contains('cu')) {
    return 'da_cu'
  }

  return $null
}

function Count-AdvancedFilters($criteria) {
  $count = 0
  if (-not $criteria.isFreeOnly -and ($null -ne $criteria.minPrice -or $null -ne $criteria.maxPrice)) {
    $count++
  }
  if ($criteria.conditions -and $criteria.conditions.Count -gt 0) {
    $count++
  }
  if ($criteria.deliveryMethods -and $criteria.deliveryMethods.Count -gt 0) {
    $count++
  }
  if ($criteria.timeRange -and $criteria.timeRange -ne 'all') {
    $count++
  }
  if ($criteria.isNegotiableOnly) {
    $count++
  }
  if ($criteria.hasImagesOnly) {
    $count++
  }
  return $count
}

# FIXTURES ĐỘC LẬP
$FIXED_NOW = 1700000000000
$ONE_HOUR = 3600 * 1000
$ONE_DAY = 24 * $ONE_HOUR

$TEST_FIXTURES = @(
  @{
    id = 'fix-1'; name = 'Bàn học gấp gọn sinh viên'; category = 'Nội thất'; price = 120000;
    pricingType = 'Giá rẻ'; condition = 'nhu_moi'; deliveryMethods = @('tai_truong', 'tu_den_lay');
    isNegotiable = $true; images = @('https://images.unsplash.com/photo-1.jpg'); district = 'Quận Cầu Giấy';
    createdAt = ($FIXED_NOW - 2 * $ONE_HOUR); status = 'Còn hàng'
  },
  @{
    id = 'fix-2'; name = 'Ấm đun nước siêu tốc'; category = 'Đồ gia dụng'; price = 80000;
    pricingType = 'Giá rẻ'; condition = 'con_tot'; deliveryMethods = @('giao_tan_noi');
    isNegotiable = $false; images = @('https://images.unsplash.com/photo-2.jpg'); district = 'Quận Đống Đa';
    createdAt = ($FIXED_NOW - 3 * $ONE_DAY); status = 'Còn hàng'
  },
  @{
    id = 'fix-3'; name = 'Giáo trình Giải tích'; category = 'Sách vở'; price = 0;
    pricingType = 'Miễn phí'; condition = 'da_cu'; deliveryMethods = @('tai_truong');
    isNegotiable = $false; images = @(); district = 'Quận Hai Bà Trưng';
    createdAt = ($FIXED_NOW - 10 * $ONE_DAY); status = 'Còn hàng'
  },
  @{
    id = 'fix-4-legacy'; name = 'Tai nghe chụp tai Sony'; category = 'Đồ điện tử'; price = 350000;
    pricingType = 'Giá rẻ'; condition = 'Mới 99%'; images = @('https://images.unsplash.com/photo-4.jpg');
    district = 'Quận Thanh Xuân'; createdAt = ($FIXED_NOW - 12 * $ONE_HOUR); status = 'Còn hàng'
  },
  @{
    id = 'fix-5-pending'; name = 'Quạt đứng Senko'; category = 'Đồ gia dụng'; price = 150000;
    pricingType = 'Giá rẻ'; condition = 'con_tot'; deliveryMethods = @('tu_den_lay');
    images = @('https://images.unsplash.com/photo-5.jpg'); district = 'Quận Cầu Giấy';
    createdAt = ($FIXED_NOW - 1 * $ONE_HOUR); status = 'Chờ duyệt'
  }
)

function Filter-MarketplaceItems($items, $criteria, $nowTime = $FIXED_NOW) {
  $out = @()
  foreach ($item in $items) {
    if ($criteria.viewMode -ne 'all' -and $item.status -eq 'Chờ duyệt') { continue }
    if ($criteria.isFreeOnly -and ($item.pricingType -ne 'Miễn phí' -and $item.price -ne 0)) { continue }
    
    # Conditions
    if ($criteria.conditions -and $criteria.conditions.Count -gt 0) {
      $norm = Normalize-Condition $item.condition
      if (-not $norm -or -not ($criteria.conditions -contains $norm)) { continue }
    }

    # Delivery methods (tin cũ thiếu -> không khớp)
    if ($criteria.deliveryMethods -and $criteria.deliveryMethods.Count -gt 0) {
      if (-not $item.deliveryMethods -or $item.deliveryMethods.Count -eq 0) { continue }
      $matchDeliv = $false
      foreach ($m in $criteria.deliveryMethods) {
        if ($item.deliveryMethods -contains $m) { $matchDeliv = $true; break }
      }
      if (-not $matchDeliv) { continue }
    }

    # Time range
    if ($criteria.timeRange -eq '24h') {
      if (($nowTime - $item.createdAt) -gt (24 * 3600 * 1000)) { continue }
    } elseif ($criteria.timeRange -eq '7d') {
      if (($nowTime - $item.createdAt) -gt (7 * 24 * 3600 * 1000)) { continue }
    }

    # Negotiable (tin cũ thiếu -> false)
    if ($criteria.isNegotiableOnly) {
      if ($item.isNegotiable -ne $true) { continue }
    }

    # Images only
    if ($criteria.hasImagesOnly) {
      if (-not $item.images -or $item.images.Count -eq 0) { continue }
    }

    $out += $item
  }
  return ,$out
}

$passed = 0
$failed = 0

function Assert-Test([string]$desc, [bool]$condition) {
  if ($condition) {
    Write-Host "  PASS: $desc" -ForegroundColor Green
    $script:passed++
  } else {
    Write-Host "  FAIL: $desc" -ForegroundColor Red
    $script:failed++
  }
}

Write-Host "`n=== CHẠY TEST SUITE POWERSHELL CHO BỘ LỌC CHỢ ĐỒ CŨ ===" -ForegroundColor Cyan

# 1. normalizeCondition
Write-Host "`n[1. Unit test normalizeCondition]" -ForegroundColor Yellow
Assert-Test "tang mien phi -> null" ($null -eq (Normalize-Condition "tặng miễn phí"))
Assert-Test "mien phi -> null" ($null -eq (Normalize-Condition "miễn phí"))
Assert-Test "0d -> null" ($null -eq (Normalize-Condition "0đ"))
Assert-Test "nhu_moi code -> nhu_moi" ('nhu_moi' -eq (Normalize-Condition "nhu_moi"))
Assert-Test "99% -> nhu_moi" ('nhu_moi' -eq (Normalize-Condition "99%"))
Assert-Test "Mới 95% -> nhu_moi" ('nhu_moi' -eq (Normalize-Condition "Mới 95%"))
Assert-Test "90% -> con_tot" ('con_tot' -eq (Normalize-Condition "90%"))
Assert-Test "Còn 80% -> con_tot" ('con_tot' -eq (Normalize-Condition "Còn 80%"))
Assert-Test "60% -> da_cu" ('da_cu' -eq (Normalize-Condition "60%"))
Assert-Test "Như mới -> nhu_moi" ('nhu_moi' -eq (Normalize-Condition "Như mới"))
Assert-Test "Còn dùng tốt -> con_tot" ('con_tot' -eq (Normalize-Condition "Còn dùng tốt"))
Assert-Test "Đã cũ -> da_cu" ('da_cu' -eq (Normalize-Condition "Đã cũ"))

# 2. Count advanced filters
Write-Host "`n[2. Đếm nhóm bộ lọc con]" -ForegroundColor Yellow
Assert-Test "0 bộ lọc" (0 -eq (Count-AdvancedFilters @{}))
Assert-Test "Khoảng giá bật -> 1" (1 -eq (Count-AdvancedFilters @{ minPrice = 50000 }))
Assert-Test "Khoảng giá khi miễn phí -> 0" (0 -eq (Count-AdvancedFilters @{ minPrice = 50000; isFreeOnly = $true }))
Assert-Test "Tất cả 6 nhóm -> 6" (6 -eq (Count-AdvancedFilters @{
  minPrice = 10000; conditions = @('con_tot'); deliveryMethods = @('giao_tan_noi');
  timeRange = '7d'; isNegotiableOnly = $true; hasImagesOnly = $true
}))

# 3. Test fixtures
Write-Host "`n[3. Lọc fixture với tin cũ và thời gian cố định]" -ForegroundColor Yellow
$resFree = Filter-MarketplaceItems $TEST_FIXTURES @{ isFreeOnly = $true }
Assert-Test "Lọc đồ miễn phí" ($resFree.Count -eq 1 -and $resFree[0].id -eq 'fix-3')

$resDeliv = Filter-MarketplaceItems $TEST_FIXTURES @{ deliveryMethods = @('tai_truong') }
$delivIds = $resDeliv | ForEach-Object { $_.id }
Assert-Test "Tin cũ thiếu deliveryMethods bị loại khi lọc deliveryMethods" (-not ($delivIds -contains 'fix-4-legacy'))

$resNego = Filter-MarketplaceItems $TEST_FIXTURES @{ isNegotiableOnly = $true }
$negoIds = $resNego | ForEach-Object { $_.id }
Assert-Test "Tin cũ thiếu isNegotiable bị loại khi lọc isNegotiableOnly" (-not ($negoIds -contains 'fix-4-legacy'))

$resCond = Filter-MarketplaceItems $TEST_FIXTURES @{ conditions = @('nhu_moi') }
$condIds = $resCond | ForEach-Object { $_.id }
Assert-Test "Tin cũ Mới 99% được chuẩn hóa và khớp nhu_moi" ($condIds -contains 'fix-4-legacy')

$res24h = Filter-MarketplaceItems $TEST_FIXTURES @{ timeRange = '24h' }
$ids24h = $res24h | ForEach-Object { $_.id }
Assert-Test "24h chứa tin 2h và 12h, không chứa tin 3 ngày và 10 ngày" ($ids24h -contains 'fix-1' -and $ids24h -contains 'fix-4-legacy' -and -not ($ids24h -contains 'fix-2') -and -not ($ids24h -contains 'fix-3'))

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "KẾT QUẢ: $passed Passed, $failed Failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "==========================================" -ForegroundColor Cyan

if ($failed -gt 0) {
  exit 1
} else {
  exit 0
}
