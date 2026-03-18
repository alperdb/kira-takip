/**
 * Creates a GitHub Release and uploads the portable ZIP as an asset.
 * Requires GITHUB_TOKEN in .env.release (never committed — .env* is gitignored).
 *
 * Usage: node scripts/github-release.js
 * Called automatically by: npm run release
 */

const https   = require('https');
const fs      = require('fs');
const path    = require('path');

// Load .env.release for GITHUB_TOKEN
const envFile = path.join(__dirname, '..', '.env.release');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...rest] = line.trim().split('=');
    if (k && rest.length) process.env[k] = rest.join('=').replace(/^["']|["']$/g, '');
  }
}

const TOKEN   = process.env.GITHUB_TOKEN;
const OWNER   = 'alperdb';
const REPO    = 'kira-takip';
const { version } = require('../package.json');
const TAG     = `v${version}`;
const ZIPNAME = `KiraTakip-v${version}-portable.zip`;
const ZIPPATH = path.join(__dirname, '..', 'dist', ZIPNAME);

if (!TOKEN) {
  console.error('\nERROR: GITHUB_TOKEN not set.');
  console.error('Create .env.release in the project root with:');
  console.error('  GITHUB_TOKEN=your_token_here\n');
  process.exit(1);
}

if (!fs.existsSync(ZIPPATH)) {
  console.error(`\nERROR: ZIP not found at ${ZIPPATH}`);
  console.error('Run npm run release to build first.\n');
  process.exit(1);
}

function apiRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'User-Agent':    'kiratakip-release-script',
        'Accept':        'application/vnd.github+json',
        'Content-Type':  'application/json',
        ...(options.headers || {}),
      },
      ...options,
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

function uploadAsset(uploadUrl, filePath, filename) {
  // uploadUrl looks like: https://uploads.github.com/repos/.../releases/{id}/assets{?name,label}
  const base = uploadUrl.replace(/\{.*\}/, '');
  const url  = new URL(`${base}?name=${encodeURIComponent(filename)}`);

  return new Promise((resolve, reject) => {
    const fileData = fs.readFileSync(filePath);
    const req = https.request({
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method:   'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'User-Agent':    'kiratakip-release-script',
        'Accept':        'application/vnd.github+json',
        'Content-Type':  'application/zip',
        'Content-Length': fileData.length,
      },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(fileData);
    req.end();
  });
}

async function run() {
  console.log(`\nCreating GitHub Release ${TAG} for ${OWNER}/${REPO}...`);

  // Check if release already exists
  const existing = await apiRequest({ path: `/repos/${OWNER}/${REPO}/releases/tags/${TAG}`, method: 'GET' });

  let releaseId;
  let uploadUrl;

  if (existing.status === 200) {
    console.log(`  Release ${TAG} already exists — deleting and recreating...`);
    await apiRequest({ path: `/repos/${OWNER}/${REPO}/releases/${existing.body.id}`, method: 'DELETE' });

    // Also delete the tag so we can recreate it cleanly
    await apiRequest({ path: `/repos/${OWNER}/${REPO}/git/refs/tags/${TAG}`, method: 'DELETE' });
  }

  // Create release
  const created = await apiRequest(
    { path: `/repos/${OWNER}/${REPO}/releases`, method: 'POST' },
    {
      tag_name:         TAG,
      target_commitish: 'main',
      name:             `KiraTakip ${TAG}`,
      body:             `## Kurulum\n\n1. \`${ZIPNAME}\` dosyasını indirin\n2. ZIP'i çıkarın\n3. \`Kira Takip.exe\` dosyasını çalıştırın\n\nKurulum gerektirmez. Veriler yerel bilgisayarda saklanır.`,
      draft:            false,
      prerelease:       false,
    }
  );

  if (created.status !== 201) {
    console.error('  Failed to create release:', JSON.stringify(created.body, null, 2));
    process.exit(1);
  }

  releaseId = created.body.id;
  uploadUrl = created.body.upload_url;
  console.log(`  Release created: ${created.body.html_url}`);

  // Upload ZIP
  const sizeMb = (fs.statSync(ZIPPATH).size / 1_048_576).toFixed(1);
  console.log(`  Uploading ${ZIPNAME} (${sizeMb} MB)...`);

  const uploaded = await uploadAsset(uploadUrl, ZIPPATH, ZIPNAME);

  if (uploaded.status !== 201) {
    console.error('  Upload failed:', JSON.stringify(uploaded.body, null, 2));
    process.exit(1);
  }

  console.log(`  Asset uploaded: ${uploaded.body.browser_download_url}`);
  console.log(`\nRelease ${TAG} published successfully.`);
  console.log(`URL: ${created.body.html_url}\n`);
}

run().catch(err => { console.error(err); process.exit(1); });
