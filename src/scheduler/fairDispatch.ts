export class FairScheduler {
    private credits: Map<string, number> = new Map();

    constructor(private startingCredits = 100) {}

    private ensureTenant(tenantId: string): void {
        if (!this.credits.has(tenantId)) {
            this.credits.set(tenantId, this.startingCredits);
        }
    }

    private getCredits(tenantId: string): number {
        this.ensureTenant(tenantId);
        return this.credits.get(tenantId)!;
    }

    pickNextTenant(
        pendingJobs: Map<string, number>
    ): string | null {
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

    onJobProcessed(
        tenantId: string,
        cost = 1
    ): void {
        const currentCredits = this.getCredits(tenantId);

        this.credits.set(
            tenantId,
            currentCredits - cost
        );
    }

    addCredits(
        tenantId: string,
        amount: number
    ): void {
        const currentCredits = this.getCredits(tenantId);

        this.credits.set(
            tenantId,
            currentCredits + amount
        );
    }

    getCreditsSnapshot(): Record<string, number> {
        return Object.fromEntries(this.credits);
    }
}