import { Queue } from "bullmq";
import { redis, redisConnection } from "../queue.js";
const tenantQueues = new Map();
const TENANT_REGISTRY_KEY = "taskflow:tenants";
export async function getTenantQueue(tenantId) {
    const existingQueue = tenantQueues.get(tenantId);
    if (existingQueue) {
        return existingQueue;
    }
    const queue = new Queue(`taskflow-${tenantId}`, {
        connection: redisConnection,
    });
    tenantQueues.set(tenantId, queue);
    // Register the tenant in Redis so other processes
    // can discover the same tenant.
    await redis.sadd(TENANT_REGISTRY_KEY, tenantId);
    return queue;
}
export async function getKnownTenants() {
    return redis.smembers(TENANT_REGISTRY_KEY);
}
//# sourceMappingURL=tenantQueues.js.map