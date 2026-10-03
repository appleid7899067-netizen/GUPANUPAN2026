const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { compileLib } = require("./ts-compile.cjs");

const { mods, cleanup } = compileLib(["src/lib/puter.ts"]);
const puter = mods[0];
after(() => cleanup());

test("readPuterToken อ่านจาก authToken ก่อน แล้วค่อยตกไปที่ localStorage", () => {
  const storage = { getItem: (key) => (key === "puter.auth.token" ? "from-storage-123456" : null) };

  assert.equal(
    puter.readPuterToken({ authToken: "from-sdk-abcdefghij", storage }),
    "from-sdk-abcdefghij",
    "ค่าในหน่วยความจำของ SDK ต้องมาก่อน",
  );
  assert.equal(
    puter.readPuterToken({ authToken: undefined, storage }),
    "from-storage-123456",
  );
  assert.equal(puter.readPuterToken({ authToken: "   ", storage }), "from-storage-123456", "ช่องว่างล้วนไม่นับ");
  assert.equal(puter.readPuterToken({ authToken: null, storage: null }), null);
});

test("readPuterToken ไม่พังเมื่อ storage โยน error (โหมดส่วนตัว/ปิด storage)", () => {
  const hostile = {
    getItem() {
      throw new Error("SecurityError");
    },
  };
  assert.equal(puter.readPuterToken({ authToken: undefined, storage: hostile }), null);
  assert.equal(puter.readPuterToken({ authToken: 42, storage: hostile }), null, "ค่าที่ไม่ใช่สตริงต้องถูกเมิน");
});

test("maskToken ไม่เผย token ทั้งก้อน", () => {
  const token = "abcdef1234567890xyz";
  const masked = puter.maskToken(token);
  assert.ok(!masked.includes("7890xyz".slice(0, 3)), "ท้าย token ต้องไม่โผล่ทั้งก้อน");
  assert.ok(masked.startsWith("abcdef"));
  assert.ok(masked.endsWith("0xyz"));
  assert.ok(masked.length < token.length);
  assert.equal(puter.maskToken("สั้น"), "***");
});

test("คำสั่งสำหรับเทอร์มินัลชี้ไปที่สคริปต์ล็อกอินของชุด agent", () => {
  const command = puter.terminalTokenCommand();
  assert.match(command, /puter-login\.mjs --set-token/);
  assert.ok(!command.includes("PUTER_AUTH_TOKEN="), "ต้องไม่ฝัง token ลงในสตริงคำสั่ง");
});
