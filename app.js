(function () {
  const config = window.BLOG_CONFIG;
  const app = document.querySelector('#app');
  const navLinks = [...document.querySelectorAll('[data-nav]')];

  const formatDate = (date) => new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric'
  }).format(new Date(`${date}T00:00:00`));

  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));

  let routeVersion = 0;
  function safeUrl(value) {
    const url = String(value).trim();
    if (/[\u0000-\u0020\u007f]/.test(url)) return '#';
    if (/^(?:https?:|mailto:)/i.test(url)) return url;
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//') || url.includes('\\')) return '#';
    return url;
  }

  function inlineMarkdown(value) {
    // Tokenize before escaping: code and link attributes must not be re-parsed.
    const tokens = /`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
    let output = '', offset = 0;
    for (const match of value.matchAll(tokens)) {
      output += escapeHtml(value.slice(offset, match.index));
      if (match[1] !== undefined) output += `<code>${escapeHtml(match[1])}</code>`;
      else if (match[2] !== undefined) output += `<a href="${escapeHtml(safeUrl(match[3]))}">${escapeHtml(match[2])}</a>`;
      else if (match[4] !== undefined) output += `<strong>${escapeHtml(match[4])}</strong>`;
      else output += `<em>${escapeHtml(match[5])}</em>`;
      offset = match.index + match[0].length;
    }
    return output + escapeHtml(value.slice(offset));
  }

  function markdownToHtml(markdown) {
    const lines = markdown.replace(/\r/g, '').split('\n');
    const html = [];
    let inList = false;
    let inQuote = false;
    let inCode = false;
    let codeLines = [];

    const closeList = () => { if (inList) { html.push('</ul>'); inList = false; } };
    const closeQuote = () => { if (inQuote) { html.push('</blockquote>'); inQuote = false; } };

    lines.forEach((line) => {
      if (line.startsWith('```')) {
        if (inCode) {
          html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
          codeLines = [];
          inCode = false;
        } else {
          closeList(); closeQuote(); inCode = true;
        }
        return;
      }
      if (inCode) { codeLines.push(line); return; }
      if (!line.trim()) { closeList(); closeQuote(); return; }
      if (line.startsWith('> ')) {
        closeList();
        if (!inQuote) { html.push('<blockquote>'); inQuote = true; }
        html.push(`<p>${inlineMarkdown(line.slice(2))}</p>`);
        return;
      }
      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        closeList(); closeQuote();
        const level = heading[1].length;
        html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
        return;
      }
      const listItem = line.match(/^[-*]\s+(.+)$/);
      if (listItem) {
        closeQuote();
        if (!inList) { html.push('<ul>'); inList = true; }
        html.push(`<li>${inlineMarkdown(listItem[1])}</li>`);
        return;
      }
      closeList(); closeQuote();
      html.push(`<p>${inlineMarkdown(line)}</p>`);
    });
    closeList(); closeQuote();
    if (inCode) html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    return html.join('');
  }

  function setActiveNav(page) {
    navLinks.forEach((link) => {
      link.classList.toggle('is-active', link.dataset.nav === page);
      if (link.dataset.nav === page) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function postCard(post, featured = false) {
    return `<article class="post-card ${featured ? 'post-card--featured' : ''}">
      <a class="post-image" href="#post/${post.slug}" aria-label="阅读：${escapeHtml(post.title)}">
        <img src="${post.cover}" alt="" loading="lazy" />
        <span class="image-arrow" aria-hidden="true">↗</span>
      </a>
      <div class="post-card-body">
        <div class="post-meta"><span>${escapeHtml(post.category)}</span><i></i><time datetime="${post.date}">${formatDate(post.date)}</time></div>
        <h2><a href="#post/${post.slug}">${escapeHtml(post.title)}</a></h2>
        <p>${escapeHtml(post.excerpt)}</p>
        <a class="read-link" href="#post/${post.slug}">继续阅读 <span aria-hidden="true">→</span></a>
      </div>
    </article>`;
  }

  function renderHome() {
    setActiveNav('home');
    document.title = `${config.name} · 文章`;
    if (!config.posts.length) { app.innerHTML = '<section class="empty-state"><h1>还没有文章</h1><p>在 config.js 中添加你的第一篇文章吧。</p></section>'; return; }
    const featured = config.posts.find((post) => post.featured) || config.posts[0];
    const others = config.posts.filter((post) => post.slug !== featured.slug);
    app.innerHTML = `<section class="home-page">
      <div class="home-intro">
        <p class="eyebrow">${escapeHtml(config.subtitle)}</p>
        <h1>把想法放在<br /><em>页边。</em></h1>
        <p class="intro-copy">${escapeHtml(config.intro)}</p>
        <div class="intro-signature"><span class="signature-line"></span><span>欢迎来到我的小小角落</span></div>
      </div>
      <div class="featured-wrap">
        <p class="section-label">01 / 精选文章</p>
        ${postCard(featured, true)}
      </div>
      <div class="posts-section">
        <div class="section-heading"><p class="section-label">02 / 最近更新</p><span>${String(config.posts.length).padStart(2, '0')} 篇文章</span></div>
        <div class="posts-grid">${others.map((post) => postCard(post)).join('')}</div>
      </div>
    </section>`;
  }

  function renderAbout() {
    setActiveNav('about');
    document.title = `关于 · ${config.name}`;
    app.innerHTML = `<section class="about-page">
      <div class="about-heading"><p class="eyebrow">关于这个角落</p><h1>你好，<br /><em>很高兴遇见你。</em></h1></div>
      <div class="about-grid">
        <div class="about-photo"><img src="${config.avatar}" alt="${escapeHtml(config.author)}的头像" /></div>
        <div class="about-copy"><p class="lead">我是${escapeHtml(config.author)}，一个喜欢把复杂事情讲清楚的人。</p>
          <p>白天写代码，晚上读书，有时候也做一点不那么实用但让人开心的东西。这个博客是我的数字书桌：整理工作中的方法，记录生活里的观察，也留下一些还没有答案的问题。</p>
          <p>这里没有固定的更新频率。好文章不应该被日历催着出生，但我会尽量让每次更新都值得你花几分钟。</p>
          <div class="about-links"><a href="${config.social.github}" target="_blank" rel="noreferrer">GitHub <span>↗</span></a><a href="${config.social.email}">Email <span>↗</span></a></div>
        </div>
      </div>
      <div class="about-note"><span>“</span><p>保持好奇，保持具体，保持一点点不合时宜。</p></div>
    </section>`;
  }

  async function renderPost(slug, version) {
    setActiveNav('home');
    const post = config.posts.find((item) => item.slug === slug);
    if (!post) { app.innerHTML = '<section class="empty-state"><h1>文章不存在</h1><p>这篇文章可能已移动或删除。</p><a class="read-link" href="#home">返回文章列表 →</a></section>'; document.title = `文章不存在 · ${config.name}`; return; }
    document.title = `${post.title} · ${config.name}`;
    app.innerHTML = `<section class="article-page"><a class="back-link" href="#home">← 返回文章列表</a><div class="article-top"><div><div class="post-meta"><span>${escapeHtml(post.category)}</span><i></i><time datetime="${post.date}">${formatDate(post.date)}</time><i></i><span>${escapeHtml(post.readTime)}阅读</span></div><h1>${escapeHtml(post.title)}</h1><p class="article-excerpt">${escapeHtml(post.excerpt)}</p></div><img class="article-cover" src="${post.cover}" alt="" /></div><div class="article-layout"><div class="article-content"><p class="article-loading">正在读取文章……</p></div><aside class="article-aside"><span class="aside-label">本页目录</span><div class="toc"></div><a class="aside-home" href="#home">回到首页 <span>↗</span></a></aside></div></section>`;
    try {
      const response = await fetch(post.file);
      if (!response.ok) throw new Error('文章文件读取失败');
      const markdown = await response.text();
      if (version !== routeVersion) return;
      const content = document.querySelector('.article-content');
      content.innerHTML = markdownToHtml(markdown);
      const headings = [...content.querySelectorAll('h2, h3')];
      document.querySelector('.toc').innerHTML = headings.map((heading, index) => {
        const id = `heading-${index}`;
        heading.id = id;
        return `<button type="button" data-heading="${id}">${escapeHtml(heading.textContent)}</button>`;
      }).join('');
    } catch (error) {
      if (version !== routeVersion) return;
      document.querySelector('.article-content').innerHTML = `<p class="article-error">${escapeHtml(error.message)}。请通过本地服务器打开网站（例如 <code>py -3 -m http.server</code>），直接双击 HTML 时浏览器会拦截 Markdown 的读取。</p>`;
    }
  }

  function route() {
    const version = ++routeVersion;
    window.scrollTo({ top: 0, behavior: 'instant' });
    const [page, slug] = location.hash.slice(1).split('/');
    if (page === 'post' && slug) renderPost(slug, version);
    else if (page === 'about') renderAbout();
    else renderHome();
  }

  document.querySelector('.header-link').href = safeUrl(config.social.github);
  document.querySelector('.brand-copy strong').textContent = config.name;
  document.querySelector('.site-footer span').textContent = `© ${new Date().getFullYear()} ${config.name}`;
  app.addEventListener('click', (event) => {
    const button = event.target.closest('[data-heading]');
    if (!button) return;
    const heading = document.getElementById(button.dataset.heading);
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    }
  });
  window.addEventListener('hashchange', route);
  route();
})();
