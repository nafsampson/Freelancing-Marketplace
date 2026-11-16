const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { once } = require("node:events");
const CancelledTokens = require("../models/cancelledToken");

const User = require("../models/usersModel");
const Transaction = require("../models/Transaction");

const freelancerA = new mongoose.Types.ObjectId().toString();
const freelancerB = new mongoose.Types.ObjectId().toString();
const clientId = new mongoose.Types.ObjectId().toString();

const roles = new Map([
    [freelancerA, "Freelancer"],
    [freelancerB, "Freelancer"],
    [clientId, "Client"]
]);

const originalFindById = User.findById;
const originalAggregate = Transaction.aggregate;
const originalTransactionFind = Transaction.find;
const originalCountDocuments = Transaction.countDocuments;
const originalCancelledExists = CancelledTokens.exists;

let server;
let baseUrl;
let capturedPipeline;

function createToken(userId) {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: "10m" }
    );
}

function mockDatabase() {
    Transaction.countDocuments = async () => 0;
    User.findById = (id) => ({
        select: async () => {
            const role = roles.get(String(id));

            if (!role) {
                return null;
            }

            // Match the shape of a real MongoDB User document.
            return {
                _id: id,
                role
            };
        }
    });

    Transaction.aggregate = async (pipeline) => {
        capturedPipeline = pipeline;

        return [{
            _id: null,
            totalIncome: 100000,
            transactionCount: 2
        }];
    };

    Transaction.find = () => ({
        sort: () => ({
            limit: async () => []
        })
    });
    CancelledTokens.exists = async () => false;
}

test.before(async () => {
    process.env.JWT_SECRET = "test-only-jwt-secret-for-income-api";

    mockDatabase();

    const app = express();
    app.use(express.json());

    const transactionRoutes = require("../Routes/transactionRoutes");
    app.use("/api/transactions", transactionRoutes);

    server = app.listen(0);
    await once(server, "listening");

    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
    if (server) {
        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) reject(error);
                else resolve();
            });
               });
    }

    CancelledTokens.exists = originalCancelledExists;
    User.findById = originalFindById;
    Transaction.aggregate = originalAggregate;
    Transaction.find = originalTransactionFind;
    Transaction.countDocuments = originalCountDocuments;
});

test("Income endpoint rejects requests without an authentication token", async () => {
    const response = await fetch(`${baseUrl}/api/transactions/income`);

    assert.equal(response.status, 401);
});

test("Income endpoint rejects users who are not freelancers", async () => {
    const token = createToken(clientId);

    const response = await fetch(`${baseUrl}/api/transactions/income`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    assert.equal(response.status, 403);
});

test("Authenticated freelancer receives the expected financial information", async () => {
    const token = createToken(freelancerA);

    const response = await fetch(`${baseUrl}/api/transactions/income`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    assert.equal(response.status, 200);

    const body = await response.json();
    const income = body.data;

    assert.equal(income.freelancerId, freelancerA);
    assert.equal(income.taxYear, 2027);
    assert.equal(income.totalIncome, 100000);
    assert.equal(income.estimatedTax, 180);
    assert.equal(income.incomeAfterTax, 99820);
    assert.equal(income.transactionCount, 2);

    assert.ok(Array.isArray(income.transactions));
    assert.ok(income.disclaimer.includes("estimate"));
});

test("Income aggregation only includes the authenticated freelancer's transactions", async () => {
    const token = createToken(freelancerA);

    const response = await fetch(`${baseUrl}/api/transactions/income`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    assert.equal(response.status, 200);
    assert.ok(capturedPipeline);

    const match = capturedPipeline[0].$match;

    assert.equal(
        match.freelancerId.toString(),
        freelancerA
    );

    assert.notEqual(
        match.freelancerId.toString(),
        freelancerB
    );
});

test("Only completed transactions are included in earned income", async () => {
    const token = createToken(freelancerA);

    await fetch(`${baseUrl}/api/transactions/income`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const match = capturedPipeline[0].$match;

    assert.equal(match.status, "Completed");
    assert.equal(match.amount.$type, "number");
    assert.equal(match.amount.$gte, 0);
});

test("Income aggregation is restricted to the 2027 tax year", async () => {
    const token = createToken(freelancerA);

    await fetch(`${baseUrl}/api/transactions/income`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const createdAt = capturedPipeline[0].$match.completedAt;

    assert.ok(createdAt.$gte instanceof Date);
    assert.ok(createdAt.$lt instanceof Date);

    assert.equal(
        createdAt.$gte.toISOString(),
        "2026-02-28T22:00:00.000Z"
    );

    assert.equal(
        createdAt.$lt.toISOString(),
        "2027-02-28T22:00:00.000Z"
    );
});

test("A different freelancer receives a separately scoped income query", async () => {
    const token = createToken(freelancerB);

    const response = await fetch(`${baseUrl}/api/transactions/income`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    assert.equal(response.status, 200);

    const match = capturedPipeline[0].$match;

    assert.equal(
        match.freelancerId.toString(),
        freelancerB
    );

    assert.notEqual(
        match.freelancerId.toString(),
        freelancerA
    );
});
