// One-time Stripe product + price creation. Run after first install.
//   npm run stripe:setup
// Reads STRIPE_SECRET_KEY from .env.local, creates the product + a price,
// and prints the price ID to paste into .env.local as STRIPE_PRICE_ID.
require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

const PRODUCT_NAME    = 'PCFixScan License';
const PRODUCT_DESC    = 'Monthly subscription — Mac & Windows';
const PRICE_AMOUNT    = 1999;   // $19.99/month
const PRICE_CURRENCY  = 'usd';
const RECURRING       = { interval: 'month', interval_count: 1 };

(async () => {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) { console.error('✗ STRIPE_SECRET_KEY missing in .env.local'); process.exit(1); }

  const stripe = new Stripe(sk);

  // Reuse existing product if one with the same name already exists
  const existing = await stripe.products.search({ query: `name:'${PRODUCT_NAME}'` });
  let product = existing.data[0];

  if (!product) {
    product = await stripe.products.create({ name: PRODUCT_NAME, description: PRODUCT_DESC });
    console.log(`✓ Created product:    ${product.id}`);
  } else {
    console.log(`→ Using existing product: ${product.id}`);
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 5 });
  let price = prices.data.find(p =>
    p.unit_amount === PRICE_AMOUNT &&
    p.currency === PRICE_CURRENCY &&
    p.recurring?.interval === RECURRING.interval
  );

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: PRICE_AMOUNT,
      currency: PRICE_CURRENCY,
      recurring: RECURRING,
    });
    console.log(`✓ Created subscription price: ${price.id}`);
  } else {
    console.log(`→ Using existing price:       ${price.id}`);
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Add this to .env.local AND Vercel env:`);
  console.log('');
  console.log(`STRIPE_PRICE_ID=${price.id}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
})().catch(err => { console.error('✗', err.message); process.exit(1); });
