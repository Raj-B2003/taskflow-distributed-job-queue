import { db } from "./database.js";
import { createJob, markProcessing, markCompleted, } from "./jobRepository.js";
async function main() {
    const queueJobId = `repo-test-${Date.now()}`;
    try {
        await createJob({
            queueJobId,
            tenantId: "repository-test",
            jobType: "email",
            payload: {
                to: "repository@example.com",
            },
        });
        console.log(`[Repository] Created job ${queueJobId}`);
        await markProcessing(queueJobId, 1);
        console.log(`[Repository] Marked job ${queueJobId} as processing`);
        await markCompleted(queueJobId, {
            success: true,
            message: "Repository test completed",
        });
        console.log(`[Repository] Marked job ${queueJobId} as completed`);
        const result = await db.query(`
            SELECT
                queue_job_id,
                tenant_id,
                job_type,
                status,
                attempts,
                payload,
                result
            FROM jobs
            WHERE queue_job_id = $1
            `, [queueJobId]);
        console.log("[Repository] Database record:");
        console.log(result.rows[0]);
    }
    catch (error) {
        console.error("[Repository] Test failed:", error);
        process.exitCode = 1;
    }
    finally {
        await db.end();
    }
}
main();
//# sourceMappingURL=testRepository.js.map