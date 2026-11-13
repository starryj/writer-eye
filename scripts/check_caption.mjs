#!/usr/bin/env node
// 字数与节奏校验：主旨 3–7 字、题记 ≤99 字（标点不计），题记 1–3 句。
// 用法：node check_caption.mjs "<主旨>" "<题记>" [--strict]
// 判定分三级：
//   FAIL 硬规则，必须改；
//   WARN 真实问题（重复、同字开头、分号串事、情绪词收尾）；
//   TIP  节奏提示——随作家尺子而变，仅供参考，不判错。
// --strict 只把 WARN 升级为 FAIL，TIP 永远只作提示。
const PUNCT = /[\s，。、；：？！「」『』（）《》〈〉…—·,.!?;:'"()\[\]{}<>~\-]/g;
const count = (s) => s.replace(PUNCT, "").length;

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const [title, inscription] = args.filter((a) => a !== "--strict");
if (!title) {
  console.error('用法: node check_caption.mjs "<主旨>" "<题记>" [--strict]');
  process.exit(2);
}

const problems = [];
const warnings = [];
const tips = [];
const lines = [];
let pass = true;

const t = count(title);
if (!(t >= 3 && t <= 7)) { pass = false; problems.push(`主旨 ${t}/7 字（应为 3–7）`); }
else lines.push(`PASS 主旨: ${t}/7 字`);

if (inscription) {
  const n = count(inscription);
  const arr = inscription.split("\n").map((s) => s.trim()).filter(Boolean);
  const sentences = inscription.split(/[。！？!?]+/).map((s) => s.trim()).filter(Boolean).length;
  const chars = arr.map(count);

  if (n > 99) { pass = false; problems.push(`题记 ${n}/99 字`); }
  else lines.push(`PASS 题记: ${n}/99 字；${arr.length} 行 / ${sentences} 句`);
  if (arr.length < 1 || arr.length > 3) { pass = false; problems.push(`题记 ${arr.length} 行（应为 1–3 行）`); }
  if (sentences < 1 || sentences > 3) { pass = false; problems.push(`题记 ${sentences} 句（应为 1–3 句）`); }

  const lastLine = arr[arr.length - 1] || "";
  const lastChars = count(lastLine);
  const hasI = /我|咱|俺/.test(inscription);
  const tailMark = (lastLine.match(/[。？！…—」]$/) || ["无"])[0];
  lines.push(`结构: ${arr.length} 行 / 末句 ${lastChars} 字 / 结尾「${tailMark}」/ 含我: ${hasI ? "是" : "否"}`);

  // WARN：真问题
  const ADJ = /(安静|平静|温柔|孤独|寂寥|苍凉|荒凉|辽阔|空荡|温暖|冷清|悠远|美好|美丽|寂|静|美)$/;
  const tail = lastLine.replace(/[。，、！？；：\s]/g, "");
  if (ADJ.test(tail)) warnings.push(`末句以形容词/情绪词收尾（${tail.slice(-2)}），留白不要硬凑`);
  if (arr.some((l) => (l.match(/；/g) || []).length >= 2)) warnings.push("一行里分号 ≥2，事实串在一行");
  for (let i = 1; i < arr.length; i++) {
    if (arr[i][0] && arr[i][0] === arr[i - 1][0]) warnings.push(`第 ${i}、${i + 1} 行同字开头（${arr[i][0]}）`);
  }
  if (inscription.includes(title)) warnings.push("题记里出现主旨原文，重复了");

  // TIP：节奏提示，随作家尺子变，不判错
  if (arr.length === 3 && Math.max(...chars) - Math.min(...chars) < 10) {
    tips.push(`三行长度极差 ${Math.max(...chars) - Math.min(...chars)} < 10，节奏偏匀（长句作家可不管）`);
  }
  if (Math.min(...chars) > 8) tips.push("没有一句 ≤8 字（长句作家正常；短句作家要查）");
  if (lastChars > 12) tips.push(`末句 ${lastChars} 字偏长（村上 28 字也合法，看尺子）`);
  if (arr.every((l) => l.trim().endsWith("。"))) tips.push("每句都以句号收尾，收尾手法单一（可试问句、感叹、名词止）");
}

for (const l of lines) console.log(l);
for (const w of warnings) console.log((strict ? "FAIL" : "WARN") + " ⚠ " + w);
for (const tip of tips) console.log("TIP · " + tip);
for (const pr of problems) console.log("FAIL " + pr);
if (strict && warnings.length) pass = false;
process.exit(pass ? 0 : 1);
