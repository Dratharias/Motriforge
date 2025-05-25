export class LogDataBuilder {
  private data: Record<string, any> = {};

  withData(data: Record<string, any>): this {
    this.data = { ...this.data, ...data };
    return this;
  }

  withTags(tags: Record<string, string>): this {
    this.data.tags = { ...this.data.tags, ...tags };
    return this;
  }

  withDuration(duration: number): this {
    this.data.duration = duration;
    return this;
  }

  withMetric(name: string, value: number): this {
    this.data.metrics = { ...this.data.metrics, [name]: value };
    return this;
  }

  withHttpStatus(status: number): this {
    this.data.httpStatus = status;
    return this;
  }

  withUserAgent(userAgent: string): this {
    this.data.userAgent = userAgent;
    return this;
  }

  withIpAddress(ipAddress: string): this {
    this.data.ipAddress = ipAddress;
    return this;
  }

  build(): Record<string, any> {
    return { ...this.data };
  }

  reset(): this {
    this.data = {};
    return this;
  }

  copyFrom(other: LogDataBuilder): this {
    this.data = { ...other.data };
    return this;
  }
}

