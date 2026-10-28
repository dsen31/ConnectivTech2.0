import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, generateKeyPairSync } from 'node:crypto';
import { encrypt, decrypt, unsubscribeToken, unsubscribeEmail, senderConfig, equal } from '../lib/outreach/security';
import { evaluateDns } from '../lib/outreach/dns';
process.env.OUTREACH_TOKEN_KEY = randomBytes(32).toString('base64');
process.env.OUTREACH_UNSUBSCRIBE_KEY = randomBytes(32).toString('hex');

test('encrypted refresh tokens are randomized and reject tampering or wrong key', () => {
 const value = encrypt('refresh-token');
 assert.notEqual(value, encrypt('refresh-token'));
 assert.equal(decrypt(value), 'refresh-token');
 const parts=value.split('.'); parts[2]=Buffer.from('tampered').toString('base64url');
 assert.throws(()=>decrypt(parts.join('.')));
 const original=process.env.OUTREACH_TOKEN_KEY;
 process.env.OUTREACH_TOKEN_KEY=randomBytes(32).toString('base64');
 assert.throws(()=>decrypt(value));
 process.env.OUTREACH_TOKEN_KEY=original;
});
test('unsubscribe signatures reject forged addresses and unsigned legacy data', () => {
 const token=unsubscribeToken('Person@Example.com');
 assert.equal(unsubscribeEmail(token),'person@example.com');
 assert.equal(unsubscribeEmail(token+'x'),null);
 assert.equal(unsubscribeEmail(Buffer.from('other@example.com').toString('base64url')+'.'+token.split('.')[1]),null);
 assert.equal(unsubscribeEmail('eyJjbCI6IjEifQ'),null);
 assert.equal(equal('secret','secret-long'),false);
});
test('dedicated sender cannot use protected domain, subdomain, or header injection', () => {
 process.env.APP_URL='https://outreach.example';
 for (const domain of ['actoradvisory.com','mail.actoradvisory.com']) {
  process.env.OUTREACH_SENDING_DOMAIN=domain; process.env.OUTREACH_SENDER_EMAIL=`sender@${domain}`;
  assert.throws(senderConfig);
 }
 process.env.OUTREACH_SENDING_DOMAIN='separate-example.com';
 process.env.OUTREACH_SENDER_EMAIL='sender@separate-example.com';
 assert.equal(senderConfig().domain,'separate-example.com');
 process.env.OUTREACH_SENDER_EMAIL='sender@other.example'; assert.throws(senderConfig);
 process.env.OUTREACH_SENDER_EMAIL='sender@separate-example.com\r\nBcc: victim@example.com'; assert.throws(senderConfig);
});
test('DNS fails closed on missing, duplicate, permissive SPF and revoked DKIM', () => {
 const spf=['v=spf1 include:_spf.google.com ~all'];
 const key=generateKeyPairSync('rsa',{modulusLength:2048}).publicKey.export({type:'spki',format:'der'}).toString('base64');
 const dkim=['v=DKIM1; k=rsa; p='+key];
 const dmarc=['v=DMARC1; p=none; rua=mailto:reports@example.com'];
 assert.equal(evaluateDns(spf,dkim,dmarc).ok,true);
 assert.equal(evaluateDns([...spf,...spf],dkim,dmarc).ok,false);
 assert.equal(evaluateDns(['v=spf1 +all'],dkim,dmarc).ok,false);
 assert.equal(evaluateDns(spf,['v=DKIM1; k=rsa; p='],dmarc).ok,false);
 assert.equal(evaluateDns(spf,dkim,[]).ok,false);
 assert.equal(evaluateDns(spf,dkim,[...dmarc,...dmarc]).ok,false);
});
