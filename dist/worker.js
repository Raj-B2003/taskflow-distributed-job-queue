import { Worker } from "bullmq";
import { deadLetterQueue, redisConnection } from "./queue.js";
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function classifyError(error) {
    const message = error.message.toLowerCase();
    if (message.includes("timeout") ||
        message.includes("temporarily") ||
        message.includes("connection")) {
        return "transient";
    }
    return "permanent";
}
async function processJob(job) {
    console.log(`[Worker] Processing job ${job.id} | type=${job.data.type} | attempt=${job.attemptsMade + 1}`);
    await sleep(1000);
    // Simulate a temporary failure.
    // The first two attempts fail, then the job is allowed to continue.
    if (job.data.shouldFail === "transient" &&
        job.attemptsMade < 2) {
        throw new Error("Temporary service timeout");
    }
    // Simulate a permanent failure.
    if (job.data.shouldFail === "permanent") {
        throw new Error("Invalid job payload");
    }
    switch (job.data.type) {
        case "email":
            console.log(`[Worker] Sending email to ${job.data.to}`);
            break;
        case "report":
            console.log(`[Worker] Generating report: ${job.data.name}`);
            break;
        case "image":
            console.log(`[Worker] Processing image: ${job.data.filename}`);
            break;
        default:
            console.log("[Worker] Processing generic task");
    }
    return {
        success: true,
        processedAt: new Date().toISOString(),
    };
}
const worker = new Worker("taskflow", processJob, {
    connection: redisConnection,
    concurrency: 3,
});
worker.on("completed", job => {
    console.log(`[Worker] Job ${job.id} completed`);
});
worker.on("failed", async (job, error) => {
    if (!job) {
        return;
    }
    const errorType = classifyError(error);
    console.log(`[Worker] Job ${job.id} failed | type=${errorType} | attempt=${job.attemptsMade}`);
    const maxAttempts = job.opts.attempts ?? 1;
    if (errorType === "permanent" ||
        job.attemptsMade >= maxAttempts) {
        await deadLetterQueue.add("dead-letter", {
            originalJobId: job.id,
            originalJobName: job.name,
            originalData: job.data,
            error: error.message,
            failedAt: new Date().toISOString(),
            attempts: job.attemptsMade,
        });
        console.log(`[Worker] Job ${job.id} moved to dead-letter queue`);
    }
});
worker.on("error", error => {
    console.error(`[Worker] Worker error: ${error.message}`);
});
console.log("TaskFlow worker is running...");
//# sourceMappingURL=worker.js.map