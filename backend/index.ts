import express from "express";
import querystring from "querystring";
import SpotifyWebApi from "spotify-web-api-node";
import { google } from "googleapis";
import axios from "axios";
import readline from "readline";
import opn from "opn";
import "dotenv/config";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const app = express();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const YOUTUBE_REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI;
const YOUTUBE_SCOPES = ["https://www.googleapis.com/auth/youtube"];

const port = 3000;

const spotifyApi = new SpotifyWebApi({
  clientId: SPOTIFY_CLIENT_ID,
  clientSecret: SPOTIFY_CLIENT_SECRET,
  redirectUri: SPOTIFY_REDIRECT_URI,
});

const youtubeOAuth2Client = new google.auth.OAuth2(
  YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_SECRET,
  YOUTUBE_REDIRECT_URI
);

async function getAccessTokensAndPlaylistIds() {
  return new Promise<{
    spotifyAccessToken: string;
    youtubeAccessToken: string;
    youtubeRefreshToken: string;
    spotifyPlaylistId: string;
    youtubePlaylistId: string;
  }>((resolve) => {
    rl.question("Enter Spotify Access Token: ", (spotifyAccessToken) => {
      rl.question("Enter YouTube Access Token: ", (youtubeAccessToken) => {
        rl.question("Enter YouTube Refresh Token: ", (youtubeRefreshToken) => {
          rl.question("Enter Spotify Playlist ID: ", (spotifyPlaylistId) => {
            rl.question("Enter YouTube Playlist ID: ", (youtubePlaylistId) => {
              rl.close();
              resolve({
                spotifyAccessToken,
                youtubeAccessToken,
                youtubeRefreshToken,
                spotifyPlaylistId,
                youtubePlaylistId,
              });
            });
          });
        });
      });
    });
  });
}

async function convertAndAddTracksToYouTube(playlistTracks, youtubePlaylistId) {
  const youtube = google.youtube({
    version: "v3",
    auth: youtubeOAuth2Client,
  });

  for (const track of playlistTracks) {
    const searchQuery = `${track.name} ${track.artists[0].name}`;
    const videoId = await searchAndRetrieveVideoId(youtube, searchQuery);

    if (videoId) {
      try {
        await addVideoToYouTubePlaylistWithRetry(
          youtube,
          videoId,
          youtubePlaylistId
        );
      } catch (error) {
        console.error(`Error adding video ${videoId} to playlist:`, error);
      }
    }
  }
}

async function addVideoToYouTubePlaylistWithRetry(
  youtube,
  videoId,
  youtubePlaylistId
) {
  const maxRetries = 3;
  let currentRetry = 0;

  while (currentRetry < maxRetries) {
    try {
      await addVideoToYouTubePlaylist(youtube, videoId, youtubePlaylistId);
      console.log(`Added video ${videoId} to the playlist`);
      return;
    } catch (error) {
      console.error(
        `Error adding video ${videoId} to playlist (Attempt ${
          currentRetry + 1
        }/${maxRetries}):`,
        error
      );
      currentRetry++;
    }
  }

  console.error(
    `Failed to add video ${videoId} to the playlist after ${maxRetries} attempts`
  );
}

async function addVideoToYouTubePlaylist(youtube, videoId, youtubePlaylistId) {
  const playlistItemsResponse = await youtube.playlistItems.list({
    part: "snippet",
    playlistId: youtubePlaylistId,
    videoId: videoId,
  });

  if (playlistItemsResponse.data.items.length > 0) {
    console.log(`Video ${videoId} already exists in the playlist`);
    return;
  }

  await youtube.playlistItems.insert({
    part: "snippet",
    resource: {
      snippet: {
        playlistId: youtubePlaylistId,
        resourceId: {
          kind: "youtube#video",
          videoId: videoId,
        },
      },
    },
  });

  console.log(`Added video ${videoId} to the playlist`);
}

async function getSpotifyPlaylistTracks(spotifyPlaylistId) {
  const response = await spotifyApi.getPlaylistTracks(spotifyPlaylistId, {
    fields: "items(track(name,artists(name))),total",
  });

  return response.body.items.map((item) => item.track);
}

async function searchAndRetrieveVideoId(youtube, searchQuery) {
  const searchResponse = await youtube.search.list({
    q: searchQuery,
    part: "snippet",
    maxResults: 1,
  });

  if (searchResponse.data.items.length) {
    return searchResponse.data.items[0].id.videoId;
  }

  return null;
}

app.get("/", async (req, res) => {
  opn("http://localhost:3000/youtube");
  opn("http://localhost:3000/spotify");
  try {
    const {
      spotifyAccessToken,
      youtubeAccessToken,
      youtubeRefreshToken,
      spotifyPlaylistId,
      youtubePlaylistId,
    } = await getAccessTokensAndPlaylistIds();

    spotifyApi.setAccessToken(spotifyAccessToken);
    youtubeOAuth2Client.setCredentials({
      access_token: youtubeAccessToken,
      refresh_token: youtubeRefreshToken,
    });

    const playlistTracks = await getSpotifyPlaylistTracks(spotifyPlaylistId);

    console.log(playlistTracks);
    await convertAndAddTracksToYouTube(playlistTracks, youtubePlaylistId);

    res.send("Playlist conversion successful");
  } catch (error) {
    console.error("Error converting playlist:", error);
    res.status(500).send("Error");
  }
});

app.get("/spotify", (req, res) => {
  const authQueryParams = querystring.stringify({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: "user-read-private user-read-email",
    redirect_uri: SPOTIFY_REDIRECT_URI,
  });
  const authURL = `https://accounts.spotify.com/authorize?${authQueryParams}`;
  res.redirect(authURL);
});

app.get("/spotify-callback", async (req, res) => {
  const code = req.query.code;

  const tokenParams = querystring.stringify({
    grant_type: "authorization_code",
    code: code as string,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    client_id: SPOTIFY_CLIENT_ID,
    client_secret: SPOTIFY_CLIENT_SECRET,
  });
  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      tokenParams
    );
    const accessToken = response.data.access_token;
    const refreshToken = response.data.refresh_token;

    res.send(`Access Token: ${accessToken}<br>Refresh Token: ${refreshToken}`);
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    res.status(500).send("Error");
  }
});

app.get("/youtube", (req, res) => {
  const authURL = youtubeOAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: YOUTUBE_SCOPES,
  });

  res.redirect(authURL);
});

app.get("/youtube-callback", async (req, res) => {
  const { tokens } = await youtubeOAuth2Client.getToken(
    req.query.code as string
  );
  youtubeOAuth2Client.setCredentials(tokens);

  res.send(
    `Access Token: ${tokens.access_token}<br>Refresh Token: ${tokens.refresh_token}`
  );
});

app.listen(port, () => {
  console.log(`Server is running on port 3000`);
});
