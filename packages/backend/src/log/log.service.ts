import { Injectable } from '@nestjs/common';
import { LogRepository } from './log.repository';

@Injectable()
export class LogService {
  constructor(private readonly logRepository: LogRepository) {}

  findUserLogs(userId: number) {
    return this.logRepository.findByUserId(userId);
  }

  getUserLogStatistics(userId: number) {
    return this.logRepository.countGroupedByResult(userId);
  }
}
