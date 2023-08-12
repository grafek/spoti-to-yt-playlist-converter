const express = require("express");
const querystring = require("querystring");
const SpotifyWebApi = require("spotify-web-api-node");
const { google } = require("googleapis");
const axios = require("axios");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});
require("dotenv").config();

const app = express();
const port = 3000;

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const YOUTUBE_REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI;
const YOUTUBE_SCOPES = ["https://www.googleapis.com/auth/youtube"];

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

app.get("/", async (req, res) => {
  try {
    readline.question(
      "Enter Spotify Access Token: ",
      async (spotifyAccessToken) => {
        readline.question(
          "Enter YouTube Access Token: ",
          async (youtubeAccessToken) => {
            readline.question(
              "Enter YouTube Refresh Token: ",
              async (youtubeRefreshToken) => {
                spotifyApi.setAccessToken(spotifyAccessToken);
                youtubeOAuth2Client.setCredentials({
                  access_token: youtubeAccessToken,
                  refresh_token: youtubeRefreshToken,
                });
                readline.question(
                  "Enter Spotify Playlist ID: ",
                  async (spotifyPlaylistId) => {
                    readline.question(
                      "Enter YouTube Playlist ID: ",
                      async (youtubePlaylistId) => {
                        try {
                          const playlistTracks =
                            await spotifyApi.getPlaylistTracks(
                              spotifyPlaylistId,
                              {
                                fields:
                                  "items(track(name,artists(name))),total",
                              }
                            );

                          const youtube = google.youtube({
                            version: "v3",
                            auth: youtubeOAuth2Client,
                          });

                          for (const track of playlistTracks.body.items) {
                            const searchQuery = `${track.track.name} ${track.track.artists[0].name}`;
                            const searchResponse = await youtube.search.list({
                              q: searchQuery,
                              part: "snippet",
                              maxResults: 1,
                            });

                            if (searchResponse.data.items.length > 0) {
                              const videoId =
                                searchResponse.data.items[0].id.videoId;

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
                            }
                          }

                          readline.close();
                          res.send("Playlist conversion successful");
                        } catch (error) {
                          console.error("Error converting playlist:", error);
                          res.status(500).send("Error");
                        }
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
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
    code: code,
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
  const { tokens } = await youtubeOAuth2Client.getToken(req.query.code);
  youtubeOAuth2Client.setCredentials(tokens);

  res.send(
    `Access Token: ${tokens.access_token}<br>Refresh Token: ${tokens.refresh_token}`
  );
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
