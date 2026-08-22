import { Worker } from "bullmq";
import { redisConnection } from "./queue.js";

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function processJob(job: any) {
    console.log(
        `[Worker] Processing job ${job.id} | type=${job.data.type}`
    );

    await sleep(1500);

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

const worker = new Worker(
    "taskflow",
    processJob,
    {
        connection: redisConnection,
        concurrency: 3,
    }
);

worker.on("completed", job => {
    console.log(`[Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
    console.log(
        `[Worker] Job ${job?.id} failed: ${error.message}`
    );
});

worker.on("error", error => {
    console.error(`[Worker] Error: ${error.message}`);
});

console.log("TaskFlow worker is running...");