import assert from "node:assert";
import { splitEqually, splitProportionally, calculateSettlement } from "../src/lib/splits-logic.js";

console.log("Starting Splits Logic Unit Tests...\n");

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ Passed: ${name}`);
  } catch (error: any) {
    console.error(`❌ Failed: ${name}`);
    console.error(error);
    process.exit(1);
  }
}

// -------------------------------------------------------------
// 1. Equal Split Tests
// -------------------------------------------------------------
runTest("splitEqually - exact division", () => {
  const result = splitEqually(120.00, ["user1", "user2", "user3"]);
  assert.deepStrictEqual(result, [
    { userId: "user1", amount: 40.00 },
    { userId: "user2", amount: 40.00 },
    { userId: "user3", amount: 40.00 },
  ]);
});

runTest("splitEqually - division with positive remainder (10 / 3)", () => {
  const result = splitEqually(10.00, ["user1", "user2", "user3"]);
  // Should distribute 3.33 to everyone, plus 0.01 to user1
  assert.deepStrictEqual(result, [
    { userId: "user1", amount: 3.34 },
    { userId: "user2", amount: 3.33 },
    { userId: "user3", amount: 3.33 },
  ]);
  const total = result.reduce((sum, r) => sum + r.amount, 0);
  assert.strictEqual(Math.round(total * 100) / 100, 10.00);
});

runTest("splitEqually - division with negative remainder (-10 / 3)", () => {
  const result = splitEqually(-10.00, ["user1", "user2", "user3"]);
  // Should distribute -3.33 to everyone, plus -0.01 to user1
  assert.deepStrictEqual(result, [
    { userId: "user1", amount: -3.34 },
    { userId: "user2", amount: -3.33 },
    { userId: "user3", amount: -3.33 },
  ]);
  const total = result.reduce((sum, r) => sum + r.amount, 0);
  assert.strictEqual(Math.round(total * 100) / 100, -10.00);
});

runTest("splitEqually - zero amount", () => {
  const result = splitEqually(0.00, ["user1", "user2"]);
  assert.deepStrictEqual(result, [
    { userId: "user1", amount: 0.00 },
    { userId: "user2", amount: 0.00 },
  ]);
});

// -------------------------------------------------------------
// 2. Proportional Split Tests
// -------------------------------------------------------------
runTest("splitProportionally - 60/40 ratio", () => {
  const shares = [
    { userId: "user1", share: 3 }, // 60%
    { userId: "user2", share: 2 }, // 40%
  ];
  const result = splitProportionally(100.00, shares);
  assert.deepStrictEqual(result, [
    { userId: "user1", amount: 60.00 },
    { userId: "user2", amount: 40.00 },
  ]);
});

runTest("splitProportionally - remainder distribution (100 / 3 proportional)", () => {
  const shares = [
    { userId: "user1", share: 1 },
    { userId: "user2", share: 1 },
    { userId: "user3", share: 1 },
  ];
  const result = splitProportionally(100.00, shares);
  assert.deepStrictEqual(result, [
    { userId: "user1", amount: 33.34 },
    { userId: "user2", amount: 33.33 },
    { userId: "user3", amount: 33.33 },
  ]);
});

runTest("splitProportionally - negative amount", () => {
  const shares = [
    { userId: "user1", share: 3 },
    { userId: "user2", share: 2 },
  ];
  const result = splitProportionally(-100.00, shares);
  assert.deepStrictEqual(result, [
    { userId: "user1", amount: -60.00 },
    { userId: "user2", amount: -40.00 },
  ]);
});

// -------------------------------------------------------------
// 3. Settlement Calculation Tests
// -------------------------------------------------------------
runTest("calculateSettlement - simple debtor / creditor pair", () => {
  const balances = {
    userA: 50.00,  // Creditor
    userB: -50.00, // Debtor
  };
  const result = calculateSettlement(balances);
  assert.deepStrictEqual(result, [
    { from: "userB", to: "userA", amount: 50.00 }
  ]);
});

runTest("calculateSettlement - complex balances", () => {
  const balances = {
    userA: 60.00,  // creditor
    userB: -40.00, // debtor
    userC: -20.00, // debtor
  };
  const result = calculateSettlement(balances);
  assert.deepStrictEqual(result, [
    { from: "userB", to: "userA", amount: 40.00 },
    { from: "userC", to: "userA", amount: 20.00 },
  ]);
});

runTest("calculateSettlement - circular debt resolution", () => {
  const balances = {
    userA: 30.00,  // creditor
    userB: -10.00, // debtor
    userC: -20.00, // debtor
    userD: 0.00,   // balanced
  };
  const result = calculateSettlement(balances);
  assert.deepStrictEqual(result, [
    { from: "userC", to: "userA", amount: 20.00 },
    { from: "userB", to: "userA", amount: 10.00 },
  ]);
});

console.log("\n🎉 All tests passed successfully!");
