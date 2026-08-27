/* =========================================================
   AQUORA AUTHENTICATION API
========================================================= */

const API_BASE =
  "http://127.0.0.1:8000";

const TOKEN_KEY =
  "aquora_auth_token";

const USER_KEY =
  "aquora_auth_user";

const AUTH_EVENT =
  "aquora-auth-change";


/* =========================================================
   TYPES
========================================================= */

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  institution: string;
  verificationStatus: string;
  createdAt: string;
}


export interface AuthResponse {
  message: string;
  accessToken: string;
  tokenType: string;
  user: AuthUser;
}


export interface RegisterPayload {
  fullName: string;
  email: string;
  institution: string;
  password: string;
}


export interface LoginPayload {
  email: string;
  password: string;
}


/* =========================================================
   RESPONSE HANDLER
========================================================= */

async function parseResponse<T>(
  response: Response
): Promise<T> {

  if (!response.ok) {

    let message =
      `Request failed (${response.status})`;

    try {

      const data =
        await response.json();

      if (data?.detail) {

        message =
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(
                data.detail
              );

      }

    } catch {

      // Ignore response parsing failure.

    }

    throw new Error(
      message
    );
  }


  const data: T =
    await response.json();

  return data;
}


/* =========================================================
   REGISTER
========================================================= */

export async function registerUser(
  payload: RegisterPayload
): Promise<AuthResponse> {

  const response =
    await fetch(
      `${API_BASE}/api/auth/register`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            payload
          ),
      }
    );


  return parseResponse<AuthResponse>(
    response
  );
}


/* =========================================================
   LOGIN
========================================================= */

export async function loginUser(
  payload: LoginPayload
): Promise<AuthResponse> {

  const response =
    await fetch(
      `${API_BASE}/api/auth/login`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            payload
          ),
      }
    );


  return parseResponse<AuthResponse>(
    response
  );
}


/* =========================================================
   SAVE AUTH SESSION
========================================================= */

export function saveAuthSession(
  response: AuthResponse
): void {

  localStorage.setItem(
    TOKEN_KEY,
    response.accessToken
  );


  localStorage.setItem(
    USER_KEY,
    JSON.stringify(
      response.user
    )
  );


  window.dispatchEvent(
    new Event(
      AUTH_EVENT
    )
  );
}


/* =========================================================
   GET STORED USER
========================================================= */

export function getStoredUser():
  AuthUser | null {

  try {

    const stored =
      localStorage.getItem(
        USER_KEY
      );


    if (!stored) {

      return null;

    }


    const parsed:
      AuthUser =
        JSON.parse(
          stored
        );


    return parsed;

  } catch {

    localStorage.removeItem(
      USER_KEY
    );

    return null;

  }
}


/* =========================================================
   GET AUTH TOKEN
========================================================= */

export function getAuthToken():
  string | null {

  return localStorage.getItem(
    TOKEN_KEY
  );
}


/* =========================================================
   CLEAR SESSION
========================================================= */

export function clearAuthSession():
  void {

  localStorage.removeItem(
    TOKEN_KEY
  );


  localStorage.removeItem(
    USER_KEY
  );


  window.dispatchEvent(
    new Event(
      AUTH_EVENT
    )
  );
}


/* =========================================================
   AUTH EVENT NAME
========================================================= */

export function getAuthEventName():
  string {

  return AUTH_EVENT;
}


/* =========================================================
   FETCH CURRENT USER
========================================================= */

export async function fetchCurrentUser():
  Promise<AuthUser> {

  const token =
    getAuthToken();


  if (!token) {

    throw new Error(
      "Authentication required."
    );

  }


  const response =
    await fetch(
      `${API_BASE}/api/auth/me`,
      {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );


  const result =
    await parseResponse<{
      authenticated: boolean;
      user: AuthUser;
    }>(
      response
    );


  return result.user;
}