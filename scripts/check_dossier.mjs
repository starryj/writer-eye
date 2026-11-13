#!/usr/bin/env node
// 档案体检：11 项齐全、〇材料宇宙六项齐全、三组示范字数/行数合规、示范内无作家姓名与「像…写的」；
// 另报「同构体检」：三组示范的行数、末句字数、是否含我、末句结尾，供人工对照。
// 用法：node check_dossier.mjs "<档案路径>" "<作家名>"
import fs from "node:fs";

const [file, writer] = process.argv.slice(2);
if (!file || !writer) {
  console.error("用法: node check_dossier.mjs \"<档案路径>\" \"<作家名>\"");
  process.exit(2);
}

const PUNCT = /[\s，。、；：？！「」『』（）《》〈〉…—·,.!?;:'"()\[\]{}<>~\-]/g;
const count = (s) => s.replace(PUNCT, "").length;
const md = fs.readFileSync(file, "utf8");
const fails = [];
const notes = [];
const tips = [];

// 1) 11 项
const nums = [...md.matchAll(/###\s*(\d+)/g)].map((m) => Number(m[1]));
const missing = [];
for (let i = 1; i <= 11; i++) if (!nums.includes(i)) missing.push(i);
if (missing.length) fails.push("缺第 " + missing.join("、") + " 项");
else notes.push("11 项齐全");

// 2) 取「二、示范」段，止于「三、」
const i2 = md.indexOf("## 二、");
const i3 = md.indexOf("## 三、");
const demo = i2 >= 0 ? md.slice(i2, i3 > i2 ? i3 : md.length) : "";
const blocks = [...demo.matchAll(/主旨：([^\n]+)\n+题记：\n([\s\S]*?)(?=\n[ \t]*\n|\n（|$)/g)];
if (blocks.length !== 3) fails.push("示范数 " + blocks.length + "（应为 3）");
const shapes = [];
blocks.forEach((b, i) => {
  const title = b[1].trim();
  const body = b[2].replace(/\n+$/, "").trim();
  const arr = body.split("\n").map((l) => l.trim()).filter(Boolean);
  const n = arr.length;
  const tc = count(title);
  const bc = count(body);
  if (tc < 1 || tc > 7) fails.push("示范" + (i + 1) + " 主旨 " + tc + " 字");
  if (bc < 1 || bc > 99 || n < 1 || n > 3) fails.push("示范" + (i + 1) + " 题记 " + bc + " 字 / " + n + " 行");
  const last = arr[n - 1] || "";
  const lastChars = count(last);
  const hasI = /我|咱|俺/.test(body);
  const tailMark = (last.match(/[。？！…—」]$/) || ["无"])[0];
  shapes.push({ n, lastChars, hasI, tailMark });
  notes.push("示范" + (i + 1) + ": 主旨 " + tc + "/7, 题记 " + bc + "/99, " + n + " 行, 末句 " + lastChars + " 字, 含我:" + (hasI ? "是" : "否") + ", 结尾「" + tailMark + "」");
});

// 2.4) 每条示范必须有元数据行（档位 + 末句类型）
const metaRe = /（主旨 \d+\/7；题记 \d+\/99；\d+ 行｜档位：(A 人×物|B 物×物)｜末句：([^）\n]+)）/g;
const metas = [...demo.matchAll(metaRe)];
const allMetaLines = [...demo.matchAll(/（主旨[^\n]*）/g)];
if (allMetaLines.length !== 3) fails.push("示范元数据行 " + allMetaLines.length + " 条（应为 3）");
else if (metas.length !== 3) fails.push("示范元数据格式不合（应为「…｜档位：A 人×物｜末句：…」）");
metas.forEach((m, i) => notes.push("示范" + (i + 1) + ": 档位 " + m[1] + "，末句 " + m[2]));
const tiers = metas.map((m) => m[1]);
if (tiers.length === 3 && tiers.every((x) => x === tiers[0])) tips.push("三组档位全为 " + tiers[0] + "（照片条件不同时留意）");

// 2.5) 同构体检（提示，不判错）
if (shapes.length === 3) {
  if (shapes.every((s) => s.n === shapes[0].n)) tips.push("三组示范行数全为 " + shapes[0].n + "，结构可能同构");
  const ls = shapes.map((s) => s.lastChars);
  if (Math.max(...ls) - Math.min(...ls) <= 3) tips.push("三组末句字数 " + ls.join("/") + "，收尾手法太齐");
  if (shapes.every((s) => s.tailMark === "。")) tips.push("三组都以句号收尾，可试问句/感叹/名词止");
  if (shapes.every((s) => !s.hasI)) tips.push("三组示范都没有「我」");
}

// 3) 示范内不出现作家名 / 「像…写的」
if (demo.includes(writer)) fails.push("示范内出现作家姓名");
const named = [...demo.matchAll(/像[^，。\n]{1,8}写的/g)].map((m) => m[0]);
if (named.length) fails.push("示范内有「像…写的」：" + named.join("、")); 

// 3.5) 〇材料宇宙六项
const s0 = md.indexOf("## 〇、材料宇宙");
if (s0 < 0) fails.push("缺「〇、材料宇宙」节");
else {
  const blk = md.slice(s0, md.indexOf("## 一、", s0));
  for (const k of ["材料", "关系", "情绪", "尺子", "末句", "互动"]) if (!blk.includes("**" + k + "**")) fails.push("〇 缺「" + k + "」");
  if (!/站位/.test(blk)) fails.push("〇 互动行缺「站位」（我进不进场）");
}

// 4) 第 7 项非空
const s7m = md.match(/###\s*7[^\n]*\n([\s\S]*?)(?=\n###|\n## )/);
const s7 = s7m ? s7m[1].trim() : "";
if (!s7) fails.push("第 7 项为空");
else if (s7.length < 40) notes.push("第 7 项偏短（" + s7.length + " 字）");

// 5) 版权项
if (!/版权状态/.test(md)) fails.push("缺第 11 项「版权状态」");

console.log((fails.length ? "FAIL " : "PASS ") + file.split(/[\\/]/).pop() + " — " + writer);
for (const x of notes) console.log("  · " + x);
for (const tip of tips) console.log("  · TIP " + tip);
for (const f of fails) console.log("  ✗ " + f);
process.exit(fails.length ? 1 : 0);
