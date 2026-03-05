import { Controller, Get, Inject, Logger } from '@nestjs/common';
import { HealthCheckService, HealthCheck, HealthIndicatorResult, HealthCheckResult } from '@nestjs/terminus';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as cacheManager from 'cache-manager';
import { db } from '../../../database/db';
import { sql } from 'drizzle-orm';

@Controller({
    path: 'health',
    version: '1',
})
export class HealthController {
    private readonly logger = new Logger(HealthController.name);

    constructor(
        private health: HealthCheckService,
        @Inject(CACHE_MANAGER) private cacheManager: cacheManager.Cache,
    ) { }

    @Get('live')
    @HealthCheck()
    live(): Promise<HealthCheckResult> {
        return this.health.check([]);
    }

    @Get('ready')
    @HealthCheck()
    async ready(): Promise<HealthCheckResult> {
        return this.health.check([
            async () => this.checkDatabase(),
            async () => this.checkRedis(),
        ]);
    }

    private async checkDatabase(): Promise<HealthIndicatorResult> {
        try {
            await db.execute(sql`SELECT 1`);
            return { database: { status: 'up' } };
        } catch (e) {
            this.logger.error(`Database Health Check Failed: ${e.message}`, e.stack);
            return { database: { status: 'down', message: e.message } };
        }
    }

    private async checkRedis(): Promise<HealthIndicatorResult> {
        try {
            await this.cacheManager.set('health-check', 'ok', 1000);
            await this.cacheManager.del('health-check');
            return { redis: { status: 'up' } };
        } catch (e) {
            return { redis: { status: 'down', message: e.message } };
        }
    }
}
