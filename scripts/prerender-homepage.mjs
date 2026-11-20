#!/usr/bin/env node
// scripts/prerender-homepage.mjs
// Fetches live listings and injects into index.html
// NEVER exits 1 on empty data — only on truly fatal errors

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

console.log('🔧 Prerender starting');

if (!SUPABASE_URL) {
  console.error('❌ FATAL: SUPABASE_URL not set');
  process.exit(1);
}
if (!SUPABASE_KEY) {
  console.error('❌ FATAL: SUPABASE_ANON_KEY not set');
  process.exit(1);
}
console.log('   ✅ Secrets present (URL len=' + SUPABASE_URL.length + ', key len=' + SUPABASE_KEY.length + ')');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function titleCase(s) {
  if (!s) return '';
  const small = new Set(['a','an','and','as','at','but','by','for','in','of','on','or','the','to','v','via','vs','with','from','into','under','over']);
  return String(s).replace(/\b[a-zA-Z]+\b/g, function(w, o) {
    if (/^[A-Z]{2,}$/.test(w)) return w;
    const l = w.toLowerCase();
    if (o > 0 && small.has(l)) return l;
    return l.charAt(0).toUpperCase() + l.slice(1);
  });
}

function formatPrice(n) {
  return Number(n || 0).toLocaleString('en-UG') + ' UGX';
}

function getImageArray(p) {
  if (!p.media_urls) return [];
  let a = p.media_urls;
  if (typeof a === 'string') {
    try { const q = JSON.parse(a); if (Array.isArray(q)) return q; } catch (_) {}
    return [a];
  }
  return Array.isArray(a) ? a : [a];
}

function formatType(t) {
  return t === 'rental' ? 'For Rent' : t === 'property' ? 'For Sale' : t === 'guesthouse' ? 'Guesthouse' : 'Property';
}

function buildDescription(p) {
  if (p.description && String(p.description).trim().length >= 40) {
    return String(p.description).trim().substring(0, 200);
  }
  const loc = (p.address || 'Kampala').split(',')[0].trim();
  const type = p.property_type === 'rental' ? 'rental property' : p.property_type === 'guesthouse' ? 'guesthouse' : 'property for sale';
  return titleCase(p.title || 'Property') + ' — a verified ' + type + ' in ' + loc + ', Uganda. Listed at ' + formatPrice(p.price_amount) + ' on Property Hub.';
}

