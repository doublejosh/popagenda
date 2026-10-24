/**
 * Refresh playlist track counts and cache them as `trackCount` in playlists.json
 *
 * Uses Spotify's undocumented playlist endpoint (the one the app uses), so it may break.
 * The public Web API rate-limits web player tokens, so this uses the app's endpoint instead.
 * The site never calls it; this only refreshes the static JSON.
 *
 * Usage:
 *   SPOTIFY_TOKEN=... node scripts/fetch-stats.mjs          # dry run
 *   SPOTIFY_TOKEN=... node scripts/fetch-stats.mjs --write  # update playlists.json
 *
 * Token: same as fetch-folders.mjs (web player bearer token).
 */

import { readFile, writeFile } from 'node:fs/promises';

const token = process.env.SPOTIFY_TOKEN;
const write = process.argv.includes('--write');
const file = new URL('../playlists.json', import.meta.url);

if (!token) {
  console.error('Set SPOTIFY_TOKEN');
  process.exit(1);
}

const config = JSON.parse(await readFile(file, 'utf8'));

for (const playlist of config.playlists) {
  const url = `https://spclient.wg.spotify.com/playlist/v2/playlist/${playlist.id}`
    + '?decorate=length&from=0&length=0';
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!response.ok) {
    console.error(`${playlist.title}: request failed ${response.status} ${await response.text()}`);
    continue;
  }

  const { length } = await response.json();
  if (length !== playlist.trackCount) {
    console.log(`${playlist.title}: ${playlist.trackCount ?? '(none)'} -> ${length}`);
    playlist.trackCount = length;
  }
}

if (write) {
  await writeFile(file, JSON.stringify(config, null, 2) + '\n');
  console.log('\nWrote playlists.json');
} else {
  console.log('\nDry run; pass --write to update playlists.json');
}
