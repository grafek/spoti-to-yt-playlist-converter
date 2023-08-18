import express from "express";
import SpotifyWebApi from "spotify-web-api-node";
import { google } from "googleapis";
import cors from "cors";
import "dotenv/config";

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: process.env.BACKEND_URL,
    methods: ["GET", "POST"],
  })
);

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;

const SPOTIFY_PLAYLIST_REGEX = /playlist\/([a-zA-Z0-9]+)$/;
const YOUTUBE_PLAYLIST_REGEX = /list=([a-zA-Z0-9_-]+)/;

const spotifyApi = new SpotifyWebApi({
  clientId: SPOTIFY_CLIENT_ID,
  clientSecret: SPOTIFY_CLIENT_SECRET,
  redirectUri: SPOTIFY_REDIRECT_URI,
});

const googleOauth2Client = new google.auth.OAuth2(
  YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_SECRET,
  "postmessage"
);

const youtube = google.youtube({
  version: "v3",
  auth: googleOauth2Client,
});

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

async function convertAndAddTracksToYouTube(playlistTracks, youtubePlaylistId) {
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
    videoId,
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

app.post("/auth/google", async (req, res) => {
  const { tokens } = await googleOauth2Client.getToken(req.body.code);
  res.json(tokens);
});

app.post("/convert", async (req, res) => {
  try {
    const youtubeMatch = req.body.youtubePlaylist.match(YOUTUBE_PLAYLIST_REGEX);
    const spotifyMatch = req.body.spotifyPlaylist.match(SPOTIFY_PLAYLIST_REGEX);

    spotifyApi.setAccessToken(req.body.spotifyToken);
    googleOauth2Client.setCredentials({
      access_token: req.body.googleAccessToken,
      refresh_token: req.body.googleRefreshToken,
    });

    if (youtubeMatch && youtubeMatch[1] && spotifyMatch && spotifyMatch[1]) {
      const spotifyPlaylistId = spotifyMatch[1];
      const youtubePlaylistId = youtubeMatch[1];
      const spotifyPlaylistTracks = await getSpotifyPlaylistTracks(
        spotifyPlaylistId
      );
      await convertAndAddTracksToYouTube(
        spotifyPlaylistTracks,
        youtubePlaylistId
      );
      const youtubePlaylist = `https://www.youtube.com/playlist?list=${req.body.youtubePlaylistId}`;

      res.status(200).send({
        youtubePlaylist,
        message:
          "Playlist conversion successful, check your playlists with new tracks from spotify!",
      });
    } else {
      res.status(400).send("Invalid links!");
    }
  } catch (error) {
    console.error("Error converting playlist:", error);
    res.status(500).send("Unexpected error!");
  }
});

app.listen(3000, () => {
  console.log(`Server is running on port 3000`);
});

export default app;
