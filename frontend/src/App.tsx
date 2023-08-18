import SpotifyAuth from "./components/SpotifyAuth";
import { useState } from "react";
import GoogleAuth from "./components/GoogleAuth";
import axios from "axios";
import Cookies from "js-cookie";

function App() {
  const [spotifyToken, setSpotifyToken] = useState<string | null>(
    Cookies.get("spotify-token") ?? null
  );
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(
    Cookies.get("google-access") ?? null
  );
  const [googleRefreshToken, setGoogleRefreshToken] = useState<string | null>(
    Cookies.get("google-refresh") ?? null
  );
  const [spotifyPlaylist, setSpotifyPlaylist] = useState("");
  const [youtubePlaylist, setYoutubePlaylist] = useState("");
  const [error, setError] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [response, setResponse] = useState<{
    message: string;
    youtubePlaylist?: string;
  }>();

  const body = {
    spotifyToken,
    googleAccessToken,
    googleRefreshToken,
    youtubePlaylist: youtubePlaylist,
    spotifyPlaylist: spotifyPlaylist,
  };

  const providersToAuthenticate = [];
  if (!googleAccessToken) {
    providersToAuthenticate.push("Google");
  }
  if (!spotifyToken) {
    providersToAuthenticate.push("Spotify");
  }
  const authMessage =
    providersToAuthenticate.length > 0
      ? `Please authenticate with ${providersToAuthenticate.join(
          " and "
        )} to start conversion`
      : null;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (youtubePlaylist && spotifyPlaylist) {
      setIsConverting(true);
      axios
        .post(`${import.meta.env.VITE_API_URL}/convert`, body)
        .then((res) => setResponse(res.data))
        .catch((e) => setError(e.message))
        .finally(() => setIsConverting(false));
      return;
    }
    setError("Please provide playlists IDs for both services.");
  };

  return (
    <>
      <header className="text-3xl font-semibold p-4 text-center">
        <span className="text-spotify">Spotify</span> to{" "}
        <span className="text-youtube">Youtube</span> playlist converter
      </header>
      <main className="container px-4 max-w-2xl mx-auto">
        <div className="py-4 flex flex-col md:flex-row gap-4">
          {!googleAccessToken && !googleRefreshToken ? (
            <GoogleAuth
              setGoogleAccessToken={setGoogleAccessToken}
              setGoogleRefreshToken={setGoogleRefreshToken}
            />
          ) : null}
          {!spotifyToken ? (
            <SpotifyAuth setSpotifyToken={setSpotifyToken} />
          ) : null}
        </div>
        {spotifyToken && googleAccessToken && googleRefreshToken ? (
          <form className="flex flex-col gap-2" onSubmit={onSubmit}>
            <label
              htmlFor="spotify-playlist-id"
              className="flex flex-col text-sm gap-2  focus:border-transparent focus:ring-0"
            >
              Spotify playlist link
              <input
                id="spotify-playlist-id"
                onFocus={() => setError("")}
                value={spotifyPlaylist}
                onChange={(e) => setSpotifyPlaylist(e.target.value)}
                className="text-black rounded p-1 bg-white-primary border border-spotify"
              />
            </label>
            <label
              htmlFor="youtube-playlist-id"
              className="flex flex-col text-sm gap-2  focus:border-transparent focus:ring-0"
            >
              Youtube playlist link
              <input
                id="youtube-playlist-id"
                onFocus={() => setError("")}
                value={youtubePlaylist}
                onChange={(e) => setYoutubePlaylist(e.target.value)}
                className="text-black rounded p-1 bg-white-primary border border-youtube"
              />
            </label>
            <button
              disabled={!!error || isConverting}
              className="w-fit mx-auto bg-white-primary text-black rounded px-4 py-1 mt-2 disabled:bg-neutral-400/80 disabled:cursor-not-allowed"
            >
              {isConverting ? "Converting..." : "Convert"}
            </button>
          </form>
        ) : (
          authMessage
        )}
        {error ? (
          <p aria-invalid className="text-youtube text-sm relative top-8">
            {error}
          </p>
        ) : null}
        {response ? (
          <a
            href={response.youtubePlaylist}
            target="_blank"
            className="text-sm relative top-8 underline decoration-youtube underline-offset-4"
          >
            {response.message}
          </a>
        ) : null}
      </main>
    </>
  );
}

export default App;
