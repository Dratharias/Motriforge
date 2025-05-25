import { Types } from 'mongoose';
import { Device } from '@/types/iam/interfaces';

export interface IDeviceRepository {
  findById(id: Types.ObjectId): Promise<Device | null>;
  findByFingerprint(fingerprint: string): Promise<Device | null>;
  save(device: Device): Promise<void>;
  delete(id: Types.ObjectId): Promise<void>;
  findTrustedDevices(): Promise<Device[]>;
  findSuspiciousDevices(riskThreshold: number): Promise<Device[]>;
}

