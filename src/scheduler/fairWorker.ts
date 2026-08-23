import { Job } from "bullmq";
import { FairDispatcher } from "./dispatcher.js";
import { deadLetterQueue } from "../queue.js";

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function classifyError(
    error: Error
): "transient" | "permanent" {
    const message = error.message.toLowerCase();

    if (
        message.includes("timeout") ||
        message.includes("temporarily") ||
        message.includes("connection")
    ) {
        return "transient";
    }

    return "permanent";
}

async function processJob(job: Job): Promise<void> {
    console.log(
        `[FairWorker] Processing job ${job.id} | tenant=${job.data.tenantId} | type=${job.name} | attempt=${job.attemptsMade + 1}`
    );

    await sleep(1000);

    // Test mode: transient failures recover after two attempts.
    if (
        job.data.shouldFail === "transient" &&
        job.attemptsMade < 2
    ) {
        throw new Error("Temporary service timeout");
    }

    // Test mode: permanent failures never recover.
    if (job.data.shouldFail === "permanent") {
        throw new Error("Invalid job payload");
    }

    switch (job.name) {
        case "email":
            console.log(
                `[FairWorker] Sending email to ${job.data.to}`
            );
            break;

        case "report":
            console.log(
                `[FairWorker] Generating report: ${job.data.name}`
            );
            break;

        case "image":
            console.log(
                `[FairWorker] Processing image: ${job.data.filename}`
            );
            break;

        default:
            console.log(
                "[FairWorker] Processing generic job"
            );
    }
}

async function moveToDeadLetter(
    job: Job,
    error: Error
): Promise<void> {
    await deadLetterQueue.add(
        "dead-letter",
        {
            originalJobId: job.id,
            originalJobName: job.name,
            originalData: job.data,
            error: error.message,
            failedAt: new Date().toISOString(),
            attempts: job.attemptsMade,
        }
    );

    console.log(
        `[FairWorker] Job ${job.id} moved to dead-letter queue`
    );
}

async function runWorker(): Promise<void> {
    const dispatcher = new FairDispatcher();

    console.log(
        "[FairWorker] Fair worker started..."
    );

    while (true) {
        try {
            const job =
                await dispatcher.pickNextJob();

            if (!job) {
                await sleep(1000);
                continue;
            }

            try {
                await processJob(job);

                await dispatcher.completeJob(job);
            } catch (error) {
                const jobError =
                    error instanceof Error
                        ? error
                        : new Error(String(error));

                const errorType =
                    classifyError(jobError);

                console.log(
                    `[FairWorker] Job ${job.id} failed | type=${errorType} | attempt=${job.attemptsMade + 1}`
                );

                // Transient failures get another chance.
                // We keep the job in the queue instead of
                // completing it.
                if (errorType === "transient") {
                    if (job.attemptsMade < 2) {
                        console.log(
                            `[FairWorker] Retrying job ${job.id}`
                        );

                        await sleep(1000);
                        continue;
                    }
                }

                // Permanent errors, or exhausted transient retries,
                // are sent to the dead-letter queue.
                await moveToDeadLetter(
                    job,
                    jobError
                );

                await dispatcher.completeJob(
                    job
                );
            }

        } catch (error) {
            console.error(
                "[FairWorker] Dispatcher error:",
                error
            );

            await sleep(1000);
        }
    }
}

runWorker().catch(error => {
    console.error(
        "[FairWorker] Fatal error:",
        error
    );

    process.exit(1);
});