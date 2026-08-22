import { Queue } from "bullmq";
import { redisConnection } from "../queue.js";
const tenantQueues = new Map();
export function getTenantQueue(tenantId) {
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
export function getKnownTenants() {
    return [...tenantQueues.keys()];
}
//# sourceMappingURL=tenantQueues.js.map