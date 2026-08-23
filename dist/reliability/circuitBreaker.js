export class CircuitBreaker {
    failureThreshold;
    resetTimeoutMs;
    state = "closed";
    failureCount = 0;
    openedAt = 0;
    constructor(failureThreshold = 3, resetTimeoutMs = 5000) {
        this.failureThreshold = failureThreshold;
        this.resetTimeoutMs = resetTimeoutMs;
    }
    canExecute() {
        if (this.state === "closed") {
            return true;
        }
        if (this.state === "open") {
            const elapsed = Date.now() - this.openedAt;
            if (elapsed >= this.resetTimeoutMs) {
                this.state = "half-open";
                return true;
            }
            return false;
        }
        // half-open allows one trial request.
        return true;
    }
    onSuccess() {
        this.failureCount = 0;
        this.state = "closed";
    }
    onFailure() {
        this.failureCount += 1;
        if (this.failureCount >=
            this.failureThreshold) {
            this.state = "open";
            this.openedAt = Date.now();
            console.log("[CircuitBreaker] OPEN");
        }
    }
    getState() {
        return this.state;
    }
}
//# sourceMappingURL=circuitBreaker.js.map