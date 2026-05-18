/**
 * Netlify Function: getShipping
 * Fetches live courier quotes from The Courier Guy API.
 *
 * Required env vars (set in Netlify dashboard → Site Settings → Env Vars):
 *   TCG_API_USER     — your TCG API username
 *   TCG_API_PASS     — your TCG API password
 *   SHOP_POSTAL_CODE — roastery postcode, e.g. "2196"
 *   SHOP_SUBURB      — roastery suburb, e.g. "Sandton"
 *
 * Get credentials: https://www.thecourierguy.co.za/developer-portal
 */

const TCG_BASE = 'https://api.thecourierguy.co.za/api';

// Fallback rates shown when TCG is unreachable
const FALLBACK = [
  { code: 'pudo',          label: 'PUDO Locker (TCG)',        amount: 60  },
  { code: 'door-gauteng',  label: 'Gauteng Door-to-Door',     amount: 100 },
  { code: 'door-national', label: 'Rest of SA Door-to-Door',  amount: 150 },
];

// Coffee bag dimensions (cm) and base weight (kg) per unit
const PARCEL_DIMS = { height: 8, width: 20, length: 28 };
const WEIGHT_MAP  = { '1kg': 1.1, '200g': 0.25, '80g': 0.12, default: 1.0 };

function buildParcels(cartItems, totalWeightKg) {
  const fromCart = (cartItems || []).reduce((sum, item) => {
    const key = Object.keys(WEIGHT_MAP).find(k => (item.size || '').toLowerCase().includes(k)) || 'default';
    return sum + WEIGHT_MAP[key] * (item.qty || 1);
  }, 0);
  const totalWeight = fromCart || parseFloat(totalWeightKg) || 1;

  return [{
    ...PARCEL_DIMS,
    weight: Math.max(0.1, parseFloat(totalWeight.toFixed(2))),
    quantity: 1,
    description: 'Coffee Beans',
  }];
}

function tcgAuth() {
  const { TCG_API_USER, TCG_API_PASS } = process.env;
  if (!TCG_API_USER || !TCG_API_PASS) return null;
  return 'Basic ' + Buffer.from(`${TCG_API_USER}:${TCG_API_PASS}`).toString('base64');
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Bad JSON' }) };
  }

  const { destination = {}, cartItems = [], subtotal = 0, totalWeightKg } = body;

  // Validate we have enough address info to get a real quote
  const hasAddress = destination.postalCode && (destination.suburb || destination.city);

  if (!hasAddress || !tcgAuth()) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ quotes: applyFreeShipping(FALLBACK, subtotal), source: 'fallback' }),
    };
  }

  const payload = {
    CollectionAddress: {
      PostCode: process.env.SHOP_POSTAL_CODE || '2196',
      Suburb:   process.env.SHOP_SUBURB       || 'Sandton',
    },
    DeliveryAddress: {
      PostCode: destination.postalCode.trim(),
      Suburb:   (destination.suburb || destination.city || '').trim(),
    },
    Parcels: buildParcels(cartItems, totalWeightKg),
    OptionalInsuranceAmount: 0,
  };

  try {
    const res = await fetch(`${TCG_BASE}/Quote/GetCouriersQuote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: tcgAuth(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`TCG ${res.status}`);

    const data = await res.json();
    const quotes = mapTcgQuotes(data, subtotal);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ quotes, source: 'tcg_live' }),
    };
  } catch (err) {
    console.error('TCG quote error:', err.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ quotes: applyFreeShipping(FALLBACK, subtotal), source: 'fallback' }),
    };
  }
};

/** Map TCG quote response → our uniform format */
function mapTcgQuotes(tcgData, subtotal) {
  const services = Array.isArray(tcgData) ? tcgData : (tcgData?.Services || []);
  if (!services.length) return applyFreeShipping(FALLBACK, subtotal);

  const mapped = services.map(s => {
    const amount = parseFloat(s.Rate || s.Price || s.Total || 0);
    return {
      code:   (s.ServiceCode || s.Code || '').toLowerCase().replace(/\s+/g, '-'),
      label:  s.ServiceName || s.Name || 'TCG Delivery',
      amount: parseFloat(amount.toFixed(2)),
      eta:    s.DeliveryDays ? `${s.DeliveryDays} business days` : null,
    };
  }).filter(q => q.amount > 0);

  // Always prepend PUDO option if not returned by API
  const hasPudo = mapped.some(q => q.code.includes('pudo') || q.label.toLowerCase().includes('pudo'));
  if (!hasPudo) {
    mapped.unshift({ code: 'pudo', label: 'PUDO Locker (TCG)', amount: 60 });
  }

  return applyFreeShipping(mapped.sort((a, b) => a.amount - b.amount), subtotal);
}

/** Reserve tier perk: free shipping on orders over R800 */
function applyFreeShipping(quotes, subtotal) {
  if (subtotal >= 800) {
    return quotes.map(q => ({ ...q, amount: 0, label: q.label + ' — FREE' }));
  }
  return quotes;
}
