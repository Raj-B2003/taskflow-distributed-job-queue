import pg from "pg";

const { Pool } = pg;

const databaseHost =
    process.env.DB_HOST ?? "127.0.0.1";

const databasePort = Number(
    process.env.DB_PORT ?? 5432
);

const databaseName =
    process.env.DB_NAME ?? "taskflow";

const databaseUser =
    process.env.DB_USER ?? "taskflow_user";

const databasePassword =
    process.env.DB_PASSWORD ?? "taskflow_dev";

export const db = new Pool({
    host: databaseHost,
    port: databasePort,
    database: databaseName,
    user: databaseUser,
    password: databasePassword,

    max: 10,

    idleTimeoutMillis: 30000,
});

export async function checkDatabase(): Promise<void> {
    const result = await db.query(
        "SELECT NOW()"
    );

    console.log(
        `[Database] Connected at ${result.rows[0].now}`
    );
}