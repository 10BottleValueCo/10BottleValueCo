import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { buildFaqs } from "../artifacts/10-bottle-value/src/data/faqData.js";

const componentUrl = new URL("../artifacts/10-bottle-value/src/components/PublicInfoPages.jsx", import.meta.url);
const componentRequire = createRequire(componentUrl);
const viteRequire = createRequire(componentRequire.resolve("vite"));
const { transformSync } = viteRequire("esbuild");
const react = componentRequire("react");
const source = readFileSync(componentUrl, "utf8");
const compiled = transformSync(`${source}\nexport { FaqResults, getFaqParagraphs };`, {
  loader: "jsx", format: "cjs", jsx: "automatic",
  define: { "import.meta.env.BASE_URL": '"/"' },
}).code;

// Execute the actual JSX/handlers with isolated hook state and real React
// elements/memo descriptors. This checks state ownership and stable props, not
// browser paint timing or the React concurrent scheduler.
function fixture() {
  const instances = new Map();
  let active;
  const hooks = {
    ...react,
    useState(initializer) {
      const owner = active;
      const index = owner.cursor++;
      if (!(index in owner.values)) owner.values[index] = typeof initializer === "function" ? initializer() : initializer;
      return [owner.values[index], (next) => {
        owner.values[index] = typeof next === "function" ? next(owner.values[index]) : next;
        owner.updates += 1;
      }];
    },
    useMemo(calculate, dependencies) {
      const index = active.cursor++;
      const cached = active.values[index];
      if (!cached || dependencies.some((value, i) => !Object.is(value, cached.dependencies[i]))) {
        active.values[index] = { dependencies, value: calculate() };
      }
      return active.values[index].value;
    },
    useDeferredValue(value) {
      const index = active.cursor++;
      if (!(index in active.values) || !active.holdDeferred) active.values[index] = value;
      return active.values[index];
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    require: (name) => name === "react" ? hooks : componentRequire(name),
  });
  const exports = module.exports;
  const render = (id, component, props, holdDeferred = false) => {
    const state = instances.get(id) || { values: [], renders: 0, updates: 0 };
    state.cursor = 0;
    state.renders += 1;
    state.holdDeferred = holdDeferred;
    instances.set(id, state);
    active = state;
    const tree = component(props);
    active = undefined;
    return tree;
  };
  const translations = {
    EN: (...values) => values[0],
    RU: (...values) => values[1] ?? values[0],
    UA: (...values) => values[2] ?? values[0],
    DE: (...values) => values[3] ?? values[0],
    ES: (...values) => values[4] ?? values[0],
  };
  let pageProps = {
    page: "faq", language: "EN", tx: translations.EN,
    getPreloadedDisplayImageUrl: (value) => value,
    // Old parent handlers must never receive a FAQ interaction.
    toggleFaq: () => assert.fail("FAQ must not call an App handler"),
    getFaqParagraphs: () => assert.fail("FAQ must format answers locally"),
  };
  let pageTree;
  let resultElement;
  let resultsTree;
  return {
    exports, instances, translations,
    page({ holdDeferred = false, language } = {}) {
      if (language) pageProps = { ...pageProps, language, tx: translations[language] };
      pageTree = render("page", exports.default, pageProps, holdDeferred);
      resultElement = nodes(pageTree).find((node) => node.type === exports.FaqResults);
      return pageTree;
    },
    results() {
      resultsTree = render("results", resultElement.type.type, resultElement.props);
      return resultsTree;
    },
    get resultElement() { return resultElement; },
    type(value) {
      nodes(pageTree).find((node) => node.type === "input").props.onChange({ target: { value } });
    },
    toggle(section, index) {
      const groups = nodes(resultsTree).filter((node) => node.type === "section");
      const group = groups.find((node) => textOf(nodes(node).find((child) => child.type === "h2")) === section);
      assert.ok(group, `visible section ${section}`);
      const button = nodes(group).filter((node) => node.type === "button")[index];
      assert.equal(button.props.type, "button"); // Preserve native keyboard activation.
      button.props.onClick();
    },
    remount() { instances.clear(); },
  };
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object" || !tree.props) return [];
  return [tree, ...nodes(tree.props.children)];
}

function textOf(tree) {
  if (Array.isArray(tree)) return tree.map(textOf).join("");
  if (tree === null || tree === undefined || typeof tree === "boolean") return "";
  if (typeof tree !== "object") return String(tree);
  return textOf(tree.props?.children);
}

