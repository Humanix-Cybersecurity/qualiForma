// SPDX-License-Identifier: AGPL-3.0-or-later
import { Readable } from 'node:stream';
import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { loadEnv } from '../config/env';

/** Port de stockage objet (injectable, mockable en test). */
export interface ObjectStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  copy(fromKey: string, toKey: string): Promise<void>;
  delete(key: string): Promise<void>;
  getStream(key: string): Promise<Readable>;
}

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

/** Implémentation S3-compatible (MinIO par défaut). Chiffrement au repos via SSE (ADR 0006). */
@Injectable()
export class S3ObjectStorage implements ObjectStorage, OnModuleInit {
  private readonly env = loadEnv();
  private readonly client = new S3Client({
    endpoint: this.env.S3_ENDPOINT,
    region: this.env.S3_REGION,
    forcePathStyle: this.env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: this.env.S3_ACCESS_KEY,
      secretAccessKey: this.env.S3_SECRET_KEY,
    },
  });
  private get bucket(): string {
    return this.env.S3_BUCKET;
  }
  private get sse(): 'AES256' | undefined {
    return this.env.S3_SSE ? 'AES256' : undefined;
  }

  async onModuleInit(): Promise<void> {
    // Crée le bucket s'il n'existe pas (dev/self-host). object-lock activable seulement
    // à la création (WORM, souveraineté) — sans effet si le bucket existe déjà.
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(
        new CreateBucketCommand({
          Bucket: this.bucket,
          ...(this.env.S3_OBJECT_LOCK ? { ObjectLockEnabledForBucket: true } : {}),
        }),
      );
    }
  }

  /** Date de rétention WORM (object-lock) pour les artefacts probants. */
  private retainUntil(): Date {
    const d = new Date();
    d.setUTCFullYear(d.getUTCFullYear() + this.env.S3_RETENTION_YEARS);
    return d;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ServerSideEncryption: this.sse,
      }),
    );
  }

  async copy(fromKey: string, toKey: string): Promise<void> {
    // La promotion (quarantaine → espace servable) pose la rétention WORM si activée :
    // l'objet probant devient non supprimable/modifiable jusqu'à expiration (COMPLIANCE).
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${fromKey}`,
        Key: toKey,
        ServerSideEncryption: this.sse,
        ...(this.env.S3_OBJECT_LOCK
          ? { ObjectLockMode: 'COMPLIANCE' as const, ObjectLockRetainUntilDate: this.retainUntil() }
          : {}),
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async getStream(key: string): Promise<Readable> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return res.Body as Readable;
  }
}
