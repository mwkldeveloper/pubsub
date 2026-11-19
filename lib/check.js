const assert = require("assert");
const { resourceName, attributeMap, messageData } = require("./safe");

assert.strictEqual(
  resourceName("font2art-staging", "topics", "batch-job-status"),
  "projects/font2art-staging/topics/batch-job-status",
);
assert.strictEqual(
  resourceName("font2art-staging", "subscriptions", "projects/font2art-staging/subscriptions/batch-job-status-sub"),
  "projects/font2art-staging/subscriptions/batch-job-status-sub",
);
assert.throws(() => resourceName("font2art-staging", "topics", "projects/other/topics/batch-job-status"));
assert.throws(() => resourceName("font2art-staging", "topics", "../batch"));
assert.throws(() => resourceName("font2art-staging", "subscriptions", "/regex/i"));

assert.deepStrictEqual(attributeMap('{"JobName":"abc","n":1}'), { JobName: "abc", n: "1" });
assert.throws(() => attributeMap('{"bad name":"x"}'));
assert.throws(() => attributeMap("[1]"));

assert.strictEqual(messageData(Buffer.from("ok")), "ok");
assert.strictEqual(messageData(Buffer.from(""), true), "");
assert.deepStrictEqual(messageData(Buffer.from('{"a":1}'), true), { a: 1 });
assert.throws(() => messageData(Buffer.from("not-json"), true));
assert.throws(() => messageData(Buffer.alloc(1000001), false));

console.log("ok");
