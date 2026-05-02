// One-time Stripe product + price creation. Run after first install.
//   npm run stripe:setup
// Reads STRIPE_SECRET_KEY from .env.local, creates the four tier products
// (Cleaner / Privacy / Performance / Bundle) plus their monthly prices,
// and prints the env var lines to paste into .env.local + Supabase secrets.
require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

const TIERS = [
  { id: 'cleaner',     env: 'STRIPE_PRICE_ID_CLEANER',     name: 'PCFixScan — Cleaner Pack',       desc: 'Junk, browser cache, duplicates, large files',           amount:  799 },
  { id: 'privacy',     env: 'STRIPE_PRICE_ID_PRIVACY',     name: 'PCFixScan — Privacy & Security', desc: 'Privacy cleaner, threat scanner, secure-delete',         amount:  999 },
  { id: 'performance', env: 'STRIPE_PRICE_ID_PERFORMANCE', name: 'PCFixScan — Performance Pack',   desc: 'Startup manager, performance optimizer, uninstaller, registry', amount:  999 },
  { id: 'bundle',      env: 'STRIPE_PRICE_ID_BUNDLE',      name: 'PCFixScan — All-in-One Bundle',  desc: 'Every scanner and cleaner, scheduled scans, priority support',   amount: 1999 },
];

const CURRENCY  = 'usd';
const RECURRING = { interval: 'month', interval_count: 1 };

async function ensureProduct(stripe, name, desc) {
  const existing = await stripe.products.search({ query: `name:'${name}'` });
  if (existing.data[0]) {
    console.log(`→ Using existing product: ${existing.data[0].id}  (${name})`);
    return existing.data[0];
  }
  const p = await stripe.products.create({ name, description: desc });
  console.log(`✓ Created product:        ${p.id}  (${name})`);
  return p;
}

async function ensurePrice(stripe, product, amount) {
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 20 });
  const match = prices.data.find(p =>
    p.unit_amount === amount &&
    p.currency === CURRENCY &&
    p.recurring?.interval === RECURRING.interval
  );
  if (match) {
    console.log(`→ Using existing price:   ${match.id}  ($${(amount / 100).toFixed(2)}/mo)`);
    return match;
  }
  const created = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: CURRENCY,
    recurring: RECURRING,
  });
  console.log(`✓ Created price:          ${created.id}  ($${(amount / 100).toFixed(2)}/mo)`);
  return created;
}

(async () => {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) { console.error('✗ STRIPE_SECRET_KEY missing in .env.local'); process.exit(1); }

  const stripe = new Stripe(sk);
  const results = [];

  for (const tier of TIERS) {
    const product = await ensureProduct(stripe, tier.name, tier.desc);
    const price   = await ensurePrice(stripe, product, tier.amount);
    results.push({ env: tier.env, priceId: price.id });
  }

  const envLines       = results.map(r => `${r.env}=${r.priceId}`).join('\n');
  const secretsCmdArgs = results.map(r => `${r.env}=${r.priceId}`).join(' \\\n  ');

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Add to .env.local AND Cloudflare Pages env:');
  console.log('');
  console.log(envLines);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Then push to Supabase Edge Functions:');
  console.log('');
  console.log(`supabase secrets set \\\n  ${secretsCmdArgs}`);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('After that, you can remove the legacy STRIPE_PRICE_ID once you have');
  console.log('confirmed checkout works for every tier.');
})().catch(err => { console.error('✗', err.message); process.exit(1); });
