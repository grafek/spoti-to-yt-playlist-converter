import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";

type Props = {
  setGoogleAccessToken: React.Dispatch<React.SetStateAction<string>>;
  setGoogleRefreshToken: React.Dispatch<React.SetStateAction<string>>;
};

const GoogleAuth = ({ setGoogleAccessToken, setGoogleRefreshToken }: Props) => {
  const googleLogin = useGoogleLogin({
    onSuccess: async ({ code }) => {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/google`,
        {
          code,
        }
      );
      console.log(res.data);
      setGoogleAccessToken(res.data.access_token);
      setGoogleRefreshToken(res.data.refresh_token);
    },
    flow: "auth-code",
  });

  return (
    <div>
      <button onClick={() => googleLogin()}>Log in with google</button>
    </div>
  );
};

export default GoogleAuth;
