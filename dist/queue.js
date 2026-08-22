"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskQueue = exports.redis = exports.redisConnection = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
exports.redisConnection = {
    host: "127.0.0.1",
    port: 6379,
};
exports.redis = new ioredis_1.default(exports.redisConnection);
exports.taskQueue = new bullmq_1.Queue("taskflow", {
    connection: exports.redisConnection,
});
//# sourceMappingURL=queue.js.map