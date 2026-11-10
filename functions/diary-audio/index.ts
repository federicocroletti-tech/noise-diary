import { AwsClient, AwsV4Signer } from 'aws4fetch';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const bucket = 'diary-audio';
const maxClipBytes = 50 * 1024 * 1024;
const allowedOrigins = new Set([
  'https://federicocroletti-tech.github.io',
  'http://localhost:4200',
]);
const corsConfiguration = `<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <CORSRule>
    <AllowedOrigin>https://federicocroletti-tech.github.io</AllowedOrigin>
    <AllowedOrigin>http://localhost:4200</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`;
const storageEndpoint = requiredEnvironmentVariable('AWS_ENDPOINT_URL_S3').replace(/\/+$/, '');
const storageRegion = requiredEnvironmentVariable('AWS_REGION');
const storageAccessKeyId = requiredEnvironmentVariable('AWS_ACCESS_KEY_ID');
const storageSecretAccessKey = requiredEnvironmentVariable('AWS_SECRET_ACCESS_KEY');
const storageSessionToken = process.env.AWS_SESSION_TOKEN;
const storage = new AwsClient({
  accessKeyId: storageAccessKeyId,
  secretAccessKey: storageSecretAccessKey,
  sessionToken: storageSessionToken,
  service: 's3',
  region: storageRegion,
  retries: 0,
});
const jwks = createRemoteJWKSet(new URL(requiredEnvironmentVariable('NEON_AUTH_JWKS_URL')));
const issuer = new URL(requiredEnvironmentVariable('NEON_AUTH_BASE_URL')).origin;
let corsSetup: Promise<void> | undefined;

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing Neon-injected environment variable: ${name}`);
  }
  return value;
}

function objectUrl(key: string): URL {
  return new URL(`${storageEndpoint}/${bucket}/${key}`);
}

function responseHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, content-length, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '3600',
    Vary: 'Origin',
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string,
): Response {
  return Response.json(body, { status, headers: responseHeaders(origin) });
}

function ensureStorageCors(): Promise<void> {
  if (!corsSetup) {
    const url = new URL(`${storageEndpoint}/${bucket}`);
    url.searchParams.set('cors', '');
    corsSetup = storage
      .fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/xml' },
        body: corsConfiguration,
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to configure audio bucket CORS (HTTP ${response.status}).`);
        }
      })
      .catch((error: unknown) => {
        corsSetup = undefined;
        throw error;
      });
  }
  return corsSetup;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get('origin') ?? '';
    if (!allowedOrigins.has(origin)) {
      return new Response('Forbidden', { status: 403 });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: responseHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed.' }, 405, origin);
    }

    const authorization = request.headers.get('authorization');
    if (!authorization?.toLowerCase().startsWith('bearer ')) {
      return jsonResponse({ error: 'Authentication required.' }, 401, origin);
    }

    let userId: string;
    try {
      const { payload } = await jwtVerify(authorization.slice(7), jwks, { issuer });
      if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
        return jsonResponse({ error: 'Invalid authentication token.' }, 401, origin);
      }
      userId = encodeURIComponent(payload.sub);
    } catch {
      return jsonResponse({ error: 'Invalid authentication token.' }, 401, origin);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid request body.' }, 400, origin);
    }
    if (body === null || typeof body !== 'object') {
      return jsonResponse({ error: 'Invalid request body.' }, 400, origin);
    }

    const action = 'action' in body ? body.action : undefined;
    const clipId = 'clipId' in body ? body.clipId : undefined;
    if (
      typeof clipId !== 'string' ||
      !/^(?!\.{1,2}$)[A-Za-z0-9._-]{1,128}$/.test(clipId) ||
      !['upload', 'download', 'delete'].includes(String(action))
    ) {
      return jsonResponse({ error: 'Invalid audio request.' }, 400, origin);
    }
    const key = `${userId}/${clipId}`;

    try {
      await ensureStorageCors();
      if (action === 'upload') {
        const mimeType = 'mimeType' in body ? body.mimeType : undefined;
        const sizeBytes = 'sizeBytes' in body ? body.sizeBytes : undefined;
        if (
          typeof mimeType !== 'string' ||
          mimeType.length > 128 ||
          !mimeType.startsWith('audio/') ||
          typeof sizeBytes !== 'number' ||
          !Number.isSafeInteger(sizeBytes) ||
          sizeBytes < 1 ||
          sizeBytes > maxClipBytes
        ) {
          return jsonResponse({ error: 'Invalid audio metadata.' }, 400, origin);
        }
        const url = objectUrl(key);
        url.searchParams.set('X-Amz-Expires', '300');
        const signed = await new AwsV4Signer({
          url: url.toString(),
          method: 'PUT',
          accessKeyId: storageAccessKeyId,
          secretAccessKey: storageSecretAccessKey,
          sessionToken: storageSessionToken,
          service: 's3',
          region: storageRegion,
          signQuery: true,
          allHeaders: true,
          headers: {
            'Content-Length': String(sizeBytes),
            'Content-Type': mimeType,
          },
        }).sign();
        return jsonResponse({ url: signed.url.toString() }, 200, origin);
      }

      if (action === 'download') {
        const url = objectUrl(key);
        url.searchParams.set('X-Amz-Expires', '300');
        const signed = await new AwsV4Signer({
          url: url.toString(),
          method: 'GET',
          accessKeyId: storageAccessKeyId,
          secretAccessKey: storageSecretAccessKey,
          sessionToken: storageSessionToken,
          service: 's3',
          region: storageRegion,
          signQuery: true,
        }).sign();
        return jsonResponse({ url: signed.url.toString() }, 200, origin);
      }

      const deleted = await storage.fetch(objectUrl(key), { method: 'DELETE' });
      if (!deleted.ok) {
        throw new Error(`Unable to delete audio object (HTTP ${deleted.status}).`);
      }
      return jsonResponse({ success: true }, 200, origin);
    } catch (error) {
      console.error('Diary audio storage request failed.', error);
      return jsonResponse({ error: 'Audio storage is temporarily unavailable.' }, 500, origin);
    }
  },
};
