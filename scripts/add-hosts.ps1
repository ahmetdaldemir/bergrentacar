# Windows Hosts Dosyasına Domain Ekleme Scripti
# Bu script'i PowerShell'i YÖNETİCİ OLARAK açıp çalıştırın

# Yönetici yetkisi kontrolü
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "HATA: Yonetici yetkisi gerekli!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Bu script'i calistirmak icin:" -ForegroundColor Yellow
Write-Host "1. PowerShell'i KAPATIN" -ForegroundColor Yellow
Write-Host "2. Windows tusuna basin ve 'PowerShell' yazin" -ForegroundColor Yellow
Write-Host "3. 'Windows PowerShell' uzerine SAG TIKLAYIN" -ForegroundColor Yellow
Write-Host "4. 'Yonetici olarak calistir' secin" -ForegroundColor Yellow
Write-Host "5. Tekrar bu script'i calistirin: .\add-hosts.ps1" -ForegroundColor Yellow
    Write-Host ""
Write-Host "VEYA manuel olarak hosts dosyasini duzenleyin:" -ForegroundColor Cyan
Write-Host "  Notepad'i yonetici olarak acin" -ForegroundColor Cyan
Write-Host "  C:\Windows\System32\drivers\etc\hosts dosyasini acin" -ForegroundColor Cyan
    Write-Host "  Sonuna sunu ekleyin:" -ForegroundColor Cyan
    Write-Host "    127.0.0.1 berg.local.saastour360.test" -ForegroundColor Green
    Write-Host "    127.0.0.1 sunset.local.saastour360.test" -ForegroundColor Green
    Write-Host "    127.0.0.1 traefik.local.saastour360.test" -ForegroundColor Green
    Write-Host ""
    exit 1
}

$hostsPath = "C:\Windows\System32\drivers\etc\hosts"
$entries = @(
    "127.0.0.1 berg.local.saastour360.test",
    "127.0.0.1 sunset.local.saastour360.test",
    "127.0.0.1 traefik.local.saastour360.test"
)

Write-Host "Hosts dosyasina domain'ler ekleniyor..." -ForegroundColor Yellow

# Mevcut içeriği oku
$currentContent = Get-Content $hostsPath -ErrorAction SilentlyContinue

# Zaten ekli mi kontrol et
$needsUpdate = $false
foreach ($entry in $entries) {
    $domain = ($entry -split '\s+')[1]
    if ($currentContent -notmatch [regex]::Escape($domain)) {
        $needsUpdate = $true
        Write-Host "  + $domain eklenecek" -ForegroundColor Green
    } else {
        Write-Host "  [OK] $domain zaten mevcut" -ForegroundColor Cyan
    }
}

if ($needsUpdate) {
    # Yeni satırlar ekle
    Add-Content -Path $hostsPath -Value ""
    Add-Content -Path $hostsPath -Value "# SaaS Tour Local Development Domains"
    foreach ($entry in $entries) {
        $domain = ($entry -split '\s+')[1]
        if ($currentContent -notmatch [regex]::Escape($domain)) {
            Add-Content -Path $hostsPath -Value $entry
        }
    }
    Write-Host "`nHosts dosyasi guncellendi!" -ForegroundColor Green
    Write-Host "DNS cache temizleniyor..." -ForegroundColor Yellow
    ipconfig /flushdns | Out-Null
    Write-Host "Tamamlandi! Tarayiciyi yeniden baslatin." -ForegroundColor Green
} else {
    Write-Host "`nTum domain'ler zaten mevcut!" -ForegroundColor Cyan
}

