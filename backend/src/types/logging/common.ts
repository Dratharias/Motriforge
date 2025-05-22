export interface UserInfo {
  id: string;
  email?: string;
  role?: string;
}

export interface PerformanceMetrics {
  responseTime?: number;
  cpuTime?: number;
  memoryUsage?: number;
}
