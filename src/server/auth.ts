import { ownedAuth, requestOwnedToken } from "@/lib/owned-auth/server";

// Every commerce route derives ownership from this validated server session.
export async function requestUser(request: Request) {
  return ownedAuth().session(await requestOwnedToken(request));
}
