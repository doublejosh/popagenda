/**
 * One-time lookup: read Spotify playlist folders and cache them as `series` in playlists.json
 *
 * Uses Spotify's undocumented rootlist endpoint (the one the app uses), so it may break.
 * The site never calls it; this only refreshes the static JSON.
 *
 * Usage:
 *   SPOTIFY_TOKEN=... SPOTIFY_USER=... node scripts/fetch-folders.mjs          # dry run
 *   SPOTIFY_TOKEN=... SPOTIFY_USER=... node scripts/fetch-folders.mjs --write  # update playlists.json
 *
 * Token: open open.spotify.com logged in, DevTools > Network, click any request to
 * api-partner.spotify.com or spclient, copy the `authorization: Bearer ...` value (without "Bearer ").
 * User: your Spotify username (from your profile URL: open.spotify.com/user/<this>).
 */

import { readFile, writeFile } from 'node:fs/promises';

const token = process.env.SPOTIFY_TOKEN;
const user = process.env.SPOTIFY_USER;
const write = process.argv.includes('--write');
const file = new URL('../playlists.json', import.meta.url);

if (!token || !user) {
  console.error('Set SPOTIFY_TOKEN and SPOTIFY_USER');
  process.exit(1);
}

const url = `https://spclient.wg.spotify.com/playlist/v2/user/${encodeURIComponent(user)}/rootlist`
  + '?decorate=revision,attributes&from=0&length=1000';

const response = await fetch(url, {
  headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
});
if (!response.ok) {
  console.error(`Rootlist request failed: ${response.status} ${await response.text()}`);
  process.exit(1);
}

const rootlist = await response.json();

// Items are a flat list; folders are bracketed by start-group / end-group markers
const decodeName = (name) => decodeURIComponent(name.replace(/\+/g, ' '));
const folderById = {};
const stack = [];
for (const { uri } of rootlist.contents.items) {
  const parts = uri.split(':');
  if (parts[1] === 'start-group') {
    stack.push(decodeName(parts.slice(3).join(':')));
  } else if (parts[1] === 'end-group') {
    stack.pop();
  } else if (parts[1] === 'playlist' && stack.length) {
    folderById[parts[2]] = stack[stack.length - 1];
  }
}

const config = JSON.parse(await readFile(file, 'utf8'));
const known = new Set(config.playlists.map((p) => p.id));

for (const playlist of config.playlists) {
  const folder = folderById[playlist.id];
  if (folder && folder !== playlist.series) {
    console.log(`${playlist.title}: ${playlist.series ?? '(none)'} -> ${folder}`);
    playlist.series = folder;
  }
}

const unlisted = Object.entries(folderById).filter(([id]) => !known.has(id));
if (unlisted.length) {
  console.log(`\n${unlisted.length} foldered playlists not in playlists.json:`);
  unlisted.forEach(([id, folder]) => console.log(`  ${folder}: ${id}`));
}

if (write) {
  await writeFile(file, JSON.stringify(config, null, 2) + '\n');
  console.log('\nWrote playlists.json');
} else {
  console.log('\nDry run; pass --write to update playlists.json');
}
