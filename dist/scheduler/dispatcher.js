import { FairScheduler } from "./fairDispatch.js";
import { getKnownTenants, getTenantQueue, } from "./tenantQueues.js";
export class FairDispatcher {
    scheduler;
    constructor() {
        this.scheduler = new FairScheduler();
    }
    async getPendingCounts() {
        const pendingCounts = new Map();
        const tenants = await getKnownTenants();
        for (const tenantId of tenants) {
            const queue = await getTenantQueue(tenantId);
            const counts = await queue.getJobCounts("waiting");
            console.log(`[FairDispatcher] ${tenantId} waiting=${counts.waiting}`);
            pendingCounts.set(tenantId, counts.waiting);
        }
        return pendingCounts;
    }
    async pickNextJob() {
        const pendingCounts = await this.getPendingCounts();
        console.log("[FairDispatcher] Pending:", Object.fromEntries(pendingCounts));
        const tenantId = this.scheduler.pickNextTenant(pendingCounts);
        if (!tenantId) {
            return null;
        }
        const queue = await getTenantQueue(tenantId);
        const jobs = await queue.getJobs(["waiting"], 0, 0);
        if (jobs.length === 0) {
            return null;
        }
        const job = jobs[0];
        console.log(`[FairDispatcher] Selected tenant=${tenantId} job=${job.id}`);
        return job;
    }
    async completeJob(job) {
        const tenantId = job.data.tenantId;
        await job.remove();
        this.scheduler.onJobProcessed(tenantId);
        console.log(`[FairDispatcher] Completed job ${job.id} | tenant=${tenantId}`);
    }
    getCredits() {
        return this.scheduler.getCreditsSnapshot();
    }
}
//# sourceMappingURL=dispatcher.js.map