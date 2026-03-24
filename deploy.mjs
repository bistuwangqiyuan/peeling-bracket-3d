import { createReadStream, readdirSync, readFileSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { resolve, join } from 'path';

const SITE_ID = '4170d75d-fd66-41ce-874f-d2e4df189497';
const TOKEN = process.env.NETLIFY_AUTH_TOKEN;
const API = 'https://api.netlify.com/api/v1';
const DIR = '.';
const SKIP = new Set(['.git', '.cursor', 'node_modules', 'package-lock.json', 'deploy.mjs', 'generate-patent-docx.mjs', 'package.json']);

function collectFiles(dir, prefix, out) {
  for (const f of readdirSync(dir)) {
    if (f.startsWith('.') || SKIP.has(f)) continue;
    const fp = join(dir, f);
    const st = statSync(fp);
    if (st.isDirectory()) { collectFiles(fp, prefix + f + '/', out); continue; }
    if (!st.isFile()) continue;
    const buf = readFileSync(fp);
    const sha1 = createHash('sha1').update(buf).digest('hex');
    out['/' + prefix + f] = sha1;
  }
}

async function deploy() {
  const files = {};
  collectFiles(DIR, '', files);

  console.log('Creating deploy with', Object.keys(files).length, 'files...');
  const createRes = await fetch(`${API}/sites/${SITE_ID}/deploys`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  });
  if (!createRes.ok) { console.error('Create deploy failed:', await createRes.text()); process.exit(1); }
  const deployData = await createRes.json();
  const deployId = deployData.id;
  const required = deployData.required || [];
  console.log('Deploy ID:', deployId, '| Files to upload:', required.length);

  const shaToPath = {};
  for (const [path, sha] of Object.entries(files)) shaToPath[sha] = path;

  for (const sha of required) {
    const filePath = shaToPath[sha];
    if (!filePath) continue;
    const localPath = join(DIR, filePath.slice(1));
    const body = readFileSync(localPath);
    console.log('  Uploading', filePath, '(' + body.length + ' bytes)');
    const upRes = await fetch(`${API}/deploys/${deployId}/files${filePath}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/octet-stream' },
      body,
    });
    if (!upRes.ok) console.error('  Upload failed:', filePath, await upRes.text());
  }

  console.log('Waiting for deploy to be ready...');
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(`${API}/deploys/${deployId}`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` },
    });
    const st = await statusRes.json();
    console.log('  Status:', st.state);
    if (st.state === 'ready') {
      console.log('\n✅ Deploy complete!');
      console.log('URL:', st.ssl_url || st.url);
      console.log('Deploy URL:', st.deploy_ssl_url || st.deploy_url);
      return;
    }
    if (st.state === 'error') { console.error('Deploy error:', st.error_message); process.exit(1); }
  }
  console.log('Timed out waiting for deploy');
}

deploy().catch(e => { console.error(e); process.exit(1); });
