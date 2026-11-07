import Cookies from "js-cookie";

const TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user";

export const auth = {
  getToken: () => Cookies.get(TOKEN_KEY),
  getRefreshToken: () => Cookies.get(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    Cookies.set(TOKEN_KEY, accessToken, { expires: 1 / 48 });
    Cookies.set(REFRESH_TOKEN_KEY, refreshToken, { expires: 7 });
  },
  removeTokens: () => {
    Cookies.remove(TOKEN_KEY);
    Cookies.remove(REFRESH_TOKEN_KEY);
  },
  isAuthenticated: () => !!Cookies.get(TOKEN_KEY),
};

export const getToken = () => Cookies.get(TOKEN_KEY);
export const setToken = (token: string) => Cookies.set(TOKEN_KEY, token, { expires: 1 / 48 });
export const removeToken = () => Cookies.remove(TOKEN_KEY);