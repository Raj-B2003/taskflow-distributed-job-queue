import { Job } from "bullmq";

import { FairDispatcher } from "./dispatcher.js";

import {
    createJob as createDatabaseJob,
    markProcessing,
    markCompleted,
    markDeadLetter,
} from "../db/jobRepository.js";

import { deadLetterQueue } from "../queue.js";

import { getTenantQueue } from "./tenantQueues.js";

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

async function processJob(job: Job): Promise<Record<string, unknown>> {
    console.log(
        `[FairWorker] Processing job ${job.id} | tenant=${job.data.tenantId} | type=${job.name} | attempt=${job.data.attemptNumber ?? 1}`
    );

    await markProcessing(
        String(job.data.originalJobId ?? job.id),
        Number(job.data.attemptNumber ?? 1)
    );

    await sleep(1000);

    // Simulate a transient error for the first two attempts.
    if (
        job.data.shouldFail === "transient" &&
        Number(job.data.attemptNumber ?? 1) < 3
    ) {
        throw new Error("Temporary service timeout");
    }

    // Simulate a permanent error.
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

    return {
        success: true,
        processedAt: new Date().toISOString(),
    };
}

async function createRetryJob(
    job: Job
): Promise<void> {
    const tenantId = String(job.data.tenantId);

    const currentAttempt =
        Number(job.data.attemptNumber ?? 1);

    const nextAttempt =
        currentAttempt + 1;

    const tenantQueue =
        await getTenantQueue(tenantId);

    const retryJob =
        await tenantQueue.add(
            job.name,
            {
                ...job.data,
                originalJobId:
                    job.data.originalJobId ?? job.id,
                attemptNumber: nextAttempt,
            }
        );

    console.log(
        `[FairWorker] Created retry job ${retryJob.id} for original job ${job.data.originalJobId ?? job.id} | attempt=${nextAttempt}`
    );
}

async function moveToDeadLetter(
    job: Job,
    error: Error
): Promise<void> {
    const originalJobId =
        String(
            job.data.originalJobId ?? job.id
        );

    const attemptNumber =
        Number(job.data.attemptNumber ?? 1);

    await deadLetterQueue.add(
        "dead-letter",
        {
            originalJobId,
            originalJobName: job.name,
            originalData: job.data,
            error: error.message,
            failedAt:
                new Date().toISOString(),
            attempts: attemptNumber,
        }
    );

    await markDeadLetter(
        originalJobId,
        error.message
    );

    console.log(
        `[FairWorker] Job ${originalJobId} moved to dead-letter queue`
    );
}

async function runWorker(): Promise<void> {
    const dispatcher =
        new FairDispatcher();

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
                const result =
                    await processJob(job);

                const originalJobId =
                    String(
                        job.data.originalJobId ??
                        job.id
                    );

                await markCompleted(
                    originalJobId,
                    result
                );

                await dispatcher.completeJob(
                    job
                );

            } catch (error) {
                const jobError =
                    error instanceof Error
                        ? error
                        : new Error(
                            String(error)
                        );

                const errorType =
                    classifyError(jobError);

                const attemptNumber =
                    Number(
                        job.data.attemptNumber ?? 1
                    );

                console.log(
                    `[FairWorker] Job ${job.id} failed | type=${errorType} | attempt=${attemptNumber}`
                );

                if (
                    errorType === "transient" &&
                    attemptNumber < 3
                ) {
                    await createRetryJob(job);

                    await dispatcher.completeJob(
                        job
                    );

                    continue;
                }

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
