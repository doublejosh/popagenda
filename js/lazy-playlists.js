/**
 * Click-to-load Spotify Playlists
 * Renders a lightweight card for each playlist; the Spotify embed only loads when a card is clicked
 */

let config = null;

/**
 * Main initialization function
 */
async function initLazyPlaylists() {
  try {
    // Fetch playlist configuration
    const response = await fetch('playlists.json?v=3', { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Failed to fetch playlists.json: ${response.statusText}`);
    }

    config = await response.json();
    const container = document.getElementById('playlists-container');

    if (!container) {
      console.error('Playlists container not found');
      return;
    }

    // Create a card for each playlist, grouping series into their own section
    const seriesGrids = {};
    config.playlists.forEach((playlist) => {
      const card = createPlaylistCard(playlist);
      if (!playlist.series) {
        container.appendChild(card);
        return;
      }
      if (!seriesGrids[playlist.series]) {
        seriesGrids[playlist.series] = createSeriesSection(playlist.series, container);
      }
      seriesGrids[playlist.series].appendChild(card);
    });
  } catch (error) {
    console.error('Error initializing lazy playlists:', error);
  }
}

/**
 * Create a full-width series section and return its inner grid
 */
function createSeriesSection(name, container) {
  const section = document.createElement('section');
  section.className = 'playlist-series';

  const heading = document.createElement('h3');
  heading.textContent = name;
  section.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'playlist-series-grid';
  section.appendChild(grid);

  container.appendChild(section);
  return grid;
}

/**
 * Create a clickable card showing the playlist cover and title
 */
function createPlaylistCard(playlist) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'playlist-card';
  card.dataset.playlistId = playlist.id;
  card.setAttribute('aria-label', `Load playlist: ${playlist.title}`);

  if (playlist.image) {
    const img = document.createElement('img');
    img.src = playlist.image;
    img.alt = '';
    img.loading = 'lazy';
    img.onerror = () => img.remove();
    card.appendChild(img);
  }

  const title = document.createElement('span');
  title.className = 'playlist-card-title';
  title.textContent = playlist.title;
  card.appendChild(title);

  card.addEventListener('click', () => loadPlaylist(card));
  return card;
}

/**
 * Create Spotify iframe element
 */
function createIframe(playlistId, iframeConfig) {
  const iframe = document.createElement('iframe');
  iframe.src = `https://open.spotify.com/embed/playlist/${playlistId}`;
  iframe.setAttribute('frameBorder', iframeConfig.frameBorder);
  iframe.setAttribute('allowfullscreen', iframeConfig.allowfullscreen);
  iframe.setAttribute('allow', iframeConfig.allow);
  return iframe;
}

/**
 * Replace card with iframe
 */
function loadPlaylist(card) {
  if (!card || !card.dataset.playlistId) {
    return;
  }

  const iframe = createIframe(card.dataset.playlistId, config.iframeConfig);
  card.replaceWith(iframe);
}
