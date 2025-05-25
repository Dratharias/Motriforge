import { LogEntry } from "@/types/shared/infrastructure/logging";

export interface ILogFormattingStrategy {
  format(entry: LogEntry): string;
}

