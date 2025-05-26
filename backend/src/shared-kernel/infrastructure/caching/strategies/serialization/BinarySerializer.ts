
/**
 * Binary serializer - converts to Buffer for storage
 */
export class BinarySerializer implements ICacheSerializer {
  public readonly format = CacheSerializationFormat.BINARY;

  serialize<T>(data: T): Buffer {
    try {
      const jsonString = JSON.stringify(data);
      return Buffer.from(jsonString, 'utf8');
    } catch (error) {
      throw new Error(`Failed to serialize data to binary: ${error}`);
    }
  }

  deserialize<T>(data: string | Buffer): T {
    try {
      let buffer: Buffer;
      
      if (typeof data === 'string') {
        buffer = Buffer.from(data, 'utf8');
      } else {
        buffer = data;
      }
      
      const jsonString = buffer.toString('utf8');
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error(`Failed to deserialize binary data: ${error}`);
    }
  }

  getSize(data: string | Buffer): number {
    if (typeof data === 'string') {
      return Buffer.byteLength(data, 'utf8');
    }
    return data.length;
  }
}

