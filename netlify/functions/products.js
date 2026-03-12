/* ============================================================
   CHEDDERS STORE — Netlify Function: products.js
   Path: .netlify/functions/products.js

   Storage: Netlify Blobs (persistent — survives redeploys)

   GET  → returns all products from Blobs
   POST → handles add / update / delete actions

   shop.js fetches from:
     /.netlify/functions/products  (GET)

   Admin POSTs to:
     /.netlify/functions/products  (POST)
============================================================ */

const { getStore } = require('@netlify/blobs');

/* ── CORS headers ── */
const HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

const BLOB_KEY = 'products';

/* ── Helper: get Blobs store ── */
function getProductsStore(context) {
  return getStore({
    name: 'chedders-store',
    consistency: 'strong',
    ...context,
  });
}

/* ── Helper: read products from Blobs ── */
async function readProducts(context) {
  const store = getProductsStore(context);
  const raw   = await store.get(BLOB_KEY, { type: 'text' });
  if (!raw) return [];
  return JSON.parse(raw);
}

/* ── Helper: write products to Blobs ── */
async function writeProducts(products, context) {
  const store = getProductsStore(context);
  await store.set(BLOB_KEY, JSON.stringify(products));
}

/* ── Main handler ── */
exports.handler = async function(event, context) {

  /* Handle preflight */
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  /* ── GET: return all products ── */
  if (event.httpMethod === 'GET') {
    try {
      const products = await readProducts(context);
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(products),
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({ error: 'Failed to read products', detail: err.message }),
      };
    }
  }

  /* ── POST: mutate products ── */
  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const { action, product, id } = body;

    try {
      let products = await readProducts(context);

      /* ── SEED: first time load from products.json data ── */
      if (action === 'seed') {
        if (!Array.isArray(body.products)) {
          return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Missing products array' }) };
        }
        await writeProducts(body.products, context);
        return {
          statusCode: 200,
          headers: HEADERS,
          body: JSON.stringify({ success: true, seeded: body.products.length }),
        };
      }

      /* ── ADD ── */
      if (action === 'add') {
        if (!product) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Missing product' }) };

        /* Auto-assign ID if not set or collides */
        if (!product.id || products.find(p => p.id === product.id)) {
          const maxId = products.reduce((m, p) => Math.max(m, p.id || 0), 0);
          product.id = maxId + 1;
        }

        products.push(product);
        products.sort((a, b) => (a.position || 999) - (b.position || 999));
        await writeProducts(products, context);
        return {
          statusCode: 201,
          headers: HEADERS,
          body: JSON.stringify({ success: true, product, total: products.length }),
        };
      }

      /* ── UPDATE ── */
      if (action === 'update') {
        if (!product || !product.id) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Missing product or id' }) };

        const idx = products.findIndex(p => p.id === product.id);
        if (idx === -1) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Product not found' }) };

        products[idx] = product;
        products.sort((a, b) => (a.position || 999) - (b.position || 999));
        await writeProducts(products, context);
        return {
          statusCode: 200,
          headers: HEADERS,
          body: JSON.stringify({ success: true, product }),
        };
      }

      /* ── DELETE ── */
      if (action === 'delete') {
        const targetId = id || (product && product.id);
        if (!targetId) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Missing id' }) };

        const before = products.length;
        products = products.filter(p => p.id !== targetId);
        if (products.length === before) {
          return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Product not found' }) };
        }
        await writeProducts(products, context);
        return {
          statusCode: 200,
          headers: HEADERS,
          body: JSON.stringify({ success: true, deleted: targetId, total: products.length }),
        };
      }

      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Unknown action: ' + action }) };

    } catch (err) {
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({ error: 'Server error', detail: err.message }),
      };
    }
  }

  return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
};
