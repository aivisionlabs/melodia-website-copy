/**
 * Cloudflare R2 client — S3-compatible, zero egress fees.
 * Uses @aws-sdk/client-s3 with the R2 endpoint.
 */

import { S3Client } from '@aws-sdk/client-s3';

let _r2Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (_r2Client) return _r2Client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.');
  }

  _r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return _r2Client;
}

export function getR2BucketName(): string {
  return process.env.R2_BUCKET_NAME ?? 'melodia-media';
}

export function getR2PublicBaseUrl(): string {
  return process.env.R2_PUBLIC_URL ?? 'https://media.melodia-songs.com';
}
