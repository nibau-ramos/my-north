import { OAuth2Client } from 'google-auth-library';
import { config } from '../config';

const client = new OAuth2Client(config.googleClientId);

export interface GooglePayload {
  googleId: string;
  email: string;
}

export async function verifyGoogleToken(idToken: string): Promise<GooglePayload> {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: config.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload?.email) {
    throw new Error('Invalid Google token payload');
  }
  return { googleId: payload.sub, email: payload.email };
}
