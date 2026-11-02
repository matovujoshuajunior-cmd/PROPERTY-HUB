// scripts/prerender-guides.mjs
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Map each guide slug to the keywords that should appear in a listing’s
// title or address to be included on that page.
const GUIDE_KEYWORDS = {
  'single-rooms-near-makerere': ['kikoni', 'katanga', 'wandegeya', 'mulago', 'makerere'],
  'hostels-near-mulago':        ['mulago'],
  'cheap-rooms-kikoni':         ['kikoni'],
  'rooms-wandegeya':            ['wandegeya'],
  'student-hostels-katanga':    ['katanga'],
  'apartments-naalya':          ['naalya'],
  'apartments-ntinda':          ['ntinda'],
  'rentals-bukoto':             ['bukoto'],
  'bungalows-kisaasi':          ['kisaasi'],
  'guesthouses-entebbe-airport':['entebbe']
};

function formatPrice(amount) {
  return Number(amount || 0).toLocaleString('en-UG') + ' UGX';
}

function buildListingCard(listing) {
  const locality = (listing.address || 'Uganda').split(',')[0].trim();
  const typeLabel = listing.property_type === 'rental'
    ? 'for Rent'
    : listing.property_type === 'guesthouse'
      ? 'Guesthouse'
      : 'for Sale';
  const altText = `${listing.title || 'Property'} ${typeLabel} in ${locality}, Uganda — ${formatPrice(listing.price_amount)} on Property Hub`;

  const imageUrl = (listing.media_urls && listing.media_urls[0])
    ? listing.media_urls[0]
    : 'https://propertyhub.dpdns.org/og-cover.jpg';

  return `
    <article class="listing-card">
      <img src="${imageUrl}" alt="${altText.replace(/"/g, '&quot;')}" loading="lazy" />
      <div class="listing-body">
        <h3>${listing.title || 'Property'}</h3>
        <p class="price">${formatPrice(listing.price_amount)}</p>
        <p class="location">${listing.address || 'Location not specified'}</p>
        <a href="https://propertyhub.dpdns.org/property/${listing.id}" class="btn">View details →</a>
      </div>
    </article>
  `;
}

function buildOfferSchema(listing) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title || 'Property',
    description: listing.title || '',
    image: listing.media_urls?.[0] || '',
    offers: {
      '@type': 'Offer',
      price: listing.price_amount || 0,
      priceCurrency: 'UGX',
      availability: 'https://schema.org/InStock',
      url: `https://propertyhub.dpdns.org/property/${listing.id}`
    },
    areaServed: {
      '@type': 'Place',
      name: (listing.address || 'Uganda').split(',')[0].trim()
    }
  };
}

async function main() {
  console.log('🚀 Fetching listings from Supabase…');
  const { data: listings, error } = await supabase
    .from('properties')
    .select('*')
    .eq('is_paused', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!listings.length) {
    console.warn('⚠️  No listings found — guide pages will contain a helpful empty-state message.');
  }

  for (const [slug, keywords] of Object.entries(GUIDE_KEYWORDS)) {
    const matching = listings.filter(l => {
      const text = `${l.title} ${l.address}`.toLowerCase();
      return keywords.some(k => text.includes(k));
    });

    console.log(`📄 ${slug}: ${matching.length} listings`);

    const cardsHtml = matching.length
      ? matching.map(buildListingCard).join('')
      : `<p class="empty-state">No listings yet in this area. <a href="https://propertyhub.dpdns.org/">Browse all properties →</a></p>`;

    const schemaBlocks = matching.map(l => `
      <script type="application/ld+json">${JSON.stringify(buildOfferSchema(l))}</script>
    `).join('');

    const templatePath = path.join(process.cwd(), 'guides', slug, 'template.html');
    if (!fs.existsSync(templatePath)) {
      console.warn(`⚠️  Skipping ${slug}: template.html not found at ${templatePath}`);
      continue;
    }

    let html = fs.readFileSync(templatePath, 'utf8');
    html = html.replace('<!-- LISTING_CARDS -->', cardsHtml);
    html = html.replace('<!-- OFFER_SCHEMA -->', schemaBlocks);

    const outputDir = path.join(process.cwd(), 'guides', slug);
    fs.writeFileSync(path.join(outputDir, 'index.html'), html);
    console.log(`✅ Wrote ${slug}/index.html`);
  }

  console.log('🎉 Done.');
}

main().catch(err => {
  console.error('❌ Prerender failed:', err);
  process.exit(1);
});
