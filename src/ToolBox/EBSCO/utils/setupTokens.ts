import axios, { AxiosError, AxiosResponse } from "axios";
import { Either, left, right, isLeft } from "fp-ts/Either";
import * as t from "io-ts";
import { fold } from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as dotenv from "dotenv";
dotenv.config();
const AuthResponse = t.type({
  AuthToken: t.string,
});

const CreateSessionResponse = t.type({
  SessionToken: t.string,
});

type AuthResponse = t.TypeOf<typeof AuthResponse>;
type CreateSessionResponse = t.TypeOf<typeof CreateSessionResponse>;

async function authenticate(
  userId: string,
  password: string,
): Promise<Either<Error, AuthResponse>> {
  const params = {
    UserId: userId,
    Password: password,
  };

  const response: AxiosResponse = await axios.post(
    process.env.AUTH_URL || "",
    params,
  );
  return pipe(
    AuthResponse.decode(response.data),
    fold(
      () => left(new Error("Invalid response from authentication service.")),
      right,
    ),
  );
}

async function createSession(
  authToken: string,
  profile: string,
): Promise<Either<Error, CreateSessionResponse>> {
  const headers = {
    "x-authenticationToken": authToken,
  };

  const url = `${process.env.SESSION_URL}?profile=${profile}`;

  const response: AxiosResponse = await axios.get(url, { headers });
  return pipe(
    CreateSessionResponse.decode(response.data),
    fold(
      () => left(new Error("Invalid response from session service.")),
      right,
    ),
  );
}

async function setupTokens(
  userId: string,
  password: string,
  profile: string,
): Promise<Either<Error, string>> {
  const authResult = await authenticate(userId, password);
  if (isLeft(authResult)) {
    return authResult;
  }

  const authResponse = authResult.right;
  const authToken = authResponse.AuthToken;

  const sessionResult = await createSession(authToken, profile);
  if (isLeft(sessionResult)) {
    return sessionResult;
  }

  const sessionResponse = sessionResult.right;
  const sessionToken = sessionResponse.SessionToken;

  return right(sessionToken);
}

async function endSession(sessionToken: string): Promise<Either<Error, void>> {
  try {
    const config = {
      params: {
        sessiontoken: sessionToken,
      },
    };
    await axios.get(process.env.END_SESSION_URL || "", config);

    return right(undefined);
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("Error ending session:", axiosError.response?.data);
    return left(
      new Error(
        "Failed to end session: " + (axiosError.message || "Unknown error"),
      ),
    );
  }
}

function getHeaders(sessionToken: string): Record<string, string> {
  return {
    "x-sessionToken": sessionToken,
  };
}

export { setupTokens, endSession, getHeaders };
