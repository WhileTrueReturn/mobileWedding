#!/usr/bin/env node
/**
 * Naver Commerce API smoke test (no extra deps).
 *
 * Required env:
 *  - NAVER_COMMERCE_CLIENT_ID
 *  - NAVER_COMMERCE_CLIENT_SECRET
 *
 * Optional env:
 *  - NAVER_COMMERCE_BASE_URL (default: https://api.commerce.naver.com/external/v1)
 *  - NAVER_COMMERCE_ACCESS_TOKEN (if you already have one)
 */

import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

function parseDotenvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const eq = trimmed.indexOf('=');
  if (eq === -1) return null;

  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadEnvFileIfExists(filename) {
  const filePath = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseDotenvLine(line);
    if (!parsed) continue;

    // Only set if not already present (env export takes precedence)
    if (process.env[parsed.key] === undefined) {
      process.env[parsed.key] = parsed.value;
    }
  }
}

// Auto-load env for local usage.
loadEnvFileIfExists('.env.local');
loadEnvFileIfExists('.env');

const BASE_URL = process.env.NAVER_COMMERCE_BASE_URL || 'https://api.commerce.naver.com/external/v1';

function maskToken(token) {
  if (!token || typeof token !== 'string') return token;
  if (token.length <= 10) return '***';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

function parseArgs(argv) {
  const args = { _: [] };
  for (const raw of argv) {
    if (raw.startsWith('--')) {
      const eq = raw.indexOf('=');
      if (eq === -1) {
        args[raw.slice(2)] = true;
      } else {
        args[raw.slice(2, eq)] = raw.slice(eq + 1);
      }
    } else {
      args._.push(raw);
    }
  }
  return args;
}

function printHelp() {
  console.log(`\nNaver Commerce API smoke test\n\nUsage:\n  node scripts/naver-commerce.mjs token\n  node scripts/naver-commerce.mjs lastChanged --from=2026-01-03T00:00:00+09:00 --to=2026-01-03T23:59:59+09:00\n  node scripts/naver-commerce.mjs query --productOrderIds=123,456\n\nEnv:\n  NAVER_COMMERCE_CLIENT_ID\n  NAVER_COMMERCE_CLIENT_SECRET\n  NAVER_COMMERCE_TYPE (default: SELF, or SELLER)\n  NAVER_COMMERCE_ACCOUNT_ID (required if type=SELLER)\n  (optional) NAVER_COMMERCE_BASE_URL\n  (optional) NAVER_COMMERCE_ACCESS_TOKEN\n\nNotes:\n- This script prints response status + JSON/body, but masks access token in logs.\n- If Naver API returns 400, the error message usually tells missing params.\n`);
}

async function requestJson(url, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(url, {
    method,
    headers,
    body,
  });

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  let parsed = null;
  if (contentType.includes('application/json')) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  return {
    ok: res.ok,
    status: res.status,
    contentType,
    text,
    json: parsed,
  };
}

async function getAccessToken() {
  const clientId = process.env.NAVER_COMMERCE_CLIENT_ID;
  const clientSecret = process.env.NAVER_COMMERCE_CLIENT_SECRET;
  const type = process.env.NAVER_COMMERCE_TYPE || 'SELF';
  const accountId = process.env.NAVER_COMMERCE_ACCOUNT_ID || '';

  if (!clientId || !clientSecret) {
    throw new Error('Missing env: NAVER_COMMERCE_CLIENT_ID / NAVER_COMMERCE_CLIENT_SECRET');
  }

  // Naver Commerce OAuth2 requires timestamp + client_secret_sign (bcrypt-based signature)
  const timestamp = Date.now().toString();
  const password = `${clientId}_${timestamp}`;
  
  // bcrypt.hashSync uses client_secret as salt
  const hashed = bcrypt.hashSync(password, clientSecret);
  const client_secret_sign = Buffer.from(hashed, 'utf8').toString('base64');

  const form = new URLSearchParams();
  form.set('client_id', clientId);
  form.set('timestamp', timestamp);
  form.set('grant_type', 'client_credentials');
  form.set('client_secret_sign', client_secret_sign);
  form.set('type', type);
  
  if (type === 'SELLER' && accountId) {
    form.set('account_id', accountId);
  }

  const url = `${BASE_URL}/oauth2/token`;
  const result = await requestJson(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  // Print sanitized result
  const printable = result.json ?? result.text;
  if (result.json && result.json.access_token) {
    printable.access_token = maskToken(result.json.access_token);
  }

  console.log(`POST ${url}`);
  console.log(`status: ${result.status}`);
  console.log(printable);

  if (!result.ok) {
    throw new Error(`Token request failed (${result.status}). See output above.`);
  }

  if (!result.json?.access_token) {
    throw new Error('Token response missing access_token. See output above.');
  }

  return result.json.access_token;
}

async function lastChanged(args) {
  const token = process.env.NAVER_COMMERCE_ACCESS_TOKEN || (await getAccessToken());

  const from = args.from;
  const to = args.to;

  if (!from || !to) {
    throw new Error('Missing required args: --from=... --to=... (ISO-8601 with timezone recommended)');
  }

  const qs = new URLSearchParams();
  qs.set('from', from);
  qs.set('to', to);

  const url = `${BASE_URL}/pay-order/seller/product-orders/last-changed-statuses?${qs.toString()}`;
  const result = await requestJson(url, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  console.log(`GET ${url}`);
  console.log(`status: ${result.status}`);
  console.log(result.json ?? result.text);

  if (!result.ok) {
    throw new Error(`last-changed-statuses failed (${result.status}). See output above.`);
  }
}

async function productOrdersQuery(args) {
  const token = process.env.NAVER_COMMERCE_ACCESS_TOKEN || (await getAccessToken());

  // The exact schema may differ; we pass through a minimal body.
  // You can provide productOrderIds as comma-separated.
  const idsRaw = args.productOrderIds;
  if (!idsRaw) {
    throw new Error('Missing required arg: --productOrderIds=123,456');
  }

  const productOrderIds = String(idsRaw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const url = `${BASE_URL}/pay-order/seller/product-orders/query`;
  const body = {
    productOrderIds,
  };

  const result = await requestJson(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  console.log(`POST ${url}`);
  console.log(`status: ${result.status}`);
  console.log(result.json ?? result.text);

  if (!result.ok) {
    throw new Error(`product-orders/query failed (${result.status}). See output above.`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];

  if (!cmd || args.help) {
    printHelp();
    process.exit(0);
  }

  try {
    if (cmd === 'token') {
      const token = await getAccessToken();
      console.log(`access_token: ${maskToken(token)}`);
      return;
    }

    if (cmd === 'lastChanged') {
      await lastChanged(args);
      return;
    }

    if (cmd === 'query') {
      await productOrdersQuery(args);
      return;
    }

    console.error(`Unknown command: ${cmd}`);
    printHelp();
    process.exit(1);
  } catch (err) {
    console.error(String(err?.message || err));
    process.exit(1);
  }
}

await main();
