import { DeviceFingerprint as IDeviceFingerprint } from '@/types/iam/interfaces';
import { createHash } from 'crypto';

export class DeviceFingerprint implements IDeviceFingerprint {
  constructor(
    public readonly value: string,
    public readonly components: Record<string, string>
  ) {
    if (!this.value || this.value.trim().length === 0) {
      throw new Error('Device fingerprint cannot be empty');
    }
  }

  static fromComponents(components: Record<string, string>): DeviceFingerprint {
    const sortedComponents = Object.keys(components)
      .sort()
      .reduce((result, key) => {
        result[key] = components[key];
        return result;
      }, {} as Record<string, string>);

    const fingerprint = createHash('sha256')
      .update(JSON.stringify(sortedComponents))
      .digest('hex');

    return new DeviceFingerprint(fingerprint, sortedComponents);
  }

  equals(other: DeviceFingerprint): boolean {
    return this.value === other.value;
  }
}

