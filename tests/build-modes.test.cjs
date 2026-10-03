const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { compileLib } = require("./ts-compile.cjs");

const { mods, cleanup } = compileLib(["src/lib/build-modes.ts", "src/lib/builder.ts"]);
const modes = mods[0];
const builder = mods[1];
after(() => cleanup());

test("ทุกโหมดมีข้อมูลครบและ id ไม่ซ้ำ", () => {
  assert.ok(modes.BUILD_MODES.length >= 6, "ควรมีโหมดให้เลือกหลายแบบ");
  const ids = new Set();
  for (const mode of modes.BUILD_MODES) {
    assert.ok(mode.id && !ids.has(mode.id), `id ซ้ำหรือว่าง: ${mode.id}`);
    ids.add(mode.id);
    assert.ok(mode.label.trim(), `โหมด ${mode.id} ไม่มีชื่อ`);
    assert.ok(mode.hint.trim(), `โหมด ${mode.id} ไม่มีคำอธิบาย`);
    assert.match(mode.instruction, /^MODE: /, `โหมด ${mode.id} ต้องขึ้นต้นด้วย MODE:`);
    assert.ok(mode.instruction.length > 60, `โหมด ${mode.id} คำสั่งสั้นเกินไป`);
  }
  assert.ok(ids.has(modes.DEFAULT_MODE_ID));
});

test("systemPromptFor ต่อกติกากลางกับกติกาของโหมด และตกไปที่โหมดเริ่มต้นเมื่อ id ไม่รู้จัก", () => {
  const base = modes.systemPromptFor(modes.DEFAULT_MODE_ID);
  assert.ok(base.startsWith(builder.BUILD_SYSTEM_PROMPT), "ต้องเริ่มด้วยกติกากลางของบิลเดอร์");

  const game = modes.systemPromptFor("game");
  assert.ok(game.includes(builder.BUILD_SYSTEM_PROMPT));
  assert.ok(game.includes("MODE: browser game"));

  assert.equal(modes.systemPromptFor("ไม่มีโหมดนี้"), base);
  assert.equal(modes.systemPromptFor(null), base);
  assert.equal(modes.getBuildMode(undefined).id, modes.DEFAULT_MODE_ID);
  assert.equal(modes.isBuildModeId("dashboard"), true);
  assert.equal(modes.isBuildModeId("nope"), false);
});

test("prompt ของทุกโหมดไม่ขัดกับข้อจำกัดของพรีวิว (ไม่มี CDN/fetch)", () => {
  for (const mode of modes.BUILD_MODES) {
    const prompt = modes.systemPromptFor(mode.id);
    assert.ok(
      /no external|external resources|no imports|inline/i.test(prompt),
      `โหมด ${mode.id} ต้องย้ำเรื่องไฟล์ภายนอก`,
    );
  }
});
