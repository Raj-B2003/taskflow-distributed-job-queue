import { describe, expect, it } from "vitest";
import { CircuitBreaker } from "../reliability/circuitBreaker.js";

describe("CircuitBreaker", () => {
    it("starts in the closed state", () => {
        const breaker = new CircuitBreaker(3, 1000);

        expect(breaker.getState()).toBe("closed");
        expect(breaker.canExecute()).toBe(true);
    });

    it("opens after reaching the failure threshold", () => {
        const breaker = new CircuitBreaker(3, 1000);

        breaker.onFailure();
        breaker.onFailure();
        breaker.onFailure();

        expect(breaker.getState()).toBe("open");
        expect(breaker.canExecute()).toBe(false);
    });

    it("recovers after the cooldown period", async () => {
        const breaker = new CircuitBreaker(1, 50);

        breaker.onFailure();

        expect(breaker.getState()).toBe("open");

        await new Promise(resolve =>
            setTimeout(resolve, 75)
        );

        expect(breaker.canExecute()).toBe(true);
        expect(breaker.getState()).toBe("half-open");

        breaker.onSuccess();

        expect(breaker.getState()).toBe("closed");
        expect(breaker.canExecute()).toBe(true);
    });
});