#!/bin/bash

# Seed Management Script
# Tüm seed ve import komutlarını tek bir script ile yönetir
#
# Kullanım:
#   ./seed.sh tenant              - Yeni tenant oluştur
#   ./seed.sh full                 - Tüm temel verileri seed et
#   ./seed.sh mock                 - Mock/test verileri oluştur
#   ./seed.sh global               - Global destinations & hotels
#   ./seed.sh import:destinations  - RapidAPI'den destinasyon import et
#   ./seed.sh import:hotels        - RapidAPI'den otel import et
#   ./seed.sh vehicles             - Araç markaları ve modelleri
#   ./seed.sh vehicle-variations   - Araç varyasyonları
#   ./seed.sh vehicle-plates       - Araç plakaları
#   ./seed.sh provinces            - Türkiye illeri
#   ./seed.sh province-sub-locations - İl alt lokasyonları
#   ./seed.sh customer-welcome     - Customer welcome email template
#   ./seed.sh fix:destinations     - Destinations tenant_id düzelt
#   ./seed.sh help                 - Yardım mesajı

set -e

# Renkli output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Komut
COMMAND=${1:-help}

# Proje dizini
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/backend"

# Yardım mesajı
show_help() {
    echo -e "${BLUE}🌱 Seed Management Script${NC}"
    echo "=================================="
    echo ""
    echo -e "${CYAN}Kullanım:${NC} ./seed.sh [komut]"
    echo ""
    echo -e "${CYAN}Komutlar:${NC}"
    echo "  tenant                  - Yeni tenant, settings ve admin user oluştur"
    echo "  full                    - Tüm temel verileri seed et"
    echo "  mock                    - Mock/test verileri oluştur"
    echo "  global                  - Global destinations & hotels seed"
    echo "  import:destinations     - RapidAPI'den destinasyon import et"
    echo "  import:hotels           - RapidAPI'den otel import et (--city, --limit, --radius)"
    echo "  vehicles                - Araç markaları ve modelleri seed et"
    echo "  vehicle-variations      - Araç varyasyonları seed et"
    echo "  vehicle-plates          - Araç plakaları seed et"
    echo "  provinces               - Türkiye illeri seed et"
    echo "  province-sub-locations  - İl alt lokasyonları seed et"
    echo "  customer-welcome        - Customer welcome email template oluştur"
    echo "  fix:destinations        - Destinations tenant_id sorunlarını düzelt"
    echo "  help                    - Bu yardım mesajını göster"
    echo ""
    echo -e "${CYAN}Örnekler:${NC}"
    echo "  ./seed.sh tenant"
    echo "  ./seed.sh import:hotels --city Antalya --limit 100"
    echo ""
}

# Docker container kontrolü
check_docker() {
    if docker ps | grep -q "saas-tour-backend"; then
        USE_DOCKER=true
        echo -e "${BLUE}🐳 Docker container kullanılıyor${NC}"
    else
        USE_DOCKER=false
        echo -e "${YELLOW}💻 Yerel ortam kullanılıyor${NC}"
    fi
}

# Komut çalıştırma
run_command() {
    local cmd=$1
    shift
    local args="$@"
    
    if [ "$USE_DOCKER" = true ]; then
        echo -e "${GREEN}📦 Docker container içinde çalıştırılıyor...${NC}"
        docker exec -it saas-tour-backend npm run "$cmd" $args
    else
        echo -e "${GREEN}💻 Yerel ortamda çalıştırılıyor...${NC}"
        npm run "$cmd" $args
    fi
}

# Ana işlem
case "$COMMAND" in
    tenant)
        echo -e "${BLUE}📦 Yeni tenant oluşturuluyor...${NC}"
        echo -e "${YELLOW}⚠️  Önce backend/src/scripts/seed-tenant.ts dosyasını düzenleyin!${NC}"
        check_docker
        run_command "seed:tenant"
        ;;
    
    full)
        echo -e "${BLUE}🌱 Tüm temel veriler seed ediliyor...${NC}"
        check_docker
        run_command "seed"
        ;;
    
    mock)
        echo -e "${BLUE}🎭 Mock veriler oluşturuluyor...${NC}"
        check_docker
        run_command "seed:mock"
        ;;
    
    global)
        echo -e "${BLUE}🌍 Global destinations & hotels seed ediliyor...${NC}"
        check_docker
        run_command "seed:global"
        ;;
    
    import:destinations)
        echo -e "${BLUE}📥 Destinasyonlar import ediliyor...${NC}"
        check_docker
        run_command "import:destinations"
        ;;
    
    import:hotels)
        echo -e "${BLUE}📥 Oteller import ediliyor...${NC}"
        shift
        check_docker
        run_command "import:hotels" "$@"
        ;;
    
    vehicles)
        echo -e "${BLUE}🚗 Araç markaları ve modelleri seed ediliyor...${NC}"
        check_docker
        run_command "seed:vehicles"
        ;;
    
    vehicle-variations)
        echo -e "${BLUE}🔧 Araç varyasyonları seed ediliyor...${NC}"
        check_docker
        run_command "seed:vehicle-variations"
        ;;
    
    vehicle-plates)
        echo -e "${BLUE}🔢 Araç plakaları seed ediliyor...${NC}"
        check_docker
        run_command "seed:vehicle-plates"
        ;;
    
    provinces)
        echo -e "${BLUE}🗺️  Türkiye illeri seed ediliyor...${NC}"
        check_docker
        run_command "seed:provinces"
        ;;
    
    province-sub-locations)
        echo -e "${BLUE}📍 İl alt lokasyonları seed ediliyor...${NC}"
        check_docker
        run_command "seed:province-sub-locations"
        ;;
    
    customer-welcome)
        echo -e "${BLUE}📧 Customer welcome email template oluşturuluyor...${NC}"
        check_docker
        run_command "seed:customer-welcome"
        ;;
    
    fix:destinations)
        echo -e "${BLUE}🔧 Destinations tenant_id sorunları düzeltiliyor...${NC}"
        check_docker
        run_command "fix:destinations-tenant-sync"
        ;;
    
    help|--help|-h)
        show_help
        ;;
    
    *)
        echo -e "${RED}❌ Bilinmeyen komut: $COMMAND${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac

echo -e "${GREEN}✅ İşlem tamamlandı!${NC}"

