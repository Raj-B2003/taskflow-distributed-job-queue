import { describe, expect, it } from "vitest";
import { FairScheduler } from "../scheduler/fairDispatch.js";

describe("FairScheduler", () => {
    it("prioritizes tenants with smaller backlogs", () => {
        const scheduler = new FairScheduler();

        const pending = new Map<string, number>([
            ["tenant-a", 5],
            ["tenant-b", 1],
            ["tenant-c", 1],
        ]);

        const selected = scheduler.pickNextTenant(pending);

        expect(["tenant-b", "tenant-c"]).toContain(selected);
    });

    it("returns null when no jobs are pending", () => {
        const scheduler = new FairScheduler();

        const pending = new Map<string, number>([
            ["tenant-a", 0],
            ["tenant-b", 0],
        ]);

        expect(
            scheduler.pickNextTenant(pending)
        ).toBeNull();
    });

    it("reduces credits after processing a job", () => {
        const scheduler = new FairScheduler();

        const pending = new Map<string, number>([
            ["tenant-a", 1],
        ]);

        scheduler.pickNextTenant(pending);
        scheduler.onJobProcessed("tenant-a");

        const credits =
            scheduler.getCreditsSnapshot();

        expect(credits["tenant-a"]).toBe(99);
    });
});
