import { Queue } from "bullmq";
import Redis from "ioredis";
export const redisConnection = {
    host: "127.0.0.1",
    port: 6379,
};
export const redis = new Redis(redisConnection);
export const taskQueue = new Queue("taskflow", {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000,
        },
    },
});
export const deadLetterQueue = new Queue("taskflow-dead-letter", {
    connection: redisConnection,
});
//# sourceMappingURL=queue.js.map