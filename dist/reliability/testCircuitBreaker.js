import { CircuitBreaker } from "./circuitBreaker.js";
async function main() {
    const breaker = new CircuitBreaker(3, 2000);
    console.log("Initial:", breaker.getState());
    for (let i = 1; i <= 3; i++) {
        if (breaker.canExecute()) {
            console.log(`Request ${i}: allowed`);
            breaker.onFailure();
        }
    }
    console.log("After failures:", breaker.getState());
    console.log("Request while open:", breaker.canExecute());
    await new Promise(resolve => setTimeout(resolve, 2500));
    console.log("After cooldown:", breaker.getState());
    console.log("Trial request:", breaker.canExecute());
    breaker.onSuccess();
    console.log("After recovery:", breaker.getState());
}
main();
//# sourceMappingURL=testCircuitBreaker.js.map