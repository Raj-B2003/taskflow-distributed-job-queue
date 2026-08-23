import pg from "pg";

const { Pool } = pg;

export const db = new Pool({
    host: "127.0.0.1",
    port: 5432,
    database: "taskflow",
    user: "taskflow_user",
    password: "taskflow_dev",
    max: 10,
    idleTimeoutMillis: 30000,
});

export async function checkDatabase(): Promise<void> {
    const result = await db.query("SELECT NOW()");

    console.log(
        `[Database] Connected at ${result.rows[0].now}`
    );
}