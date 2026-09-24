export type BossSkillId =
  | "web-research"
  | "app-build"
  | "app-edit"
  | "debug-recovery"
  | "github-workflow"
  | "deploy-verify"
  | "visual-review";

export type BossSkill = {
  id: BossSkillId;
  description: string;
  intents: string[];
  needs: string[];
};

export const BOSS_SKILLS: BossSkill[] = [
  { id: "web-research", description: "ค้นหาและรวบรวมข้อมูลจากเว็บก่อนลงมือ", intents: ["search", "research"], needs: ["web", "search"] },
  { id: "app-build", description: "สร้างแอปจากเป้าหมายและส่งผลไปยัง Preview", intents: ["build"], needs: ["code", "runtime"] },
  { id: "app-edit", description: "แก้แอปเดิมโดยรักษาสิ่งที่ใช้งานได้", intents: ["edit"], needs: ["code", "runtime"] },
  { id: "debug-recovery", description: "วิเคราะห์ error แล้ววนแก้และตรวจซ้ำ", intents: ["debug"], needs: ["code", "runtime", "verify"] },
  { id: "github-workflow", description: "ตรวจและจัดการ repository, branch, commit หรือ PR", intents: ["github"], needs: ["github", "verify"] },
  { id: "deploy-verify", description: "ตรวจผล deployment หรือ preview ด้วยหลักฐานจริง", intents: ["deploy"], needs: ["deploy", "web", "verify"] },
  { id: "visual-review", description: "ตรวจคุณภาพหน้า Preview และความครบของ UI", intents: ["build", "edit"], needs: ["verify"] },
];

export function selectBossSkills(intent: string, prompt = ""): BossSkill[] {
  const lower = prompt.toLowerCase();
  return BOSS_SKILLS.filter((skill) =>
    skill.intents.includes(intent) ||
    (skill.id === "visual-review" && /ui|หน้าเว็บ|ดีไซน์|design|preview/.test(lower)),
  );
}
