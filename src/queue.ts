import { Queue } from "bullmq";
import Redis from "ioredis";

const redisHost = process.env.REDIS_HOST ?? "127.0.0.1";
const redisPort = Number(
    process.env.REDIS_PORT ?? 6379
);

export const redisConnection = {
    host: redisHost,
    port: redisPort,
};

export const redis = new (Redis as any)(
    redisConnection
);

export const taskQueue = new Queue(
    "taskflow",
    {
        connection: redisConnection,

        defaultJobOptions: {
            attempts: 3,

            backoff: {
                type: "exponential",
                delay: 1000,
            },
        },
    }
);

export const deadLetterQueue = new Queue(
    "taskflow-dead-letter",
    {
        connection: redisConnection,
    }
);