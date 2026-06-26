const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PRICES_FILE = path.join(__dirname, '../data/prices.json');

const PRODUCTS = [
  { barcode: '8410261112121', productId: '4611686018617206964', externalId: '2272614', name: 'Casta Negra White Wine' },
  { barcode: '8410261112008', productId: '4611686018617206947', externalId: '2272615', name: 'Casta Negra Red Wine' },
  { barcode: '8410261101071', productId: '4611686018617207789', externalId: '2272616', name: 'Opera Prima Cabernet' },
  { barcode: '8410261101118', productId: '4611686018617206952', externalId: '2272617', name: 'Opera Prima Chardonnay' },
  { barcode: '9100300200467', productId: '4611686018630962579', externalId: '2273788', name: 'Il Barone Red Wine' },
  { barcode: '3222477739123', productId: '4611686018630962580', externalId: '2273789', name: 'Bordeaux Red Wine' },
  { barcode: '8015920372498', productId: '4611686018630962577', externalId: '2273790', name: 'Pinot Grigio' },
  { barcode: '9100300001170', productId: '4611686018630962578', externalId: '2273791', name: 'Il Barone Rose Wine' },
];

const STORE_ID = 26609;
const ADDRESS_ID = 704713;

function loadExisting() {
  try {
    return JSON.parse(fs.readFileSync(PRICES_FILE, 'utf8'));
  } catch {
    return { prices: {}, updatedAt: null };
  }
}

function alreadyUpdatedToday(data) {
  if (!data.updatedAt) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (data.updatedAt.slice(0, 10) !== today) return false;
  // Only skip if all products already have a price
  return PRODUCTS.every(p => data.prices[p.barcode]);
}

async function scrapePrice(context, product) {
  const page = await context.newPage();
  let price = null;

  await new Promise(async (resolve) => {
    let done = false;

    const finish = async () => {
      if (done) return;
      done = true;
      await page.close().catch(() => {});
      resolve();
    };

    const timer = setTimeout(finish, 20000);

    page.on('response', async (response) => {
      if (done) return;
      if (!response.url().includes(`/products/${product.productId}/view`)) return;
      try {
        const json = await response.json();
        const elements = json?.data?.body?.data?.elements || [];
        for (const el of elements) {
          if (el.type === 'TEXT' && el.data?.styles?.type === 'PRIMARY_BOLD_18') {
            price = el.data.text;
            break;
          }
        }
      } catch {}
      clearTimeout(timer);
      finish();
    });

    await page.goto(
      `https://glovoapp.com/ka/ge/tbilisi/stores/spar-tbi?productId=${product.productId}&externalProductId=${product.externalId}`,
      { waitUntil: 'domcontentloaded', timeout: 15000 }
    ).catch(() => {});
  });

  return price;
}

(async () => {
  const existing = loadExisting();

  if (alreadyUpdatedToday(existing)) {
    console.log('Prices already updated today, skipping.');
    process.exit(0);
  }

  console.log(`Starting price scrape at ${new Date().toISOString()}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ka-GE',
  });

  const prices = { ...existing.prices };
  let updated = 0;
  let failed = 0;

  for (const product of PRODUCTS) {
    process.stdout.write(`  ${product.name}... `);
    const price = await scrapePrice(context, product);

    if (price) {
      prices[product.barcode] = price;
      updated++;
      console.log(`✓ ${price}`);
    } else {
      failed++;
      console.log(`✗ failed (keeping: ${prices[product.barcode] || 'none'})`);
    }
  }

  await browser.close();

  const output = {
    prices,
    updatedAt: new Date().toISOString(),
    stats: { updated, failed, total: PRODUCTS.length },
  };

  fs.mkdirSync(path.dirname(PRICES_FILE), { recursive: true });
  fs.writeFileSync(PRICES_FILE, JSON.stringify(output, null, 2));

  console.log(`\nDone: ${updated}/${PRODUCTS.length} updated, ${failed} failed.`);
  console.log(`Saved to ${PRICES_FILE}`);

  if (failed === PRODUCTS.length) {
    console.error('All prices failed — marking as failed for retry.');
    process.exit(1);
  }
})();
