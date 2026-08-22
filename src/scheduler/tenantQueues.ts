import { Queue } from "bullmq";
import { redisConnection } from "../queue.js";

const tenantQueues = new Map<string, Queue>();

export function getTenantQueue(tenantId: string): Queue {
    const existingQueue = tenantQueues.get(tenantId);

    if (existingQueue) {
        return existingQueue;
    }

    const queue = new Queue(`taskflow-${tenantId}`, {
        connection: redisConnection,
    });

    tenantQueues.set(tenantId, queue);

    return queue;
}

export function getKnownTenants(): string[] {
    return [...tenantQueues.keys()];
}