#!/usr/bin/env node
// Atlassian careers parser (jobs-json-v1).
//
// Atlassian dropped its public Greenhouse board; its careers SPA now reads a
// custom JSON endpoint backed by iCIMS. That endpoint returns the full listing
// as a flat array, so no pagination is needed. Emits { jobs: [...] } on stdout
// for providers/local-parser.mjs. Fails soft: any error prints an empty list so
// the scan continues instead of aborting the whole run.
//
// Wired in portals.yml as:
//   parser: { command: node, script: scripts/parsers/atlassian-jobs.mjs }

const LISTINGS_URL = 'https://www.atlassian.com/endpoint/careers/listings';
const TIMEOUT_MS = 15_000;

async function main() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let raw;
  try {
    const res = await fetch(LISTINGS_URL, {
      signal: controller.signal,
      headers: { accept: 'application/json', 'user-agent': 'career-ops-scanner' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = await res.json();
  } finally {
    clearTimeout(timer);
  }

  const list = Array.isArray(raw) ? raw : [];
  const jobs = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const title = String(item.title || '').trim();
    const url = String(item.portalJobPost?.portalUrl || '').trim();
    if (!title || !url) continue;
    jobs.push({
      title,
      url,
      company: 'Atlassian',
      location: Array.isArray(item.locations) ? item.locations.join(', ') : String(item.locations || ''),
    });
  }
  process.stdout.write(JSON.stringify({ jobs }));
}

main().catch((err) => {
  process.stderr.write(`atlassian-jobs parser: ${err?.message || err}\n`);
  process.stdout.write(JSON.stringify({ jobs: [] }));
});
