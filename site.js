(() => {
  const layout = window.PORTFOLIO_LAYOUT;
  const canvas = document.querySelector('#portfolio-canvas');

  function renderPortfolio() {
    if (!layout || !canvas) return;
    canvas.innerHTML = '';
    canvas.style.setProperty('--design-ratio', layout.pageHeight / layout.designWidth);

    layout.items.forEach((item) => {
      const article = document.createElement('article');
      article.className = 'placed-work';
      article.dataset.id = item.id;
      article.style.setProperty('--x', item.x / layout.designWidth * 100 + '%');
      article.style.setProperty('--y', item.y / layout.designWidth * 100 + 'cqw');
      article.style.setProperty('--w', item.width / layout.designWidth * 100 + '%');
      article.style.zIndex = item.z || 1;

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
      canvas.appendChild(article);
    });

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
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();
