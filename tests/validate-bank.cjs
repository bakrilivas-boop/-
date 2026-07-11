const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
require(path.join(root, "verified-500.js"));

const questions = globalThis.VERIFIED_500;
const meta = globalThis.VERIFIED_500_META;

assert.ok(Array.isArray(questions), "VERIFIED_500 must be an array");
assert.equal(questions.length, 500, "verified bank must contain exactly 500 questions");
assert.equal(meta.questionCount, 500, "metadata question count must match");
assert.ok(meta.ruleCount >= 200, "bank should cover at least 200 distinct rule points");

const ids = new Set();
const bodies = new Set();
const chapters = new Set();

for (const question of questions) {
  assert.equal(question.subject, "科目一", `${question.id}: subject must be 科目一`);
  assert.ok(["single", "judge"].includes(question.type), `${question.id}: unsupported type`);
  assert.ok(question.id && !ids.has(question.id), `${question.id}: duplicate or missing id`);
  assert.ok(question.question.endsWith("？") || question.type === "judge", `${question.id}: single-choice question needs punctuation`);
  assert.ok(Array.isArray(question.options) && question.options.length >= 2, `${question.id}: missing options`);
  assert.equal(new Set(question.options).size, question.options.length, `${question.id}: duplicate options`);
  assert.deepEqual(question.answer.length, 1, `${question.id}: 科目一 question must have one answer`);
  assert.ok(Number.isInteger(question.answer[0]) && question.answer[0] >= 0 && question.answer[0] < question.options.length, `${question.id}: invalid answer index`);
  assert.ok(question.explanation.includes(question.source), `${question.id}: explanation must name its source`);
  assert.match(question.sourceUrl, /^https:\/\/jtgl\.beijing\.gov\.cn\//, `${question.id}: source must be an official government page`);
  assert.match(question.sourceArticle, /^第.+条$/, `${question.id}: source article is missing`);
  assert.match(question.verifiedAt, /^\d{4}-\d{2}-\d{2}$/, `${question.id}: verification date is missing`);

  const body = `${question.question}|${question.options.join("|")}`;
  assert.ok(!bodies.has(body), `${question.id}: duplicate question body`);
  ids.add(question.id);
  bodies.add(body);
  chapters.add(question.chapter);
}

assert.ok(chapters.size >= 20, "verified bank should cover at least 20 chapters");

const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const verifiedScriptIndex = indexHtml.indexOf('<script src="verified-500.js"></script>');
const appScriptIndex = indexHtml.indexOf('<script src="app.js"></script>');
assert.ok(verifiedScriptIndex >= 0 && appScriptIndex > verifiedScriptIndex, "verified bank must load before app.js");

const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
assert.ok(appSource.includes('id: "guide"'), "registration guide navigation is missing");
assert.ok(appSource.includes('data-mode="verified500"'), "verified500 mode control is missing");
assert.ok(appSource.includes("questionStats"), "per-question progress storage is missing");
assert.ok(appSource.includes("renderPracticeSelectors()"), "practice controls must remain available for empty filters");
assert.ok(appSource.includes('forcedSubject !== "科目一" && state.practiceMode === "verified500"'), "verified mode must reset outside subject one");
assert.ok(appSource.includes('item.bank !== "verified500"'), "imported questions must not enter the verified bank");
assert.ok(appSource.includes('aria-pressed="${state.practiceSubject === subject}"'), "subject controls must expose selected state");
assert.ok(appSource.includes('aria-pressed="${state.practiceMode === "wrong"}"'), "mode controls must expose selected state");
assert.ok(appSource.includes("夜间会车或跟车时，一般使用什么灯"), "night-meeting wording regression");
assert.ok(appSource.includes("浏览器未允许自动复制"), "copy fallback status is missing");

const stylesSource = fs.readFileSync(path.join(root, "styles.css"), "utf8");
assert.ok(stylesSource.includes("@media (max-width: 820px)"), "mobile/tablet breakpoint regression");
assert.ok(stylesSource.includes(".tab-btn.active"), "active navigation styling is missing");
assert.ok(stylesSource.includes("overflow-x: hidden"), "page-level horizontal overflow guard is missing");

assert.ok(indexHtml.includes('id="mobileMenuToggle"'), "collapsible mobile menu is missing");
assert.ok(indexHtml.includes('id="mobileSearchInput"'), "mobile search input is missing");

console.log(`Validated ${questions.length} questions across ${chapters.size} chapters and ${meta.ruleCount} source rules.`);
