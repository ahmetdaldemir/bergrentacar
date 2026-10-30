#!/bin/bash

# SaaS Tour - Production Temizlik Script'i
# Sadece sunucuya bağlanır ve production'da olmaması gereken dosyaları siler

# Renkli output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🧹 SaaS Tour - Production Temizlik${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Sunucu bilgileri ortam değişkeninden gelir. Repoda adres tutulmaz.
: "${REMOTE_HOST:?REMOTE_HOST gerekli}"
: "${REMOTE_USER:?REMOTE_USER gerekli}"
: "${REMOTE_PATH:?REMOTE_PATH gerekli}"

echo -e "${YELLOW}⚠️  Bu script sunucudaki gereksiz dosyaları silecek:${NC}"
echo ""
echo -e "${RED}Silinecek Klasörler:${NC}"
echo "   • frontend/src (kaynak kodlar)"
echo "   • backend/src (kaynak kodlar)"
echo "   • frontend1 (alternatif frontend)"
echo "   • postman (API test koleksiyonları)"
echo "   • scripts (yardımcı scriptler)"
echo "   • .git (git deposu)"
echo "   • .github (GitHub workflow'ları)"
echo "   • .vscode (VS Code ayarları)"
echo ""
echo -e "${RED}Silinecek Dosya Tipleri:${NC}"
echo "   • *.md, *.MD (markdown dökümanlar)"
echo "   • *.sql (SQL dosyaları)"
echo "   • *.ps1 (PowerShell scriptleri)"
echo "   • .env.example, env.example"
echo "   • tsconfig*.json"
echo "   • .gitignore, .gitattributes"
echo "   • .eslintrc*, .prettierrc*"
echo "   • vite.config.*, webpack.config.*"
echo "   • README* dosyaları"
echo "   • Test dosyaları (*.test.*, *.spec.*)"
echo ""
echo -e "${GREEN}Korunacak Dosyalar:${NC}"
echo "   ✓ backend/dist/"
echo "   ✓ frontend/dist/"
echo "   ✓ infra/"
echo "   ✓ whatsapp-service/ (opsiyonel)"
echo "   ✓ package.json dosyaları"
echo "   ✓ Dockerfile'lar"
echo "   ✓ nginx config'leri"
echo ""
read -p "Devam etmek istiyor musunuz? (yes yazın): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}❌ İşlem iptal edildi${NC}"
    exit 0
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔗 SUNUCUYA BAĞLANIYOR${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Sunucu: ${REMOTE_HOST}${NC}"
echo -e "${BLUE}Kullanıcı: ${REMOTE_USER}${NC}"
echo -e "${BLUE}Path: ${REMOTE_PATH}${NC}"
echo ""

ssh "${REMOTE_USER}@${REMOTE_HOST}" "REMOTE_PATH=$(printf '%q' "$REMOTE_PATH") bash -s" << 'ENDSSH'
    set -e
    
    # Renkli output
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    RED='\033[0;31m'
    BLUE='\033[0;34m'
    CYAN='\033[0;36m'
    NC='\033[0m'
    
    : "${REMOTE_PATH:?REMOTE_PATH gerekli}"
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🧹 PRODUCTION TEMİZLİĞİ BAŞLATILIYOR${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Dizine git
    cd ${REMOTE_PATH} || { echo -e "${RED}❌ Error: Cannot change to directory${NC}"; exit 1; }
    
    echo -e "${BLUE}📍 Mevcut dizin: $(pwd)${NC}"
    echo ""
    
    # Temizlik öncesi boyut
    echo -e "${BLUE}💾 Temizlik Öncesi Disk Kullanımı:${NC}"
    BEFORE_SIZE=$(du -sh ${REMOTE_PATH} 2>/dev/null | awk '{print $1}')
    echo -e "   Toplam boyut: ${YELLOW}$BEFORE_SIZE${NC}"
    echo ""
    
    # ============================================================
    # KLASÖR TEMİZLİĞİ
    # ============================================================
    echo -e "${YELLOW}📁 Klasörler temizleniyor...${NC}"
    
    FOLDERS_TO_DELETE=(
        "frontend/src"
        "backend/src"
        "frontend1"
        "postman"
        "scripts"
        ".git"
        ".github"
        ".vscode"
    )
    
    DELETED_FOLDERS=0
    for folder in "${FOLDERS_TO_DELETE[@]}"; do
        if [ -d "$folder" ]; then
            FOLDER_SIZE=$(du -sh "$folder" 2>/dev/null | awk '{print $1}')
            echo -e "   ${YELLOW}🗑️  Siliniyor: $folder (${FOLDER_SIZE})${NC}"
            rm -rf "$folder"
            DELETED_FOLDERS=$((DELETED_FOLDERS + 1))
            echo -e "   ${GREEN}✅ Silindi: $folder${NC}"
        else
            echo -e "   ${BLUE}⏭️  Zaten yok: $folder${NC}"
        fi
    done
    
    echo -e "${GREEN}✓ $DELETED_FOLDERS klasör silindi${NC}"
    echo ""
    
    # ============================================================
    # MARKDOWN DOSYALARI
    # ============================================================
    echo -e "${YELLOW}📄 Markdown dosyaları temizleniyor...${NC}"
    MD_COUNT=0
    find . -maxdepth 2 -type f \( -name "*.md" -o -name "*.MD" \) -not -path "./node_modules/*" -not -path "./backend/node_modules/*" -not -path "./frontend/node_modules/*" 2>/dev/null | while read file; do
        if [ -f "$file" ]; then
            echo -e "   ${YELLOW}🗑️  $file${NC}"
            rm -f "$file"
            MD_COUNT=$((MD_COUNT + 1))
        fi
    done
    echo -e "${GREEN}✓ Markdown dosyaları temizlendi${NC}"
    echo ""
    
    # ============================================================
    # SQL DOSYALARI
    # ============================================================
    echo -e "${YELLOW}🗄️  SQL dosyaları temizleniyor...${NC}"
    SQL_COUNT=0
    find . -maxdepth 3 -type f -name "*.sql" -not -path "./node_modules/*" 2>/dev/null | while read file; do
        if [ -f "$file" ]; then
            echo -e "   ${YELLOW}🗑️  $file${NC}"
            rm -f "$file"
            SQL_COUNT=$((SQL_COUNT + 1))
        fi
    done
    echo -e "${GREEN}✓ SQL dosyaları temizlendi${NC}"
    echo ""
    
    # ============================================================
    # POWERSHELL SCRIPT'LERİ
    # ============================================================
    echo -e "${YELLOW}💻 PowerShell scriptleri temizleniyor...${NC}"
    PS_COUNT=0
    find . -maxdepth 2 -type f -name "*.ps1" 2>/dev/null | while read file; do
        if [ -f "$file" ]; then
            echo -e "   ${YELLOW}🗑️  $file${NC}"
            rm -f "$file"
            PS_COUNT=$((PS_COUNT + 1))
        fi
    done
    echo -e "${GREEN}✓ PowerShell dosyaları temizlendi${NC}"
    echo ""
    
    # ============================================================
    # CONFIG ÖRNEK DOSYALARI
    # ============================================================
    echo -e "${YELLOW}⚙️  Config örnek dosyaları temizleniyor...${NC}"
    find . -maxdepth 2 -type f \( -name ".env.example" -o -name "env.example" -o -name ".env.*" \) 2>/dev/null | while read file; do
        if [ -f "$file" ]; then
            echo -e "   ${YELLOW}🗑️  $file${NC}"
            rm -f "$file"
        fi
    done
    echo -e "${GREEN}✓ Config örnekleri temizlendi${NC}"
    echo ""
    
    # ============================================================
    # TYPESCRIPT CONFIG DOSYALARI
    # ============================================================
    echo -e "${YELLOW}📝 TypeScript config dosyaları temizleniyor...${NC}"
    find . -maxdepth 2 -type f -name "tsconfig*.json" 2>/dev/null | while read file; do
        if [ -f "$file" ]; then
            echo -e "   ${YELLOW}🗑️  $file${NC}"
            rm -f "$file"
        fi
    done
    echo -e "${GREEN}✓ TypeScript config'leri temizlendi${NC}"
    echo ""
    
    # ============================================================
    # GIT DOSYALARI
    # ============================================================
    echo -e "${YELLOW}🔧 Git dosyaları temizleniyor...${NC}"
    find . -maxdepth 2 -type f \( -name ".gitignore" -o -name ".gitattributes" -o -name ".gitmodules" \) 2>/dev/null | while read file; do
        if [ -f "$file" ]; then
            echo -e "   ${YELLOW}🗑️  $file${NC}"
            rm -f "$file"
        fi
    done
    echo -e "${GREEN}✓ Git dosyaları temizlendi${NC}"
    echo ""
    
    # ============================================================
    # LINTER/FORMATTER DOSYALARI
    # ============================================================
    echo -e "${YELLOW}🎨 Linter/Formatter dosyaları temizleniyor...${NC}"
    find . -maxdepth 2 -type f \( -name ".eslintrc*" -o -name ".prettierrc*" -o -name ".editorconfig" -o -name "eslint.config.*" \) 2>/dev/null | while read file; do
        if [ -f "$file" ]; then
            echo -e "   ${YELLOW}🗑️  $file${NC}"
            rm -f "$file"
        fi
    done
    echo -e "${GREEN}✓ Linter/Formatter config'leri temizlendi${NC}"
    echo ""
    
    # ============================================================
    # BUILD TOOL CONFIG'LERİ
    # ============================================================
    echo -e "${YELLOW}🔨 Build tool config'leri temizleniyor...${NC}"
    find . -maxdepth 2 -type f \( -name "vite.config.*" -o -name "webpack.config.*" -o -name "rollup.config.*" \) 2>/dev/null | while read file; do
        if [ -f "$file" ]; then
            echo -e "   ${YELLOW}🗑️  $file${NC}"
            rm -f "$file"
        fi
    done
    echo -e "${GREEN}✓ Build tool config'leri temizlendi${NC}"
    echo ""
    
    # ============================================================
    # TEST DOSYALARI
    # ============================================================
    echo -e "${YELLOW}🧪 Test dosyaları temizleniyor...${NC}"
    find . -maxdepth 3 -type f \( -name "*.test.ts" -o -name "*.test.js" -o -name "*.spec.ts" -o -name "*.spec.js" \) 2>/dev/null | while read file; do
        if [ -f "$file" ]; then
            echo -e "   ${YELLOW}🗑️  $file${NC}"
            rm -f "$file"
        fi
    done
    echo -e "${GREEN}✓ Test dosyaları temizlendi${NC}"
    echo ""
    
    # ============================================================
    # README DOSYALARI
    # ============================================================
    echo -e "${YELLOW}📖 README dosyaları temizleniyor...${NC}"
    find . -maxdepth 2 -type f -name "README*" 2>/dev/null | while read file; do
        if [ -f "$file" ]; then
            echo -e "   ${YELLOW}🗑️  $file${NC}"
            rm -f "$file"
        fi
    done
    echo -e "${GREEN}✓ README dosyaları temizlendi${NC}"
    echo ""
    
    # ============================================================
    # TEMİZLİK ÖZETİ
    # ============================================================
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}📊 TEMİZLİK ÖZETİ${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Temizlik sonrası boyut
    echo -e "${BLUE}💾 Temizlik Sonrası Disk Kullanımı:${NC}"
    AFTER_SIZE=$(du -sh ${REMOTE_PATH} 2>/dev/null | awk '{print $1}')
    echo -e "   Toplam boyut: ${GREEN}$AFTER_SIZE${NC}"
    echo -e "   Önceki boyut: ${YELLOW}$BEFORE_SIZE${NC}"
    echo ""
    
    # Kalan klasörleri listele
    echo -e "${BLUE}✅ Production'da Kalan Klasörler:${NC}"
    ls -1 ${REMOTE_PATH} 2>/dev/null | while read item; do
        if [ -d "$item" ]; then
            SIZE=$(du -sh "$item" 2>/dev/null | awk '{print $1}')
            echo -e "   ${GREEN}✓${NC} $item (${SIZE})"
        fi
    done
    echo ""
    
    # Güvenlik kontrolü
    echo -e "${YELLOW}🔒 Güvenlik Kontrolü:${NC}"
    SECURITY_ISSUES=0
    
    if [ -d "backend/src" ]; then
        echo -e "   ${RED}⚠️  UYARI: backend/src kaynak kodları hala sunucuda!${NC}"
        SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
    else
        echo -e "   ${GREEN}✓${NC} backend/src yok (güzel!)"
    fi
    
    if [ -d "frontend/src" ]; then
        echo -e "   ${RED}⚠️  UYARI: frontend/src kaynak kodları hala sunucuda!${NC}"
        SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
    else
        echo -e "   ${GREEN}✓${NC} frontend/src yok (güzel!)"
    fi
    
    if [ -d ".git" ]; then
        echo -e "   ${RED}⚠️  UYARI: .git deposu sunucuda (güvenlik riski)!${NC}"
        SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
    else
        echo -e "   ${GREEN}✓${NC} .git yok (güzel!)"
    fi
    
    if [ -d "frontend1" ]; then
        echo -e "   ${YELLOW}⚠️  frontend1 klasörü hala var${NC}"
        SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
    else
        echo -e "   ${GREEN}✓${NC} frontend1 yok (güzel!)"
    fi
    
    echo ""
    
    if [ $SECURITY_ISSUES -eq 0 ]; then
        echo -e "${GREEN}✅ Güvenlik kontrolü BAŞARILI - hassas bilgi bulunamadı!${NC}"
    else
        echo -e "${YELLOW}⚠️  $SECURITY_ISSUES adet güvenlik uyarısı bulundu${NC}"
    fi
    echo ""
    
    # Production dosya kontrolü
    echo -e "${BLUE}✅ Kritik Production Dosyaları:${NC}"
    [ -d "backend/dist" ] && echo -e "   ${GREEN}✓${NC} backend/dist var" || echo -e "   ${RED}✗${NC} backend/dist YOK!"
    [ -d "frontend/dist" ] && echo -e "   ${GREEN}✓${NC} frontend/dist var" || echo -e "   ${RED}✗${NC} frontend/dist YOK!"
    [ -d "infra" ] && echo -e "   ${GREEN}✓${NC} infra var" || echo -e "   ${RED}✗${NC} infra YOK!"
    [ -f "backend/package.json" ] && echo -e "   ${GREEN}✓${NC} backend/package.json var" || echo -e "   ${RED}✗${NC} backend/package.json YOK!"
    [ -f "frontend/package.json" ] && echo -e "   ${GREEN}✓${NC} frontend/package.json var" || echo -e "   ${RED}✗${NC} frontend/package.json YOK!"
    
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ TEMİZLİK TAMAMLANDI!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
ENDSSH

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 PRODUCTION TEMİZLİK İŞLEMİ TAMAMLANDI!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}💡 İpucu: Container'ları yeniden başlatmak için:${NC}"
echo -e "   ${CYAN}ssh ${REMOTE_USER}@${REMOTE_HOST}${NC}"
echo -e "   ${CYAN}cd ${REMOTE_PATH}/infra${NC}"
echo -e "   ${CYAN}docker-compose restart${NC}"
echo ""

