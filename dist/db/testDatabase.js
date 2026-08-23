import { checkDatabase, db } from "./database.js";
async function main() {
    try {
        await checkDatabase();
        console.log("[Database] PostgreSQL connection successful");
    }
    catch (error) {
        console.error("[Database] Connection failed:", error);
        process.exitCode = 1;
    }
    finally {
        await db.end();
    }
}
main();
//# sourceMappingURL=testDatabase.js.map