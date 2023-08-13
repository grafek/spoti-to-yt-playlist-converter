import qs from "qs";
import axios from "axios";

type Props = {
  setSpotifyToken: React.Dispatch<React.SetStateAction<string>>;
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
      console.log(response.data.access_token);
      setSpotifyToken(response.data.access_token);
      return response.data.access_token;
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <button onClick={getAuth}>Authenticate with Spotify</button>
    </div>
  );
}
