import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import Cookies from "js-cookie";

type Props = {
  setGoogleAccessToken: React.Dispatch<React.SetStateAction<string | null>>;
  setGoogleRefreshToken: React.Dispatch<React.SetStateAction<string | null>>;
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
      setGoogleAccessToken(res.data.access_token);
      setGoogleRefreshToken(res.data.refresh_token);
      Cookies.set("google-access", res.data.access_token, { expires: 1 / 24 });
      Cookies.set("google-refresh", res.data.refresh_token, {
        expires: 1 / 24,
      });
    },
    flow: "auth-code",
  });

  return (
    <button
      className="flex border border-dark-primary items-center justify-center flex-1 gap-2 bg-slate-100 rounded shadow px-4 py-2 text-black font-medium md:w-fit"
      onClick={() => googleLogin()}
    >
      <img src="/google.svg" className="w-6 h-6" />
      Log in with google
    </button>
  );
};

export default GoogleAuth;
