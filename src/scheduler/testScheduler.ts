import { FairScheduler } from "./fairDispatch.js";

const scheduler = new FairScheduler();

const pendingJobs = new Map<string, number>([
    ["tenant-a", 10],
    ["tenant-b", 2],
    ["tenant-c", 2],
]);

console.log("Initial pending jobs:");
console.log(Object.fromEntries(pendingJobs));

for (let i = 0; i < 9; i++) {
    const selectedTenant = scheduler.pickNextTenant(pendingJobs);

    if (!selectedTenant) {
        console.log("No tenant has pending jobs.");
        break;
    }

    console.log(
        `Selected ${selectedTenant} | pending=${pendingJobs.get(selectedTenant)}`
    );

    pendingJobs.set(
        selectedTenant,
        pendingJobs.get(selectedTenant)! - 1
    );

    scheduler.onJobProcessed(selectedTenant);
}

console.log("\nRemaining jobs:");
console.log(Object.fromEntries(pendingJobs));

console.log("\nCredit snapshot:");
console.log(scheduler.getCreditsSnapshot());