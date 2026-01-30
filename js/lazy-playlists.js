/**
 * Lazy Loading Spotify Playlists
 * Loads initial playlists immediately, then lazy loads remaining playlists as they scroll into view
 */

let config = null;

/**
 * Main initialization function
 */
async function initLazyPlaylists() {
  try {
    // Fetch playlist configuration
    const response = await fetch('playlists.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch playlists.json: ${response.statusText}`);
    }

    config = await response.json();
    const container = document.getElementById('playlists-container');

    if (!container) {
      console.error('Playlists container not found');
      return;
    }

    // Create placeholders for all playlists
    config.playlists.forEach((playlistId, index) => {
      const placeholder = createPlaylistPlaceholder(playlistId, index);
      container.appendChild(placeholder);
    });

    // Get all placeholders
    const placeholders = container.querySelectorAll('.playlist-placeholder');

    // Load initial playlists immediately
    for (let i = 0; i < Math.min(config.initialLoadCount, placeholders.length); i++) {
      loadPlaylist(placeholders[i]);
    }

    // Set up Intersection Observer for remaining playlists
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const placeholder = entry.target;
            if (placeholder.classList.contains('playlist-placeholder')) {
              loadPlaylist(placeholder);
              observer.unobserve(placeholder); // Stop observing once loaded
            }
          }
        });
      },
      {
        rootMargin: '200px', // Load 200px before entering viewport
        threshold: 0.01 // Trigger when 1% visible
      }
    );

    // Observe remaining placeholders (skip initially loaded ones)
    for (let i = config.initialLoadCount; i < placeholders.length; i++) {
      observer.observe(placeholders[i]);
    }

  } catch (error) {
    console.error('Error initializing lazy playlists:', error);
  }
}

/**
 * Create a placeholder div with loading animation
 */
function createPlaylistPlaceholder(playlistId, index) {
  const placeholder = document.createElement('div');
  placeholder.className = 'playlist-placeholder';
  placeholder.dataset.playlistId = playlistId;
  placeholder.dataset.index = index;
  return placeholder;
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
 * Replace placeholder with iframe
 */
function loadPlaylist(placeholder) {
  if (!placeholder || !placeholder.dataset.playlistId) {
    return;
  }

  const playlistId = placeholder.dataset.playlistId;
  const iframe = createIframe(playlistId, config.iframeConfig);

  // Replace placeholder with iframe
  placeholder.replaceWith(iframe);
}
