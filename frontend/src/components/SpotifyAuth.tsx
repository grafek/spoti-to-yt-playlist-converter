import qs from "qs";
import axios from "axios";
import { setItem } from "../helpers";

type Props = {
  setSpotifyToken: React.Dispatch<React.SetStateAction<string | null>>;
};

export default function SpotifyAuth({ setSpotifyToken }: Props) {
  const getAuth = async () => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

    const headers = {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      auth: {
        username: clientId,
        password: clientSecret,
      },
    };
    const data = {
      grant_type: "client_credentials",
    };

    try {
      const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        qs.stringify(data),
        headers
      );
      setSpotifyToken(response.data.access_token);
      setItem("spotify-token", response.data.access_token);
      return response.data.access_token;
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <button
      className="flex items-center border border-dark-primary justify-center flex-1 gap-2 bg-black rounded shadow px-4 py-2 font-medium md:w-fit"
      onClick={getAuth}
    >
      <img src="/spotify.svg" className="w-6 h-6" />
      Log in with Spotify
    </button>
  );
}
