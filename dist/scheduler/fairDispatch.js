export class FairScheduler {
    startingCredits;
    credits = new Map();
    constructor(startingCredits = 100) {
        this.startingCredits = startingCredits;
    }
    ensureTenant(tenantId) {
        if (!this.credits.has(tenantId)) {
            this.credits.set(tenantId, this.startingCredits);
        }
    }
    getCredits(tenantId) {
        this.ensureTenant(tenantId);
        return this.credits.get(tenantId);
    }
    pickNextTenant(pendingJobs) {
        const candidates = [...pendingJobs.entries()]
            .filter(([, pending]) => pending > 0);
        if (candidates.length === 0) {
            return null;
        }
        /*
         * Fairness score:
         *
         *   higher credits = better
         *   fewer pending jobs = better
         *
         * Dividing credits by pending jobs prevents a tenant
         * with a very large backlog from dominating the scheduler.
         */
        const ranked = candidates.map(([tenantId, pending]) => {
            const credits = this.getCredits(tenantId);
            const score = credits / pending;
            return {
                tenantId,
                pending,
                credits,
                score,
            };
        });
        ranked.sort((a, b) => {
            // Higher score gets priority.
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            // If scores are equal, prefer the tenant
            // with fewer pending jobs.
            if (a.pending !== b.pending) {
                return a.pending - b.pending;
            }
            // Final deterministic tie-breaker.
            return a.tenantId.localeCompare(b.tenantId);
        });
        return ranked[0].tenantId;
    }
    onJobProcessed(tenantId, cost = 1) {
        const currentCredits = this.getCredits(tenantId);
        this.credits.set(tenantId, currentCredits - cost);
    }
    addCredits(tenantId, amount) {
        const currentCredits = this.getCredits(tenantId);
        this.credits.set(tenantId, currentCredits + amount);
    }
    getCreditsSnapshot() {
        return Object.fromEntries(this.credits);
    }
}
//# sourceMappingURL=fairDispatch.js.map