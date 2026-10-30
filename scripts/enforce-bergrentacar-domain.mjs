#!/usr/bin/env node
/**
 * Boot gate for bergrentacar.com.
 * Exits non-zero when this installation is configured for any other domain,
 * or when bergrentacar.com no longer exists in public DNS.
 */

import { Resolver } from 'node:dns/promises';

const ALLOWED_HOSTS = new Set(['bergrentacar.com', 'www.bergrentacar.com']);
const URL_KEYS = ['FRONTEND_URL', 'PUBLIC_URL', 'APP_URL', 'APP_PUBLIC_URL', 'CORS_EXTRA_ORIGINS'];
const REQUIRED_DOMAIN = 'bergrentacar.com';
const PUBLIC_RESOLVERS = ['1.1.1.1', '8.8.8.8', '9.9.9.9'];

function hostnameOf(value) {
  const candidate = value.includes('://') ? value : `https://${value}`;
  return new URL(candidate).hostname.toLowerCase();
}

function fail(message) {
  console.error(`[bergrentacar-domain] ${message}`);
  process.exit(78);
}

for (const key of URL_KEYS) {
  const raw = process.env[key];
  if (!raw || !raw.trim()) continue;
  for (const piece of raw.split(',').map((part) => part.trim()).filter(Boolean)) {
    let hostname = '';
    try {
      hostname = hostnameOf(piece);
    } catch {
      fail(`${key} is not a valid bergrentacar.com address`);
    }
    if (!ALLOWED_HOSTS.has(hostname)) {
      fail(`${key} points at ${hostname}. This build only runs on bergrentacar.com`);
    }
  }
}

async function domainExistsOn(server) {
  const resolver = new Resolver();
  resolver.setServers([server]);
  const read = async (method) => {
    try {
      const addresses = await resolver[method](REQUIRED_DOMAIN);
      return addresses.length > 0 ? 'ok' : 'nodata';
    } catch (error) {
      const code = error && error.code;
      if (code === 'ENOTFOUND') return 'nxdomain';
      if (code === 'ENODATA') return 'nodata';
      return 'error';
    }
  };
  const ipv4 = await read('resolve4');
  if (ipv4 === 'ok') return 'ok';
  const ipv6 = await read('resolve6');
  if (ipv6 === 'ok') return 'ok';
  if (ipv4 === 'nxdomain') return 'missing';
  return 'error';
}

let sawMissing = false;
let sawAnswer = false;
for (const server of PUBLIC_RESOLVERS) {
  const result = await domainExistsOn(server);
  if (result === 'ok') {
    sawAnswer = true;
    break;
  }
  if (result === 'missing') sawMissing = true;
}

if (!sawAnswer) {
  fail(
    sawMissing
      ? 'bergrentacar.com is not published in public DNS. This installation is stopped.'
      : 'bergrentacar.com could not be verified in public DNS. This installation is stopped.'
  );
}

console.log('[bergrentacar-domain] bergrentacar.com is published and this build is locked to it');
