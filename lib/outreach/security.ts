import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function secret(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  if (["OUTREACH_UNSUBSCRIBE_KEY", "OUTREACH_WORKER_SECRET"].includes(name) && value.length < 32) throw new Error(`${name} must contain at least 32 random characters`);
  return value;
}
function key() {
  const value = Buffer.from(secret('OUTREACH_TOKEN_KEY'), 'base64');
  if (value.length !== 32) throw new Error('OUTREACH_TOKEN_KEY must be 32 bytes in base64');
  return value;
}
export function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from('connectivtech:gmail:v1'));
  return ['v1', iv.toString('base64url'), Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]).toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.');
}
export function decrypt(value: string) {
  const [version, iv, data, tag] = value.split('.');
  if (version !== 'v1' || !tag) throw new Error('Invalid encrypted token');
  const cipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  cipher.setAAD(Buffer.from('connectivtech:gmail:v1'));
  cipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([cipher.update(Buffer.from(data, 'base64url')), cipher.final()]).toString('utf8');
}
export function equal(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function unsubscribeToken(email: string) {
  const data = Buffer.from(email.toLowerCase()).toString('base64url');
  return `${data}.${createHmac('sha256', secret('OUTREACH_UNSUBSCRIBE_KEY')).update(`unsubscribe:${data}`).digest('base64url')}`;
}
export function unsubscribeEmail(token: string) {
  if (token.length > 1000) return null;
  const [data, mac] = token.split('.');
  if (!data || !mac) return null;
  const email = Buffer.from(data, 'base64url').toString('utf8');
  return equal(token, unsubscribeToken(email)) ? email : null;
}
export function senderConfig() {
  const email = secret('OUTREACH_SENDER_EMAIL').trim().toLowerCase();
  const domain = secret('OUTREACH_SENDING_DOMAIN').trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(domain) || domain === 'actoradvisory.com' || domain.endsWith('.actoradvisory.com')) throw new Error('Use a separate sending domain, not actoradvisory.com or its subdomains');
  if (!/^[^\s<>@]+@[^\s<>@]+$/.test(email) || email.split('@')[1] !== domain) throw new Error('Sender must belong to the dedicated domain');
  const origin = new URL(secret('APP_URL'));
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('APP_URL must be an HTTPS origin');
  return { email, domain, origin: origin.origin };
}
