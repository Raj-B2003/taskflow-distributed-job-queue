import { db } from "./database.js";

export interface CreateJobInput {
    queueJobId: string;
    tenantId?: string;
    jobType: string;
    payload: Record<string, unknown>;
}

export async function createJob(
    input: CreateJobInput
): Promise<void> {
    await db.query(
        `
        INSERT INTO jobs (
            queue_job_id,
            tenant_id,
            job_type,
            status,
            attempts,
            payload
        )
        VALUES ($1, $2, $3, 'queued', 0, $4)
        `,
        [
            input.queueJobId,
            input.tenantId ?? null,
            input.jobType,
            input.payload,
        ]
    );
}

export async function markProcessing(
    queueJobId: string,
    attempt: number
): Promise<void> {
    await db.query(
        `
        UPDATE jobs
        SET
            status = 'processing',
            attempts = $2,
            started_at = COALESCE(started_at, NOW()),
            updated_at = NOW()
        WHERE queue_job_id = $1
        `,
        [
            queueJobId,
            attempt,
        ]
    );
}

export async function markCompleted(
    queueJobId: string,
    result: Record<string, unknown>
): Promise<void> {
    await db.query(
        `
        UPDATE jobs
        SET
            status = 'completed',
            result = $2,
            completed_at = NOW(),
            updated_at = NOW()
        WHERE queue_job_id = $1
        `,
        [
            queueJobId,
            result,
        ]
    );
}

export async function markFailed(
    queueJobId: string,
    errorMessage: string
): Promise<void> {
    await db.query(
        `
        UPDATE jobs
        SET
            status = 'failed',
            error_message = $2,
            updated_at = NOW()
        WHERE queue_job_id = $1
        `,
        [
            queueJobId,
            errorMessage,
        ]
    );
}

export async function markDeadLetter(
    queueJobId: string,
    errorMessage: string
): Promise<void> {
    await db.query(
        `
        UPDATE jobs
        SET
            status = 'dead-letter',
            error_message = $2,
            updated_at = NOW()
        WHERE queue_job_id = $1
        `,
        [
            queueJobId,
            errorMessage,
        ]
    );
}