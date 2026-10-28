import { createPublicKey } from 'node:crypto';
import { resolveTxt } from 'node:dns/promises';
import { senderConfig, secret } from './security';

export function evaluateDns(spf: string[], dkim: string[], dmarc: string[]) {
  const s = spf.filter(x => /^v=spf1\s/i.test(x));
  const d = dkim.filter(x => /(?:^|;)\s*p=[A-Za-z0-9+/=]+\s*(?:;|$)/.test(x));
  const m = dmarc.filter(x => /^v=DMARC1\s*;/i.test(x));
  // Deliberately support the simple Google-only SPF profile. Complex SPF
  // policies require a separate audit; DNS presence is not delivery proof.
  const spfOk = s.length === 1 && /^v=spf1\s+include:_spf\.google\.com\s+[~-]all\s*$/i.test(s[0]);
  let dkimOk = false;
  if (dkim.length === 1 && d.length === 1 && /(?:^|;)\s*k=rsa\s*(?:;|$)/i.test(d[0])) {
    try {
      const publicKey = createPublicKey({ key: Buffer.from(d[0].match(/(?:^|;)\s*p=([^;]+)/)![1].trim(), 'base64'), format: 'der', type: 'spki' });
      dkimOk = publicKey.asymmetricKeyType === 'rsa' && (publicKey.asymmetricKeyDetails?.modulusLength ?? 0) >= 2048;
    } catch { dkimOk = false; }
  }
  const dmarcOk = m.length === 1 && /;\s*p=(none|quarantine|reject)\s*(;|$)/i.test(m[0]);
  return { spf: spfOk, dkim: dkimOk, dmarc: dmarcOk, ok: spfOk && dkimOk && dmarcOk };
}
export async function checkDns() {
  const { domain } = senderConfig();
  const selector = secret('GOOGLE_DKIM_SELECTOR');
  if (!/^[a-zA-Z0-9_-]+$/.test(selector)) throw new Error('Invalid DKIM selector');
  const read = async (name: string) => (await resolveTxt(name)).map(parts => parts.join(''));
  const records = await Promise.allSettled([read(domain), read(`${selector}._domainkey.${domain}`), read(`_dmarc.${domain}`)]);
  const values = records.map(r => r.status === 'fulfilled' ? r.value : []);
  return { domain, ...evaluateDns(values[0], values[1], values[2]), records: values, checkedAt: new Date().toISOString() };
}
