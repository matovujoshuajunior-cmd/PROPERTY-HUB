#!/usr/bin/env node
// scripts/prerender-homepage.mjs — HARDENED VERSION
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

// ⛔ HARD FAIL: never silently skip
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ FATAL: SUPABASE_URL or SUPABASE_ANON_KEY is missing.');
  console.error('   The build would deploy an EMPTY site. Refusing to continue.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function formatPrice(n) { return Number(n || 0).toLocaleString('en-UG') + ' UGX'; }
function titleCase(s) {
  if (!s) return '';
  const small = new Set(['a','an','and','as','at','but','by','for','in','of','on','or','the','to','v','via','vs','with','from','into','under','over']);
  return String(s).replace(/\b[a-zA-Z]+\b/g, (w, o) => {
    if (/^[A-Z]{2,}$/.test(w)) return w;
    const l = w.toLowerCase();
    if (o > 0 && small.has(l)) return l;
    return l.charAt(0).toUpperCase() + l.slice(1);
  });
}
function getImageArray(p) {
  if (!p.media_urls) return [];
  let a = p.media_urls;
  if (typeof a === 'string') { try { const q = JSON.parse(a); if (Array.isArray(q)) return q; } catch (_) {} return [a]; }
  return Array.isArray(a) ? a : [a];
}
function formatType(t) { return t === 'rental' ? 'For Rent' : t === 'property' ? 'For Sale' : t === 'guesthouse' ? 'Guesthouse' : 'Property'; }
function buildDescription(p) {
  if (p.description && String(p.description).trim().length >= 50) return String(p.description).trim();
  const loc = (p.address || 'Kampala').split(',')[0].trim();
  return titleCase(p.title || 'Property') + ' — a verified ' + (p.property_type === 'rental' ? 'rental property' : p.property_type === 'guesthouse' ? 'guesthouse' : 'property for sale') + ' in ' + loc + ', Uganda. Listed at ' + formatPrice(p.price_amount) + ' on Property Hub.';
}
function buildCard(p) {
  const img = getImageArray(p)[0] || '/og-cover.jpg';
  const loc = (p.address || 'Uganda').split(',')[0].trim();
  const title = titleCase(p.title || 'Property');
  const type = formatType(p.property_type);
  const alt = `${title} ${type.toLowerCase()} in ${loc}, Uganda — ${formatPrice(p.price_amount)} on Property Hub`;
  const desc = buildDescription(p);
  const verified = p.verification_status === 'approved' ? '<span style="position:absolute;top:.75rem;right:.75rem;background:#10b981;color:#fff;font-size:.5rem;font-weight:700;padding:.25rem .5rem;border-radius:9999px;">✓ VERIFIED</span>' : '';
  return `<article class="property-card" id="property-${p.id}">
  <div class="property-card__image">
    <img src="${img}" alt="${alt.replace(/"/g, '&quot;')}" loading="lazy" width="600" height="450" />
    <span class="property-card__type">${type}</span>${verified}
  </div>
  <div class="property-card__body">
    <h3 class="property-card__title"><a href="/property/${p.id}">${title}</a></h3>
    <p class="property-card__price">${formatPrice(p.price_amount)}</p>
    <p class="property-card__location"><i class="fas fa-map-pin" style="color:#94a3b8;"></i> ${p.address || 'Location not specified'}</p>
    <p class="property-card__desc">${desc}</p>
    <div class="property-card__footer">
      <span style="font-size:.75rem;color:#64748b;"><i class="fas fa-user-circle" style="color:#94a3b8;"></i> Property Hub</span>
      <a href="/property/${p.id}" class="property-card__cta">View Details →</a>
    </div>
  </div>
</article>`.trim();
}

async function main() {
  console.log('🚀 Fetching listings for prerender…');
  const { data, error } = await supabase
    .from('properties')
    .select('id, title, price_amount, property_type, address, media_urls, verification_status, is_paused, description')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('❌ FATAL: Supabase query failed:', error.message);
    process.exit(1);
  }

  const active = (data || []).filter(p => p.is_paused !== true);

  // ⛔ HARD FAIL: never deploy an empty homepage
  if (active.length === 0) {
    console.error('❌ FATAL: 0 active listings returned from Supabase.');
    console.error('   Likely causes:');
    console.error('   1. RLS blocks anon SELECT on public.properties');
    console.error('   2. All properties have is_paused = true');
    console.error('   3. The properties table is empty');
    console.error('   The build would deploy an EMPTY site. Refusing to continue.');
    process.exit(1);
  }

  console.log(`   Found ${active.length} active listings`);
  const cards = active.slice(0, 24).map(buildCard).join('\n');
  const noscript = active.map(p => `<li><a href="/property/${p.id}"><strong>${titleCase(p.title)}</strong></a> — ${formatPrice(p.price_amount)} — ${(p.address || 'Kampala').split(',')[0]}</li>`).join('\n');

  const file = path.join(process.cwd(), 'index.html');
  let html = fs.readFileSync(file, 'utf8');

  // Replace the loading fallback so Google's Wave 1 sees real content
  html = html.replace(
    /<!-- PRERENDERED_LISTINGS_START -->[\s\S]*?<!-- PRERENDERED_LISTINGS_END -->/,
    `<!-- PRERENDERED_LISTINGS_START -->\n${cards}\n<!-- PRERENDERED_LISTINGS_END -->`
  );

  // Replace the noscript fallback with real listing links
  html = html.replace(
    /<noscript>[\s\S]*?<\/noscript>/,
    `<noscript><div style="padding:1rem;background:#fff;border-radius:1rem;"><h2>Browse Listings</h2><ul>${noscript}</ul></div></noscript>`
  );

  // ⛔ HARD FAIL: confirm the injection actually happened
  if (!html.includes('class="property-card"')) {
    console.error('❌ FATAL: Prerender markers not found in index.html.');
    console.error('   Check that index.html contains: <!-- PRERENDERED_LISTINGS_START --> and <!-- PRERENDERED_LISTINGS_END -->');
    process.exit(1);
  }

  fs.writeFileSync(file, html);
  console.log(`✅ Injected ${Math.min(active.length, 24)} cards + ${active.length} noscript links`);
  console.log('   Verify with: curl -s http://localhost:3000/ | grep -c "property-card__title"');
}

main().catch(e => { console.error('❌ FATAL:', e); process.exit(1); });
