import { FairDispatcher } from "./dispatcher.js";
import { getTenantQueue } from "./tenantQueues.js";
async function clearQueue(tenantId) {
    const queue = await getTenantQueue(tenantId);
    await queue.obliterate({
        force: true,
    });
}
async function addJob(tenantId, type, data) {
    const queue = await getTenantQueue(tenantId);
    await queue.add(type, {
        tenantId,
        type,
        ...data,
    });
}
async function main() {
    const tenantA = "fair-run-a";
    const tenantB = "fair-run-b";
    const tenantC = "fair-run-c";
    // Start with clean queues.
    await clearQueue(tenantA);
    await clearQueue(tenantB);
    await clearQueue(tenantC);
    // Tenant A has 3 jobs.
    await addJob(tenantA, "email", {
        to: "a1@example.com",
    });
    await addJob(tenantA, "email", {
        to: "a2@example.com",
    });
    await addJob(tenantA, "email", {
        to: "a3@example.com",
    });
    // Tenant B has 1 job.
    await addJob(tenantB, "report", {
        name: "monthly-report",
    });
    // Tenant C has 1 job.
    await addJob(tenantC, "image", {
        filename: "photo.jpg",
    });
    const dispatcher = new FairDispatcher();
    console.log("\n=== Initial queue state ===\n");
    console.log(await dispatcher.getPendingCounts());
    console.log("\n=== Starting fair dispatch ===\n");
    for (let i = 0; i < 5; i++) {
        const job = await dispatcher.pickNextJob();
        if (!job) {
            console.log("No pending jobs.");
            break;
        }
        console.log(`Processing job ${job.id} | tenant=${job.data.tenantId}`);
        await dispatcher.completeJob(job);
        console.log("");
    }
    console.log("=== Final queue state ===\n");
    console.log(await dispatcher.getPendingCounts());
    console.log("\n=== Final credit snapshot ===\n");
    console.log(dispatcher.getCredits());
}
main().catch(error => {
    console.error("Dispatcher test failed:", error);
    process.exit(1);
});
//# sourceMappingURL=testDispatcher.js.map