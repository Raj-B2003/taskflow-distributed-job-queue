import { Job } from "bullmq";
import { FairScheduler } from "./fairDispatch.js";
import {
    getKnownTenants,
    getTenantQueue,
} from "./tenantQueues.js";

export class FairDispatcher {
    private scheduler: FairScheduler;

    constructor() {
        this.scheduler = new FairScheduler();
    }

    async getPendingCounts(): Promise<Map<string, number>> {
        const pendingCounts = new Map<string, number>();

        for (const tenantId of getKnownTenants()) {
            const queue = getTenantQueue(tenantId);

            const counts = await queue.getJobCounts(
                "waiting"
            );

            console.log(
                `[FairDispatcher] ${tenantId} waiting=${counts.waiting}`
            );

            pendingCounts.set(
                tenantId,
                counts.waiting
            );
        }

        return pendingCounts;
    }

    async pickNextJob(): Promise<Job | null> {
        const pendingCounts = await this.getPendingCounts();

        console.log(
            "[FairDispatcher] Pending:",
            Object.fromEntries(pendingCounts)
        );

        const tenantId =
            this.scheduler.pickNextTenant(pendingCounts);

        if (!tenantId) {
            return null;
        }

        const queue = getTenantQueue(tenantId);

        const jobs = await queue.getJobs(
            ["waiting"],
            0,
            0
        );

        if (jobs.length === 0) {
            return null;
        }

        const job = jobs[0];

        console.log(
            `[FairDispatcher] Selected tenant=${tenantId} job=${job.id}`
        );

        return job;
    }

    async completeJob(job: Job): Promise<void> {
        const tenantId = job.data.tenantId;

        const queue = getTenantQueue(tenantId);

        await job.remove();

        this.scheduler.onJobProcessed(
            tenantId
        );

        console.log(
            `[FairDispatcher] Completed job ${job.id} | tenant=${tenantId}`
        );
    }

    getCredits(): Record<string, number> {
        return this.scheduler.getCreditsSnapshot();
    }
}