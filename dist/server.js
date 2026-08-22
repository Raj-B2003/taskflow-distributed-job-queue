"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const queue_js_1 = require("./queue.js");
const app = (0, express_1.default)();
app.use(express_1.default.json());
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
        // Reserve this idempotency key atomically.
        // NX means Redis only creates the key if it does not already exist.
        const lockAcquired = await queue_js_1.redis.set(redisKey, "creating", "EX", 86400, "NX");
        if (!lockAcquired) {
            const existingJobId = await queue_js_1.redis.get(redisKey);
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
            const job = await queue_js_1.taskQueue.add(type, {
                type,
                idempotencyKey,
                ...data,
            });
            await queue_js_1.redis.set(redisKey, String(job.id), "EX", 86400);
            return res.status(201).json({
                message: "Job added",
                jobId: job.id,
                type: job.name,
                duplicate: false,
            });
        }
        catch (error) {
            // Release the reservation if job creation failed.
            await queue_js_1.redis.del(redisKey);
            throw error;
        }
    }
    catch (error) {
        console.error("Failed to create job:", error);
        return res.status(500).json({
            error: "Failed to create job",
        });
    }
});
app.get("/jobs/:id", async (req, res) => {
    try {
        const job = await queue_js_1.taskQueue.getJob(req.params.id);
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
    }
    catch (error) {
        console.error("Failed to fetch job:", error);
        return res.status(500).json({
            error: "Failed to fetch job",
        });
    }
});
app.get("/metrics", async (_req, res) => {
    try {
        const counts = await queue_js_1.taskQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
        return res.json({
            queue: "taskflow",
            ...counts,
        });
    }
    catch (error) {
        console.error("Failed to fetch metrics:", error);
        return res.status(500).json({
            error: "Failed to fetch metrics",
        });
    }
});
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`TaskFlow API running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map