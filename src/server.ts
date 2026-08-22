import express from "express";
import { redis, taskQueue, deadLetterQueue } from "./queue.js";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
    res.json({
        name: "TaskFlow",
        status: "running",
    });
});

app.post("/jobs", async (req, res) => {
    try {
        const { type, idempotencyKey, ...data } = req.body;

        if (!type) {
            return res.status(400).json({
                error: "Job type is required",
            });
        }

        if (!idempotencyKey) {
            return res.status(400).json({
                error: "Idempotency key is required",
            });
        }

        const redisKey = `idem:${idempotencyKey}`;

        // Reserve the idempotency key atomically.
        // NX means the key is created only when it does not already exist.
        const lockAcquired = await redis.set(
            redisKey,
            "creating",
            "EX",
            86400,
            "NX"
        );

        if (!lockAcquired) {
            const existingJobId = await redis.get(redisKey);

            if (existingJobId && existingJobId !== "creating") {
                return res.status(200).json({
                    message: "Job already exists",
                    jobId: existingJobId,
                    duplicate: true,
                });
            }

            return res.status(409).json({
                message: "A job with this idempotency key is already being created",
                duplicate: true,
            });
        }

        try {
            const job = await taskQueue.add(type, {
                type,
                idempotencyKey,
                ...data,
            });

            await redis.set(
                redisKey,
                String(job.id),
                "EX",
                86400
            );

            return res.status(201).json({
                message: "Job added",
                jobId: job.id,
                type: job.name,
                duplicate: false,
            });
        } catch (error) {
            // Release the reservation if job creation failed.
            await redis.del(redisKey);
            throw error;
        }
    } catch (error) {
        console.error("Failed to create job:", error);

        return res.status(500).json({
            error: "Failed to create job",
        });
    }
});

app.get("/jobs/:id", async (req, res) => {
    try {
        const job = await taskQueue.getJob(req.params.id);

        if (!job) {
            return res.status(404).json({
                error: "Job not found",
            });
        }

        const state = await job.getState();

        return res.json({
            id: job.id,
            type: job.name,
            state,
            attemptsMade: job.attemptsMade,
            data: job.data,
            result: job.returnvalue ?? null,
            failedReason: job.failedReason ?? null,
        });
    } catch (error) {
        console.error("Failed to fetch job:", error);

        return res.status(500).json({
            error: "Failed to fetch job",
        });
    }
});

app.get("/metrics", async (_req, res) => {
    try {
        const counts = await taskQueue.getJobCounts(
            "waiting",
            "active",
            "completed",
            "failed",
            "delayed"
        );

        return res.json({
            queue: "taskflow",
            ...counts,
        });
    } catch (error) {
        console.error("Failed to fetch metrics:", error);

        return res.status(500).json({
            error: "Failed to fetch metrics",
        });
    }
});

app.get("/dead-letters", async (_req, res) => {
    try {
        const jobs = await deadLetterQueue.getJobs(
            ["waiting", "active", "completed", "failed"],
            0,
            49
        );

        const deadLetters = jobs.map(job => ({
            id: job.id,
            data: job.data,
            state: "dead-letter",
        }));

        return res.json({
            queue: "taskflow-dead-letter",
            count: deadLetters.length,
            jobs: deadLetters,
        });
    } catch (error) {
        console.error("Failed to fetch dead-letter jobs:", error);

        return res.status(500).json({
            error: "Failed to fetch dead-letter jobs",
        });
    }
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`TaskFlow API running on port ${PORT}`);
});