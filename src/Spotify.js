const clientId = "3cde5ab5546a42d0a7d271199a4f2a70"; // clientId
const redirectUrl = "https://spotinight.netlify.app"; // redirect URL
const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const scope =
  "user-read-private user-read-email user-top-read playlist-modify-public";

const currentToken = {
  get access_token() {
    return localStorage.getItem("access_token") || null;
  },
  get refresh_token() {
    return localStorage.getItem("refresh_token") || null;
  },
  get expires_in() {
    return localStorage.getItem("refresh_in") || null;
  },
  get expires() {
    return localStorage.getItem("expires") || null;
  },

  save: function (response) {
    const { access_token, refresh_token, expires_in } = response;
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    localStorage.setItem("expires_in", expires_in);

    const now = new Date();
    const expiry = new Date(now.getTime() + expires_in * 1000);
    localStorage.setItem("expires", expiry);
  },
};

const args = new URLSearchParams(window.location.search);
const code = args.get("code");

if (code) {
  const token = await getToken(code);
  currentToken.save(token);

  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  const updatedUrl = url.search ? url.href : url.href.replace("?", "");
  window.history.replaceState({}, document.title, updatedUrl);
}

async function redirectToSpotifyAuthorize() {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = crypto.getRandomValues(new Uint8Array(64));
  const randomString = randomValues.reduce(
    (acc, x) => acc + possible[x % possible.length],
    ""
  );

  const code_verifier = randomString;
  const data = new TextEncoder().encode(code_verifier);
  const hashed = await crypto.subtle.digest("SHA-256", data);

  const code_challenge_base64 = btoa(
    String.fromCharCode(...new Uint8Array(hashed))
  )
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  window.localStorage.setItem("code_verifier", code_verifier);

  const authUrl = new URL(authorizationEndpoint);
  const params = {
    response_type: "code",
    client_id: clientId,
    scope: scope,
    code_challenge_method: "S256",
    code_challenge: code_challenge_base64,
    redirect_uri: redirectUrl,
  };

  authUrl.search = new URLSearchParams(params).toString();
  window.location.href = authUrl.toString();
}

export const searchTracks = async (searchTerm, accessToken) => {
  const baseURL = "https://api.spotify.com/v1/search";
  const query = `?q=${encodeURIComponent(searchTerm)}&type=track&limit=10`;

  try {
    const response = await fetch(`${baseURL}${query}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    return data.tracks.items;
  } catch (error) {
    console.error("Error during track search", error);
    throw error;
  }
};

// Soptify API
async function getToken(code) {
  const code_verifier = localStorage.getItem("code_verifier");

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUrl,
      code_verifier: code_verifier,
    }),
  });

  return await response.json();
}

async function refreshToken() {
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: currentToken.refresh_token,
    }),
  });

  return await response.json();
}

// Login and logout

export async function loginSpotify() {
  await redirectToSpotifyAuthorize();
}

export async function logoutSpotify() {
  localStorage.clear();
  window.location.href = redirectUrl;
}

export async function refreshSpotify() {
  const token = await refreshToken();
  currentToken.save(token);
}

export function isLogged() {
  return currentToken.access_token != null;
}

// Fetch functions

async function fetchWebApi(endpoint, method, body) {
  const response = await fetch(`https://api.spotify.com/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${currentToken.access_token}`,
    },
    method,
    body: JSON.stringify(body),
  });
  return await response.json();
}

export async function getUserData() {
  return await fetchWebApi("v1/me", "GET");
}

export async function getNewReleases() {
  return await fetchWebApi("v1/browse/new-releases?limit=5", "GET");
}

export async function getPlaylistTracks(playlistId) {
  return await fetchWebApi(
    `v1/playlists/${playlistId}/tracks?limit=100`,
    "GET"
  );
}

// top sons
export async function getTopTracks() {
  return await fetchWebApi("v1/me/top/tracks?limit=5", "GET");
}

export async function getGlobalTopTracks() {
  const playlistId = "37i9dQZEVXbMDoHDwVN2tF"; // Par exemple, ID pour la playlist Global Top 50 de Spotify
  return await fetchWebApi(`v1/playlists/${playlistId}/tracks?limit=50`, "GET");
}

export async function getTrackInfo(trackId) {
  try {
    const trackInfo = await fetchWebApi(`v1/tracks/${trackId}`, "GET");
    return trackInfo;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des informations de la piste :",
      error
    );
    throw error;
  }
}

export { currentToken };
