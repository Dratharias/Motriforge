/**
 * Encryption algorithm types
 */
export enum EncryptionAlgorithm {
  AES_256_GCM = 'aes-256-gcm',
  AES_256_CBC = 'aes-256-cbc',
  ChaCha20_Poly1305 = 'chacha20-poly1305'
}

/**
 * Key derivation function types
 */
export enum KeyDerivationFunction {
  PBKDF2 = 'pbkdf2',
  SCRYPT = 'scrypt',
  ARGON2 = 'argon2'
}

/**
 * Key rotation status
 */
export enum KeyRotationStatus {
  COMPLETED = 'completed',
  IN_PROGRESS = 'in_progress',
  FAILED = 'failed',
  SCHEDULED = 'scheduled',
  CANCELLED = 'cancelled'
}

/**
 * Encryption operation types for auditing
 */
export enum EncryptionOperation {
  ENCRYPT = 'encrypt',
  DECRYPT = 'decrypt',
  KEY_GENERATION = 'key_generation',
  KEY_ROTATION = 'key_rotation',
  KEY_DEACTIVATION = 'key_deactivation'
}