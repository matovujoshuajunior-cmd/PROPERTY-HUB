#!/usr/bin/env node
// scripts/prerender-homepage.mjs
// Run BEFORE deploying: node scripts/prerender-homepage.mjs
// Requires: SUPABASE_URL and SUPABASE_ANON_KEY env vars

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

function formatPrice(n) { return Number(n || 0).toLocaleString('en-UG') + ' UGX'; }
function titleCase(str) {
  if (!str) return '';
  const small = new Set(['a','an','and','as','at','but','by','for','in','of','on','or','the','to','v','via','vs','with','from','into','under','over']);
  return String(str).replace(/\b[a-zA-Z]+\b/g, (word, offset) => {
    if (/^[A-Z]{2,}$/.test(word)) return word;
    const lower = word.toLowerCase();
    if (offset > 0 && small.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
}
function getImageArray(p) {
  if (!p.media_urls) return [];
  let arr = p.media_urls;
  if (typeof arr === 'string') {
    try { const parsed = JSON.parse(arr); if (Array.isArray(parsed)) return parsed; } catch (_) {}
    return [arr];
  }
  return Array.isArray(arr) ? arr : [arr];
}
function formatType(type) {
  if (type === 'rental') return 'For Rent';
  if (type === 'property') return 'For Sale';
  if (type === 'guesthouse') return 'Guesthouse';
  return 'Property';
}
function buildDescription(p) {
  if (p.description && String(p.description).trim().length > 10) return String(p.description).trim();
  const locality = (p.address || 'Kampala').split(',')[0].trim();
  const typeLong = p.property_type === 'rental' ? 'rental property' : p.property_type === 'guesthouse' ? 'guesthouse' : 'property for sale';
  return titleCase(p.title || 'Property') + ' — a verified ' + typeLong + ' in ' + locality + ', Uganda. Listed at ' + formatPrice(p.price_amount) + ' on Property Hub.';
}

function buildCard(p) {
  const imgUrl = getImageArray(p)[0] || '/og-cover.jpg';
  const locality = (p.address || 'Uganda').split(',')[0].trim();
  const title = titleCase(p.title || 'Property');
  const typeLabel = formatType(p.property_type);
  const altText = `${title} ${typeLabel.toLowerCase()} in ${locality}, Uganda — ${formatPrice(p.price_amount)} on Property Hub`;
  const desc = buildDescription(p);
  const verifiedBadge = p.verification_status === 'approved' ? '<span style="position:absolute;top:.75rem;right:.75rem;background:#10b981;color:#fff;font-size:.5rem;font-weight:700;padding:.25rem .5rem;border-radius:9999px;">✓ VERIFIED</span>' : '';

  return `
    <article class="property-card" id="property-${p.id}">
      <div class="property-card__image">
        <img src="${imgUrl}" alt="${altText.replace(/"/g, '&quot;')}" loading="lazy" width="600" height="450" />
        <span class="property-card__type">${typeLabel}</span>
        ${verifiedBadge}
      </div>
      <div class="property-card__body">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.25rem;">
          <h3 class="property-card__title"><a href="/property/${p.id}">${title}</a></h3>
        </div>
        <p class="property-card__price">${formatPrice(p.price_amount)}</p>
        <p class="property-card__location"><i class="fas fa-map-pin" style="color:#94a3b8;"></i> ${p.address || 'Location not specified'}</p>
        <p class="property-card__desc">${desc}</p>
        <div class="property-card__footer">
          <span style="font-size:.75rem;color:#64748b;display:flex;align-items:center;gap:.25rem;"><i class="fas fa-user-circle" style="color:#94a3b8;"></i> Property Hub</span>
          <a href="/property/${p.id}" class="property-card__cta">View Details →</a>
        </div>
      </div>
    </article>
  `.trim();
}

function buildNoscriptItem(p) {
  const locality = (p.address || 'Kampala').split(',')[0].trim();
  return `<li><a href="/property/${p.id}"><strong>${titleCase(p.title || 'Property')}</strong></a> — ${formatPrice(p.price_amount)} — ${locality} — ${buildDescription(p)}</li>`;
}

async function main() {
  console.log('🚀 Fetching listings for homepage prerender…');
  const { data: listings, error } = await supabase
    .from('properties')
    .select('id, title, price_amount, property_type, address, media_urls, verification_status, is_paused, description')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const active = (listings || []).filter(p => p.is_paused !== true);
  console.log(`   Found ${active.length} active listings`);

  const cardsHtml = active.length > 0
    ? active.slice(0, 24).map(buildCard).join('\n')
    : '<p style="grid-column:1/-1;color:#64748b;padding:2rem 0;text-align:center;">No properties currently listed. <a href="/brokers/">List yours free</a>.</p>';

  const noscriptHtml = active.length > 0
    ? active.map(buildNoscriptItem).join('\n')
    : '<li>No listings yet.</li>';

  const indexPath = path.join(process.cwd(), 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('❌ index.html not found');
    process.exit(1);
  }

  let html = fs.readFileSync(indexPath, 'utf8');

  // Replace prerendered listings block
  html = html.replace(
    /<!-- PRERENDERED_LISTINGS_START -->[\s\S]*?<!-- PRERENDERED_LISTINGS_END -->/,
    `<!-- PRERENDERED_LISTINGS_START -->\n          ${cardsHtml}\n          <!-- PRERENDERED_LISTINGS_END -->`
  );

  // Replace noscript content
  html = html.replace(
    /<noscript>[\s\S]*?<\/noscript>/,
    `<noscript>\n          <div style="margin-top:2rem;padding:1rem;background:#fff;border-radius:1rem;border:1px solid #e2e8f0;">\n            <h2 style="font-size:1.1rem;font-weight:700;color:#1e293b;margin-bottom:.5rem;">Browse Property Listings</h2>\n            <ul style="list-style:none;display:flex;flex-direction:column;gap:.5rem;margin-top:1rem;font-size:.875rem;">\n              ${noscriptHtml}\n            </ul>\n          </div>\n        </noscript>`
  );

  fs.writeFileSync(indexPath, html);
  console.log(`✅ Injected ${Math.min(active.length, 24)} property cards + ${active.length} noscript items into index.html`);
}

main().catch(err => {
  console.error('❌ Prerender failed:', err);
  process.exit(1);
});
