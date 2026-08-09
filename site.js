(() => {
  const layout = window.PORTFOLIO_LAYOUT;
  const canvas = document.querySelector('#portfolio-canvas');

  const clamp01 = (n) => Math.max(0, Math.min(1, Number(n ?? 1)));

  function applyTextStyles(el, item, scale) {
    const typeScale = window.innerWidth <= 700 ? 1 : scale;
    el.style.fontFamily = item.fontFamily || 'Arial, Helvetica, sans-serif';
    el.style.fontSize = `${(Number(item.fontSize) || 15) * typeScale}px`;
    el.style.color = item.color || '#111111';
    el.style.fontWeight = String(item.fontWeight ?? 400);
    el.style.fontStyle = item.italic ? 'italic' : 'normal';
    el.style.textDecoration = item.underline ? 'underline' : 'none';
    el.style.textAlign = item.align || 'left';
    el.style.lineHeight = String(item.lineHeight ?? 1.25);
    el.style.letterSpacing = `${(Number(item.letterSpacing) || 0) * typeScale}px`;
    el.style.opacity = String(clamp01(item.opacity));
    el.style.transform = `rotate(${Number(item.rotation) || 0}deg)`;
    el.style.transformOrigin = 'top left';
    el.style.background = item.backgroundEnabled ? (item.background || '#ffffff') : 'transparent';
  }

  function makeText(item, scale) {
    const hasScrollTarget = !!item.scrollTarget;
    const node = (hasScrollTarget || item.link) ? document.createElement('a') : document.createElement('div');
    node.className = 'placed-text';
    node.dataset.id = item.id;
    node.dataset.role = item.role || 'text';
    node.id = item.id;
    node.textContent = item.text || '';
    if (hasScrollTarget) {
      node.href = item.scrollTarget === '__top__' ? '#top' : `#${item.scrollTarget}`;
      node.dataset.scrollTarget = item.scrollTarget;
    } else if (item.link) {
      node.href = item.link;
      if (item.newTab || /^https?:/i.test(item.link)) {
        node.target = '_blank';
        node.rel = 'noopener';
      }
    }
    node.style.left = `${item.x * scale}px`;
    node.style.top = `${item.y * scale}px`;
    node.style.width = `${item.width * scale}px`;
    node.style.zIndex = item.z || 1;
    applyTextStyles(node, item, scale);
    return node;
  }

  function makeMedia(item, scale) {
    const article = document.createElement('article');
    article.className = 'placed-work';
    article.dataset.id = item.id;
    article.id = item.id;
    article.style.left = `${item.x * scale}px`;
    article.style.top = `${item.y * scale}px`;
    article.style.width = `${item.width * scale}px`;
    article.style.zIndex = item.z || 1;
    article.style.opacity = String(clamp01(item.opacity));
    article.style.transform = `rotate(${Number(item.rotation) || 0}deg)`;
    article.style.transformOrigin = 'top left';

    const figure = document.createElement('figure');
    if (item.hoverSrc) figure.classList.add('hover-swap');

    const img = document.createElement('img');
    img.src = item.src;
    img.alt = item.title || '';
    img.loading = 'lazy';
    figure.appendChild(img);

    if (item.hoverSrc) {
      const hover = document.createElement('img');
      hover.className = 'hover';
      hover.src = item.hoverSrc;
      hover.alt = item.title ? `Alternate image: ${item.title}` : 'Alternate image';
      hover.loading = 'lazy';
      figure.appendChild(hover);
    }

    if (item.type === 'video') {
      const badge = document.createElement('span');
      badge.className = 'media-badge';
      badge.textContent = 'video';
      figure.appendChild(badge);
    }

    if (item.showCaption && item.caption) {
      const caption = document.createElement('figcaption');
      caption.textContent = item.caption;
      caption.style.fontFamily = item.captionFontFamily || 'Arial, Helvetica, sans-serif';
      const captionScale = window.innerWidth <= 700 ? 1 : scale;
      caption.style.fontSize = `${(Number(item.captionFontSize) || 12) * captionScale}px`;
      caption.style.color = item.captionColor || '#111111';
      caption.style.textAlign = item.captionAlign || 'left';
      figure.appendChild(caption);
    }

    if (item.clickable && item.link) {
      const a = document.createElement('a');
      a.className = 'work-link';
      a.href = item.link;
      if (/^https?:/i.test(item.link)) {
        a.target = '_blank';
        a.rel = 'noopener';
      }
      a.appendChild(figure);
      article.appendChild(a);
    } else {
      article.appendChild(figure);
    }
    return article;
  }


  function installSinglePageNavigation() {
    document.querySelectorAll('a[data-scroll-target]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const targetId = link.dataset.scrollTarget;
        event.preventDefault();
        if (targetId === '__top__') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          history.replaceState(null, '', '#top');
          return;
        }
        const target = document.getElementById(targetId);
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', `#${targetId}`);
      });
    });
  }

  function renderPortfolio() {
    if (!layout || !canvas) return;
    canvas.innerHTML = '';
    document.body.style.background = layout.pageStyle?.background || '#ffffff';
    const scale = canvas.clientWidth / layout.designWidth;
    canvas.style.height = `${layout.pageHeight * scale}px`;

    const all = [
      ...(layout.items || []).map(item => ({kind: 'media', y: item.y, z: item.z || 1, item})),
      ...(layout.texts || []).map(item => ({kind: 'text', y: item.y, z: item.z || 1, item}))
    ].sort((a,b) => (a.y-b.y) || (a.z-b.z));

    all.forEach(entry => {
      canvas.appendChild(entry.kind === 'text' ? makeText(entry.item, scale) : makeMedia(entry.item, scale));
    });

    installSinglePageNavigation();

    document.querySelectorAll('.hover-swap').forEach((item) => {
      item.addEventListener('click', (event) => {
        if (window.matchMedia('(hover: none)').matches && !item.closest('a')) {
          event.preventDefault();
          item.classList.toggle('is-tapped');
        }
      });
    });
  }

  renderPortfolio();
  window.addEventListener('resize', renderPortfolio);
})();
