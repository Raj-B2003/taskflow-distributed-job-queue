export type CircuitState =
    | "closed"
    | "open"
    | "half-open";

export class CircuitBreaker {
    private state: CircuitState = "closed";

    private failureCount = 0;

    private openedAt = 0;

    constructor(
        private readonly failureThreshold = 3,
        private readonly resetTimeoutMs = 5000
    ) {}

    canExecute(): boolean {
        if (this.state === "closed") {
            return true;
        }

        if (this.state === "open") {
            const elapsed =
                Date.now() - this.openedAt;

            if (elapsed >= this.resetTimeoutMs) {
                this.state = "half-open";
                return true;
            }

            return false;
        }

        // half-open allows one trial request.
        return true;
    }

    onSuccess(): void {
        this.failureCount = 0;
        this.state = "closed";
    }

    onFailure(): void {
        this.failureCount += 1;

        if (
            this.failureCount >=
            this.failureThreshold
        ) {
            this.state = "open";
            this.openedAt = Date.now();

            console.log(
                "[CircuitBreaker] OPEN"
            );
        }
    }

    getState(): CircuitState {
        return this.state;
    }
}