import { FairDispatcher } from "./dispatcher.js";
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function processJob(job) {
    console.log(`[FairWorker] Processing job ${job.id} | tenant=${job.data.tenantId} | type=${job.name}`);
    await sleep(1000);
    switch (job.name) {
        case "email":
            console.log(`[FairWorker] Sending email to ${job.data.to}`);
            break;
        case "report":
            console.log(`[FairWorker] Generating report: ${job.data.name}`);
            break;
        case "image":
            console.log(`[FairWorker] Processing image: ${job.data.filename}`);
            break;
        default:
            console.log(`[FairWorker] Processing generic job`);
    }
}
async function runWorker() {
    const dispatcher = new FairDispatcher();
    console.log("[FairWorker] Fair worker started...");
    while (true) {
        try {
            const job = await dispatcher.pickNextJob();
            if (!job) {
                await sleep(1000);
                continue;
            }
            try {
                await processJob(job);
                await dispatcher.completeJob(job);
            }
            catch (error) {
                console.error(`[FairWorker] Job ${job.id} failed:`, error);
            }
        }
        catch (error) {
            console.error("[FairWorker] Dispatcher error:", error);
            await sleep(1000);
        }
    }
}
runWorker().catch(error => {
    console.error("[FairWorker] Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=fairWorker.js.map