function answerTexts(tree) {
  return nodes(tree).filter((node) => node.type === "div" && node.props.className === "max-w-none space-y-3 text-[14px] leading-7 text-white/95 md:text-[16px] md:leading-8")
    .map(textOf);
}

test("FAQ expansion updates only its local results state and keeps one answer per section", () => {
  const f = fixture(); f.page(); f.results();
  assert.deepEqual(answerTexts(f.results()), []);
  f.toggle("SHIPPING", 0);
  assert.equal(f.instances.get("page").updates, 0);
  assert.equal(f.instances.get("results").updates, 1);
  assert.equal(answerTexts(f.results()).length, 1);
  f.toggle("ORDERS", 0);
  assert.equal(answerTexts(f.results()).length, 2);
  f.toggle("SHIPPING", 1);
  assert.equal(answerTexts(f.results()).length, 2);
  f.toggle("SHIPPING", 1);
  assert.equal(answerTexts(f.results()).length, 1);
  assert.equal(f.instances.get("page").renders, 1);
});

test("urgent typing updates the input while memoized results retain identical deferred props", () => {
  const f = fixture(); f.page(); f.results();
  const previous = f.resultElement;
  f.type("shipping");
  const tree = f.page({ holdDeferred: true });
  const next = f.resultElement;
  assert.equal(nodes(tree).find((node) => node.type === "input").props.value, "shipping");
  assert.equal(next.type.$$typeof, Symbol.for("react.memo"));
  for (const key of Object.keys(previous.props)) assert.equal(next.props[key], previous.props[key], `stable memo prop: ${key}`);
  assert.equal(f.instances.get("results").renders, 1);
  f.page();
  assert.equal(f.resultElement.props.faqSearchQuery, "shipping");
  const filtered = f.results();
  assert.ok(nodes(filtered).filter((node) => node.type === "button").length < 17);
});

test("search matches answer text and keeps the open question identity after filtering", () => {
  const f = fixture(); f.page(); f.results();
  f.toggle("SHIPPING", 1);
  const before = answerTexts(f.results());
  assert.equal(before.length, 1);
  f.type("trusted international supply partners"); f.page();
  const answerMatchButtons = nodes(f.results()).filter((node) => node.type === "button");
  assert.equal(answerMatchButtons.length, 1);
  assert.match(textOf(answerMatchButtons[0]), /ship worldwide/i);
  f.type(""); f.page();
  assert.deepEqual(answerTexts(f.results()), before);
  f.type("zyx-no-match-987"); f.page();
  const empty = f.results();
  assert.equal(nodes(empty).filter((node) => node.type === "button").length, 0);
  assert.match(textOf(empty), /No matching questions/);
});

test("search and expanded sections survive route unmount/remount", () => {
  const f = fixture(); f.page(); f.results();
  f.toggle("SHIPPING", 0); const before = answerTexts(f.results());
  f.type("shipping"); f.page(); f.results();
  f.remount();
  const tree = f.page();
  assert.equal(nodes(tree).find((node) => node.type === "input").props.value, "shipping");
  f.results(); f.type(""); f.page();
  assert.deepEqual(answerTexts(f.results()), before);
});

test("language changes retain section expansion and preserve translated or fallback answers", () => {
  const f = fixture(); f.page(); f.results();
  f.toggle("SHIPPING", 0);
  const english = answerTexts(f.results())[0];
  for (const language of ["RU", "UA", "DE", "ES"]) {
    f.page({ language });
    const answers = answerTexts(f.results());
    assert.equal(answers.length, 1);
    const expected = buildFaqs(f.translations[language]).find((faq) => faq.id === "ship-worldwide").a;
    assert.equal(answers[0], f.exports.getFaqParagraphs(expected).join(""));
  }
  f.page({ language: "EN" });
  assert.equal(answerTexts(f.results())[0], english);
});

test("the relocated answer formatter preserves paragraphs and long-answer sentence splitting", () => {
  const f = fixture();
  const plain = (value) => JSON.parse(JSON.stringify(value));
  assert.deepEqual(plain(f.exports.getFaqParagraphs("")), []);
  assert.deepEqual(plain(f.exports.getFaqParagraphs("First paragraph.\n\nSecond paragraph.")), ["First paragraph.", "Second paragraph."]);
  const first = "A".repeat(121) + ".";
  assert.deepEqual(plain(f.exports.getFaqParagraphs(`${first} Another sentence!`)), [first, "Another sentence!"]);
  assert.deepEqual(plain(f.exports.getFaqParagraphs("One brief answer.")), ["One brief answer."]);
});
