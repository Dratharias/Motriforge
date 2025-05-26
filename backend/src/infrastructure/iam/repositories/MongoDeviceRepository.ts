
import { Types } from 'mongoose';
import { IDeviceRepository } from '@/domain/iam/ports/IDeviceRepository';
import { Device } from '@/types/iam/interfaces';
import { DeviceFingerprint } from '@/domain/iam/value-objects/DeviceFingerprint';
import { DeviceDocument } from './types/DocumentInterfaces';
import { IDeviceModel } from './types/ModelInterfaces';

export class MongoDeviceRepository implements IDeviceRepository {
  constructor(private readonly model: IDeviceModel) {}

  async findById(id: Types.ObjectId): Promise<Device | null> {
    const doc = await this.model.findById(id).lean();
    return doc ? this.toDomain(doc) : null;
  }

  async findByFingerprint(fingerprint: string): Promise<Device | null> {
    const doc = await this.model.findOne({ 'fingerprint.value': fingerprint }).lean();
    return doc ? this.toDomain(doc) : null;
  }

  async save(device: Device): Promise<void> {
    const doc = this.toDocument(device);
    await this.model.findByIdAndUpdate(
      device.id,
      doc,
      { upsert: true, new: true }
    );
  }

  async delete(id: Types.ObjectId): Promise<void> {
    await this.model.findByIdAndDelete(id);
  }

  async findTrustedDevices(): Promise<Device[]> {
    const docs = await this.model.find({ isTrusted: true }).lean();
    return docs.map(doc => this.toDomain(doc));
  }

  async findSuspiciousDevices(riskThreshold: number): Promise<Device[]> {
    // In a real implementation, this would query based on risk scores
    // For now, return devices that are not trusted and recently seen
    const docs = await this.model.find({
      isTrusted: false,
      lastSeenAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).lean();
    return docs.map(doc => this.toDomain(doc));
  }

  private toDomain(doc: DeviceDocument): Device {
    return {
      id: doc._id,
      fingerprint: new DeviceFingerprint(doc.fingerprint.value, doc.fingerprint.components),
      type: doc.type as any,
      name: doc.name,
      isTrusted: doc.isTrusted,
      firstSeenAt: doc.firstSeenAt,
      lastSeenAt: doc.lastSeenAt,
      attributes: doc.attributes
    };
  }

  private toDocument(device: Device): Partial<DeviceDocument> {
    return {
      _id: device.id,
      fingerprint: {
        value: device.fingerprint.value,
        components: device.fingerprint.components
      },
      type: device.type,
      name: device.name,
      isTrusted: device.isTrusted,
      firstSeenAt: device.firstSeenAt,
      lastSeenAt: device.lastSeenAt,
      attributes: device.attributes
    };
  }
}