#!/usr/bin/env bash
# Downloads a restorable backup of the bergrentacar.com tenant only.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"
OUT="$ROOT/backups/bergrentacar"
TENANT_ID="9930c947-f720-463c-ba1d-e1af921d5ffb"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "backend/.env not found" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

: "${DB_HOST:?}"
: "${DB_PORT:?}"
: "${DB_USERNAME:?}"
: "${DB_PASSWORD:?}"
: "${DB_NAME:?}"

export PGPASSWORD="$DB_PASSWORD"
mkdir -p "$OUT"

PSQL=(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -v ON_ERROR_STOP=1)

echo "Writing schema"
schema_ok=0
if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" \
  --schema-only --no-owner --no-privileges -n public \
  -f "$OUT/schema.sql" 2>"$OUT/pg_dump.err"; then
  schema_ok=1
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo "Local pg_dump cannot read this server; using PostgreSQL 18 client in Docker"
  if docker run --rm -e PGPASSWORD="$DB_PASSWORD" postgres:18 \
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" \
    --schema-only --no-owner --no-privileges -n public \
    > "$OUT/schema.sql"; then
    schema_ok=1
  fi
fi
rm -f "$OUT/pg_dump.err"
if [[ "$schema_ok" -ne 1 ]]; then
  echo "Schema dump skipped. Restore the data file into a database created from this project's entities." > "$OUT/schema-README.txt"
  rm -f "$OUT/schema.sql"
fi

DATA="$OUT/bergrentacar-data.sql"
{
  echo "-- bergrentacar.com tenant data"
  echo "-- tenant_id ${TENANT_ID}"
  echo "BEGIN;"
  echo "SET session_replication_role = replica;"
} > "$DATA"

copy_where() {
  local table="$1"
  local where="$2"
  echo "COPY public.\"${table}\" FROM stdin;" >> "$DATA"
  "${PSQL[@]}" -c "COPY (SELECT * FROM public.\"${table}\" WHERE ${where}) TO STDOUT" >> "$DATA"
  printf '\\\.\n' >> "$DATA"
}

echo "Writing tenant row and reference catalogs"
copy_where tenants "id = '${TENANT_ID}'"
for table in currencies languages countries phone_countries vehicle_brands vehicle_models vehicle_categories vehicle_category_translations locations hotels tour_features; do
  copy_where "$table" "TRUE"
done

echo "Writing tenant-scoped tables"
while IFS= read -r table; do
  [[ -z "$table" || "$table" == "tenants" ]] && continue
  copy_where "$table" "tenant_id = '${TENANT_ID}'"
done < <("${PSQL[@]}" -At -c "SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'tenant_id' ORDER BY table_name")

echo "Writing related rows"
copy_where chat_messages "room_id IN (SELECT id FROM chat_rooms WHERE tenant_id = '${TENANT_ID}')"
copy_where chat_participants "room_id IN (SELECT id FROM chat_rooms WHERE tenant_id = '${TENANT_ID}')"
copy_where hotel_room_types "hotel_id IN (SELECT id FROM tenant_hotels WHERE tenant_id = '${TENANT_ID}')"
copy_where survey_questions "survey_id IN (SELECT id FROM surveys WHERE tenant_id = '${TENANT_ID}')"
copy_where survey_responses "survey_id IN (SELECT id FROM surveys WHERE tenant_id = '${TENANT_ID}')"
copy_where commission_transactions "reservation_id IN (SELECT id FROM reservations WHERE tenant_id = '${TENANT_ID}')"
copy_where tour_images "tour_id IN (SELECT id FROM tours WHERE tenant_id = '${TENANT_ID}')"
copy_where tour_translations "tour_id IN (SELECT id FROM tours WHERE tenant_id = '${TENANT_ID}')"
copy_where tour_feature_assignments "tour_id IN (SELECT id FROM tours WHERE tenant_id = '${TENANT_ID}')"
copy_where tour_info_items "tour_id IN (SELECT id FROM tours WHERE tenant_id = '${TENANT_ID}')"
copy_where tour_languages "tour_id IN (SELECT id FROM tours WHERE tenant_id = '${TENANT_ID}')"
copy_where tour_pricing "tour_id IN (SELECT id FROM tours WHERE tenant_id = '${TENANT_ID}')"
copy_where tour_sessions "tour_id IN (SELECT id FROM tours WHERE tenant_id = '${TENANT_ID}')"
copy_where tour_time_slots "tour_id IN (SELECT id FROM tours WHERE tenant_id = '${TENANT_ID}')"
copy_where transfer_route_points "route_id IN (SELECT id FROM transfer_routes WHERE tenant_id = '${TENANT_ID}')"
copy_where transfer_vehicle_images "vehicle_id IN (SELECT id FROM transfer_vehicles WHERE tenant_id = '${TENANT_ID}')"
copy_where transfer_zone_price_items "\"groupId\" IN (SELECT id FROM transfer_zone_price_groups WHERE tenant_id = '${TENANT_ID}')"
copy_where tour_feature_translations "feature_id IN (SELECT feature_id FROM tour_feature_assignments WHERE tour_id IN (SELECT id FROM tours WHERE tenant_id = '${TENANT_ID}'))"
copy_where vehicle_images "vehicle_id IN (SELECT id FROM vehicles WHERE tenant_id = '${TENANT_ID}')"
copy_where vehicle_plates "vehicle_id IN (SELECT id FROM vehicles WHERE tenant_id = '${TENANT_ID}')"
copy_where vehicle_pricing_periods "vehicle_id IN (SELECT id FROM vehicles WHERE tenant_id = '${TENANT_ID}')"
copy_where vehicle_reservation_assignments "reservation_id IN (SELECT id FROM reservations WHERE tenant_id = '${TENANT_ID}')"
copy_where location_delivery_pricing "location_id IN (SELECT id FROM rentacar_locations WHERE tenant_id = '${TENANT_ID}')"
copy_where location_vehicle_pricing "vehicle_id IN (SELECT id FROM vehicles WHERE tenant_id = '${TENANT_ID}')"

if "${PSQL[@]}" -At -c "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='vehicle_timeline_media' AND column_name='vehicle_id'" | grep -q 1; then
  copy_where vehicle_timeline_media "vehicle_id IN (SELECT id FROM vehicles WHERE tenant_id = '${TENANT_ID}')"
fi

if "${PSQL[@]}" -At -c "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenant_service_agreements' AND column_name='tenant_id'" | grep -q 1; then
  copy_where tenant_service_agreements "tenant_id = '${TENANT_ID}'"
fi

{
  echo "COMMIT;"
} >> "$DATA"

echo "Backup written to backups/bergrentacar"
du -sh "$OUT"/*
