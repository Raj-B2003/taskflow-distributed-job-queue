CREATE TABLE IF NOT EXISTS jobs (
    id BIGSERIAL PRIMARY KEY,

    queue_job_id VARCHAR(100) NOT NULL,
    tenant_id VARCHAR(100),

    job_type VARCHAR(100) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'queued',

    attempts INTEGER NOT NULL DEFAULT 0,

    payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    result JSONB,

    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,

    completed_at TIMESTAMPTZ,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT jobs_status_check
        CHECK (
            status IN (
                'queued',
                'processing',
                'completed',
                'failed',
                'dead-letter'
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_jobs_tenant_id
    ON jobs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_jobs_status
    ON jobs(status);

CREATE INDEX IF NOT EXISTS idx_jobs_queue_job_id
    ON jobs(queue_job_id);

CREATE INDEX IF NOT EXISTS idx_jobs_created_at
    ON jobs(created_at);