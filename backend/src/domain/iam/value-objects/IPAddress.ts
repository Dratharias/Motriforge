import { IPAddress as IIPAddress } from '@/types/iam/interfaces';
import { isIP } from 'net';

export class IPAddress implements IIPAddress {
  public readonly type: 'ipv4' | 'ipv6';

  constructor(public readonly value: string) {
    const ipType = isIP(value);
    if (ipType === 0) {
      throw new Error('Invalid IP address format');
    }
    this.type = ipType === 4 ? 'ipv4' : 'ipv6';
  }

  equals(other: IPAddress): boolean {
    return this.value === other.value;
  }

  isPrivate(): boolean {
    if (this.type === 'ipv4') {
      const parts = this.value.split('.').map(Number);
      return (
        (parts[0] === 10) ||
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
        (parts[0] === 192 && parts[1] === 168) ||
        (parts[0] === 127)
      );
    }
    return this.value.startsWith('::1') || this.value.startsWith('fc') || this.value.startsWith('fd');
  }
}

