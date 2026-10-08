// Logic tests with a minimal DOM stub, not a replacement for browser/mobile QA.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const elements = new Map();
const listeners = {};
function element() {
  return { innerHTML: '', textContent: '', dataset: {},
    addEventListener(type, fn) { this[type] = fn; },
    querySelectorAll() {
      return [...this.innerHTML.matchAll(/<h[23]>(.*?)<\/h[23]>/g)].map(m => ({textContent: m[1]}));
    }
  };
}
const document = {
  title: '',
  querySelector(selector) { if (!elements.has(selector)) elements.set(selector, element()); return elements.get(selector); },
  querySelectorAll() { return []; },
  getElementById() { return null; }
};
const context = vm.createContext({document, location: {hash: '#home'}, console, Intl, Date,
  matchMedia: () => ({matches: false}),
  fetch: async file => ({ok: true, text: async () => fs.readFileSync(path.join(root,file),'utf8')})
});
context.window = {scrollTo() {}, addEventListener(type, fn) { listeners[type] = fn; }};
vm.runInContext(fs.readFileSync(path.join(root,'config.js'),'utf8'),context);
let source = fs.readFileSync(path.join(root,'app.js'),'utf8');
source = source.replace('  route();', '  window.test = { route, markdownToHtml, inlineMarkdown, safeUrl };');
vm.runInContext(source,context);
const api = context.window.test;
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS', name); }
const settle = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  test('local config points to existing Markdown', () => {
    const posts = context.window.BLOG_CONFIG.posts;
    assert.equal(new Set(posts.map(p=>p.slug)).size, posts.length);
    posts.forEach(p => assert.ok(fs.existsSync(path.join(root,p.file))));
  });
  test('home contains all three articles', () => {
    api.route();
    context.window.BLOG_CONFIG.posts.forEach(p=>assert.ok(document.querySelector('#app').innerHTML.includes(p.title)));
  });
  test('about route and document title', () => {
    context.location.hash='#about'; api.route();
    assert.ok(document.querySelector('#app').innerHTML.includes('about-page'));
    assert.ok(document.title.includes('MARGIN NOTE'));
  });
  for (const post of context.window.BLOG_CONFIG.posts) {
    context.location.hash='#post/'+post.slug; api.route(); await settle();
    test('Markdown loads: '+post.slug, () => {
      assert.ok(document.querySelector('.article-content').innerHTML.includes('<h2>'));
      assert.ok(document.querySelector('.toc').innerHTML.includes('data-heading'));
      assert.ok(!document.querySelector('.toc').innerHTML.includes('href="#heading'));
    });
  }
  test('Markdown escaping', () => assert.equal(api.markdownToHtml('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'));
  test('formatting and code', () => {
    assert.ok(api.markdownToHtml('**bold**\n\n*italics*\n\n- item\n\n> quote').includes('<strong>bold</strong>'));
    assert.equal(api.markdownToHtml('```js\n<b>\n```'), '<pre><code>&lt;b&gt;</code></pre>');
    assert.equal(api.inlineMarkdown('`**literal**`'), '<code>**literal**</code>');
  });
  test('unsafe links blocked', () => {
    ['javascript:evil','JaVaScRiPt:evil','data:text/html,evil','//evil.test','java\tscript:evil'].forEach(u=>assert.equal(api.safeUrl(u),'#'));
    assert.ok(!api.inlineMarkdown('[bad](javascript:evil)').includes('href="javascript:'));
  });
  test('ordinary links preserved safely', () => {
    assert.equal(api.inlineMarkdown('[site](https://example.com/?a=1&b=2)'), '<a href="https://example.com/?a=1&amp;b=2">site</a>');
    assert.equal(api.safeUrl('posts/test.md'), 'posts/test.md');
  });
  test('missing article handled', () => {
    context.location.hash='#post/missing'; api.route();
    assert.ok(document.querySelector('#app').innerHTML.includes('empty-state'));
  });
  const posts=context.window.BLOG_CONFIG.posts;
  test('empty catalog handled', () => {
    context.window.BLOG_CONFIG.posts=[]; context.location.hash='#home'; api.route();
    assert.ok(document.querySelector('#app').innerHTML.includes('empty-state'));
    context.window.BLOG_CONFIG.posts=posts;
  });
  let resolveFetch;
  context.fetch=()=>new Promise(resolve=>{ resolveFetch=resolve; });
  context.location.hash='#post/slow-interface'; api.route();
  const before=document.querySelector('.article-content').innerHTML;
  context.location.hash='#about'; api.route();
  resolveFetch({ok:true,text:async()=> 'SHOULD NOT APPEAR'}); await settle();
  test('stale response cannot overwrite new route',()=>assert.equal(document.querySelector('.article-content').innerHTML,before));
  context.fetch=async()=>({ok:false});
  context.location.hash='#post/slow-interface'; api.route(); await settle();
  test('failed fetch shows readable error',()=>assert.ok(document.querySelector('.article-content').innerHTML.includes('article-error')));
  test('source encoding intact',()=> {
    for (const file of ['index.html','app.js','config.js']) {
      const text=fs.readFileSync(path.join(root,file),'utf8');
      assert.ok(!text.includes('????'));
      assert.ok(!text.includes('\uFFFD'));
    }
  });
  console.log(`\n${count} logic checks passed. Browser interaction/mobile layout are not covered by this test.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
