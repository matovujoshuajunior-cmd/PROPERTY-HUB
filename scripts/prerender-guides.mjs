#!/usr/bin/env node
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

const formatPrice = a => Number(a || 0).toLocaleString('en-UG') + ' UGX';

function buildListingCard(l) {
  const locality = (l.address || 'Uganda').split(',')[0].trim();
  const typeLabel = l.property_type === 'rental' ? 'for Rent'
                  : l.property_type === 'guesthouse' ? 'Guesthouse'
                  : 'for Sale';
  const alt = `${l.title || 'Property'} ${typeLabel} in ${locality}, Uganda — ${formatPrice(l.price_amount)} on Property Hub`;
  const img = (l.media_urls && l.media_urls[0]) || 'https://propertyhub.dpdns.org/og-cover.jpg';
  return `<article class="listing-card">
      <img src="${img}" alt="${alt.replace(/"/g, '&quot;')}" loading="lazy" width="400" height="160" />
      <div class="listing-body">
        <h3>${l.title || 'Property'}</h3>
        <p class="price">${formatPrice(l.price_amount)}</p>
        <p class="location">${l.address || 'Location not specified'}</p>
        <a href="https://propertyhub.dpdns.org/property/${l.id}" class="btn">View details →</a>
      </div>
    </article>`;
}

function buildOfferSchema(l) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: l.title || 'Property',
    description: l.title || '',
    image: l.media_urls?.[0] || '',
    offers: {
      '@type': 'Offer',
      price: l.price_amount || 0,
      priceCurrency: 'UGX',
      availability: 'https://schema.org/InStock',
      url: `https://propertyhub.dpdns.org/property/${l.id}`
    },
    areaServed: { '@type': 'Place', name: (l.address || 'Uganda').split(',')[0].trim() }
  };
}

async function main() {
  console.log('🚀 Fetching listings from Supabase…');
  const { data: listings, error } = await supabase
    .from('properties').select('*').eq('is_paused', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  console.log(`   ${listings.length} active listings`);

  // ─── Guides ───
  for (const [slug, keywords] of Object.entries(GUIDE_KEYWORDS)) {
    const matching = listings.filter(l => {
      const text = `${l.title || ''} ${l.address || ''}`.toLowerCase();
      return keywords.some(k => text.includes(k));
    });
    console.log(`📄 ${slug}: ${matching.length} listings`);

    const cardsHtml = matching.length
      ? matching.map(buildListingCard).join('\n')
      : `<p class="empty-state">No listings yet in this area. <a href="https://propertyhub.dpdns.org/">Browse all properties →</a></p>`;

    const offerSchema = matching.map(l =>
      `<script type="application/ld+json">${JSON.stringify(buildOfferSchema(l))}</script>`
    ).join('\n');

    const templatePath = path.join(process.cwd(), 'guides', slug, 'template.html');
    if (!fs.existsSync(templatePath)) {
      console.warn(`⚠️  Skipping ${slug}: template.html not found`);
      continue;
    }
    let html = fs.readFileSync(templatePath, 'utf8');
    html = html.replace('<!-- LISTING_CARDS -->', cardsHtml);
    html = html.replace('<!-- OFFER_SCHEMA -->', offerSchema);
    fs.writeFileSync(path.join(process.cwd(), 'guides', slug, 'index.html'), html);
    console.log(`   ✅ guides/${slug}/index.html`);
  }

  // ─── Homepage top 6 ───
  const top = listings.slice(0, 6);
  if (top.length) {
    const topCards = top.map(buildListingCard).join('\n');
    const indexPath = path.join(process.cwd(), 'index.html');
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf8');
      html = html.replace(
        /<!-- PRERENDERED_LISTINGS_START -->[\s\S]*?<!-- PRERENDERED_LISTINGS_END -->/,
        `<!-- PRERENDERED_LISTINGS_START -->\n${topCards}\n            <!-- PRERENDERED_LISTINGS_END -->`
      );
      fs.writeFileSync(indexPath, html);
      console.log(`✅ Injected ${top.length} listings into index.html`);
    }
  }
  console.log('🎉 Done.');
}

main().catch(err => { console.error('❌', err); process.exit(1); });
