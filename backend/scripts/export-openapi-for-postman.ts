/**
 * OpenAPI spec'i backend kaynağından postman/openapi-spec.json olarak yazar.
 * Çalıştır: npx ts-node --project tsconfig.json scripts/export-openapi-for-postman.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { getApiDocs } from '../src/docs/api-docs';

const out = path.join(__dirname, '../../postman/openapi-spec.json');
const spec = getApiDocs();
fs.writeFileSync(out, JSON.stringify(spec, null, 2), 'utf8');
console.log('Wrote', out);
