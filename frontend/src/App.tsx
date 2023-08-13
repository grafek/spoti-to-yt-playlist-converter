import SpotifyAuth from "./components/SpotifyAuth";
import { useState } from "react";
import GoogleAuth from "./components/GoogleAuth";
import axios from "axios";

function App() {
  const [spotifyToken, setSpotifyToken] = useState("");
  const [googleAccessToken, setGoogleAccessToken] = useState("");
  const [googleRefreshToken, setGoogleRefreshToken] = useState("");
  const [spotifyPlaylistId, setSpotifyPlaylistId] = useState("");
  const [youtubePlaylistId, setYoutubePlaylistId] = useState("");

  const body = {
    spotifyToken,
    googleAccessToken,
    googleRefreshToken,
    spotifyPlaylistId,
    youtubePlaylistId,
  };

  console.log(body);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    axios.post(`${import.meta.env.VITE_API_URL}/convert`, body);
  };

  return (
    <>
      <header className="text-3xl font-semibold p-4 text-center">
        <span className="text-spotify">Spotify</span> to{" "}
        <span className="text-youtube">Youtube</span> playlist converter
      </header>
      <main>
        <div className="py-4">
          <GoogleAuth
            setGoogleAccessToken={setGoogleAccessToken}
            setGoogleRefreshToken={setGoogleRefreshToken}
          />
          <SpotifyAuth setSpotifyToken={setSpotifyToken} />
        </div>
        <form className="flex flex-col gap-2" onSubmit={onSubmit}>
          <label htmlFor="spotify-playlist-id" className="flex gap-2">
            Spotify Playlist ID
            <input
              id="spotify-playlist-id"
              className="text-black"
              onChange={(e) => setSpotifyPlaylistId(e.target.value)}
              value={spotifyPlaylistId}
            />
          </label>
          <label htmlFor="youtube-playlist-id" className="flex gap-2">
            Youtube Playlist ID
            <input
              id="youtube-playlist-id"
              className="text-black"
              onChange={(e) => setYoutubePlaylistId(e.target.value)}
              value={youtubePlaylistId}
            />
          </label>
          <button className="w-fit">Convert</button>
        </form>
        <div></div>
      </main>
    </>
  );
}

export default App;
