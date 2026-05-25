import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const MAX_BACKGROUND_IMAGE_SIZE_MB = 5;
export const MAX_BACKGROUND_IMAGE_SIZE = MAX_BACKGROUND_IMAGE_SIZE_MB * 1024 * 1024;

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${getRequiredEnv('CLOUDFLARE_R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: getRequiredEnv('CLOUDFLARE_R2_ACCESS_KEY_ID'),
      secretAccessKey: getRequiredEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
    },
  });
}

function extensionForType(type: string) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function uploadVerseBackground(file: File) {
  if (!file || file.size === 0) {
    return null;
  }

  if (!allowedImageTypes.has(file.type)) {
    throw new Error('Background image must be JPG, PNG, or WebP.');
  }

  if (file.size > MAX_BACKGROUND_IMAGE_SIZE) {
    throw new Error(`Background image must be ${MAX_BACKGROUND_IMAGE_SIZE_MB} MB or smaller.`);
  }

  const bucket = getRequiredEnv('CLOUDFLARE_R2_BUCKET');
  const publicUrl = getRequiredEnv('CLOUDFLARE_R2_PUBLIC_URL').replace(/\/$/, '');
  const key = `daily-verses/${crypto.randomUUID()}.${extensionForType(file.type)}`;
  const body = Buffer.from(await file.arrayBuffer());

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: file.type,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return {
    key,
    url: `${publicUrl}/${key}`,
  };
}