function buildCard(p) {
  const img = getImageArray(p)[0] || '/og-cover.jpg';
  const loc = (p.address || 'Uganda').split(',')[0].trim();
  const title = titleCase(p.title || 'Property');
  const type = formatType(p.property_type);
  const alt = title + ' ' + type.toLowerCase() + ' in ' + loc + ', Uganda — ' + formatPrice(p.price_amount);
  const desc = buildDescription(p);
  const verified = p.verification_status === 'approved' ? '<span class="property-card__verified">✓ VERIFIED</span>' : '';

  return '<article class="property-card">' +
    '<div class="property-card__image">' +
      '<img src="' + img + '" alt="' + alt.replace(/"/g, '&quot;') + '" loading="eager" width="600" height="450" />' +
      '<span class="property-card__type">' + type + '</span>' +
      verified +
    '</div>' +
    '<div class="property-card__body">' +
      '<h3 class="property-card__title"><a href="/property/' + p.id + '">' + title + '</a></h3>' +
      '<p class="property-card__price">' + formatPrice(p.price_amount) + '</p>' +
      '<p class="property-card__location">📍 ' + (p.address || 'Location not specified') + '</p>' +
      '<p class="property-card__desc">' + desc + '</p>' +
      '<div class="property-card__footer">' +
        '<span class="property-card__broker">🏢 Property Hub</span>' +
        '<a href="/property/' + p.id + '" class="property-card__cta">View Details →</a>' +
      '</div>' +
    '</div>' +
  '</article>';
}

function buildEmptyState() {
  return '<div style="grid-column:1/-1;text-align:center;padding:3rem 1rem;background:#fff;border:1px solid #e2e8f0;border-radius:1rem;">' +
    '<h3 style="font-size:1.15rem;font-weight:700;color:#1e293b;margin-bottom:.5rem;">New listings coming soon</h3>' +
    '<p style="color:#64748b;margin-bottom:1rem;">We are onboarding verified brokers across Kampala.</p>' +
    '<a href="/brokers/" style="display:inline-block;background:#4f46e5;color:#fff;padding:.65rem 1.25rem;border-radius:.65rem;font-weight:600;text-decoration:none;font-size:.85rem;">List your property →</a>' +
    '</div>';
}

async function main() {
  console.log('📡 Querying Supabase...');

  const { data, error } = await supabase
    .from('properties')
    .select('id, title, price_amount, property_type, address, media_urls, verification_status, is_paused, description, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('⚠️  Supabase query error:', error.message);
    console.error('   → RLS may be blocking. Deploying with empty state.');
    // Don't exit — deploy with empty state
  }

  const raw = data || [];
  const active = raw.filter(p => p.is_paused !== true);
  const approved = active.filter(p => p.verification_status === 'approved');
  const toShow = approved.length > 0 ? approved : active;

  console.log('   Raw rows:      ' + raw.length);
  console.log('   Active:        ' + active.length);
  console.log('   Approved:      ' + approved.length);
  console.log('   Will render:   ' + toShow.length);

  const cardsHtml = toShow.length > 0 ? toShow.slice(0, 24).map(buildCard).join('\n') : buildEmptyState();
  const noscriptHtml = toShow.length > 0
    ? toShow.map(p => '<li><a href="/property/' + p.id + '"><strong>' + titleCase(p.title) + '</strong></a> — ' + formatPrice(p.price_amount) + ' — ' + (p.address || 'Kampala').split(',')[0] + '</li>').join('\n')
    : '<li>No listings yet. <a href="/brokers/">List your property free</a>.</li>';

  const indexPath = path.join(process.cwd(), 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('❌ FATAL: index.html not found at ' + indexPath);
    process.exit(1);
  }

  let html = fs.readFileSync(indexPath, 'utf8');
  const beforeLen = html.length;

  if (!html.includes('<!-- PRERENDERED_LISTINGS_START -->')) {
    console.error('❌ FATAL: Missing <!-- PRERENDERED_LISTINGS_START --> marker');
    process.exit(1);
  }
  if (!html.includes('<!-- PRERENDERED_LISTINGS_END -->')) {
    console.error('❌ FATAL: Missing <!-- PRERENDERED_LISTINGS_END --> marker');
    process.exit(1);
  }
  console.log('   ✅ Markers found');

  html = html.replace(
    /<!-- PRERENDERED_LISTINGS_START -->[\s\S]*?<!-- PRERENDERED_LISTINGS_END -->/,
    '<!-- PRERENDERED_LISTINGS_START -->\n' + cardsHtml + '\n<!-- PRERENDERED_LISTINGS_END -->'
  );

  if (html.includes('<noscript id="listings-noscript">')) {
    html = html.replace(
      /<noscript id="listings-noscript">[\s\S]*?<\/noscript>/,
      '<noscript id="listings-noscript"><div style="padding:1rem;background:#fff;border-radius:1rem;border:1px solid #e2e8f0;max-width:1200px;margin:1rem auto;"><h2 style="font-size:1.1rem;font-weight:700;margin-bottom:.5rem;">Browse Listings</h2><ul style="list-style:none;display:flex;flex-direction:column;gap:.5rem;font-size:.875rem;">' + noscriptHtml + '</ul></div></noscript>'
    );
  }

  fs.writeFileSync(indexPath, html);
  const cardCount = (html.match(/class="property-card"/g) || []).length;
  console.log('✅ Injected ' + cardCount + ' card(s) into index.html');
  console.log('   ' + beforeLen + ' → ' + html.length + ' bytes');
  console.log('🎉 Prerender complete');
}

main().catch(function(err) {
  console.error('❌ FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
