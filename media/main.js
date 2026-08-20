/* Image Coordinate Viewer - webview script */
(function () {
  const vscode = acquireVsCodeApi();
  const img = document.getElementById('img');
  const wrap = document.getElementById('imgWrap');
  const crossV = document.getElementById('crossV');
  const crossH = document.getElementById('crossH');
  const info = document.getElementById('info');

  const cfg = {
    crosshair: true,
    clickToCopy: 'coords',
    zoomMode: 'fit',
  };
  // Webviews do not expose vscode.workspace; settings are currently the defaults
  // declared in package.json. Host-side settings can be injected here later.
  img.classList.toggle('actual', cfg.zoomMode === 'actual');

  // Off-screen canvas for pixel color sampling (avoids CORS/tainted issues with webview resource URIs)
  const sampleCanvas = document.createElement('canvas');
  const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  let sourceImage = null;

  function toHex(r, g, b) {
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  function samplePixel(x, y) {
    if (!sourceImage) return null;
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= sampleCanvas.width || y >= sampleCanvas.height) return null;
    try {
      const d = sampleCtx.getImageData(x, y, 1, 1).data;
      return toHex(d[0], d[1], d[2]);
    } catch (e) { return null; }
  }

  img.addEventListener('load', () => {
    if (!sourceImage) {
      sourceImage = new Image();
      sourceImage.onload = () => {
        sampleCanvas.width = sourceImage.naturalWidth;
        sampleCanvas.height = sourceImage.naturalHeight;
        sampleCtx.drawImage(sourceImage, 0, 0);
      };
      sourceImage.src = img.src;
    }
    updateInfo();
  });

  function scale() {
    return img.naturalWidth ? img.clientWidth / img.naturalWidth : 1;
  }

  function updateInfo() {
    const pct = Math.round(scale() * 100);
    info.textContent = `${img.naturalWidth} × ${img.naturalHeight} px  ·  ${pct}%`;
  }

  function posToImage(e) {
    const rect = img.getBoundingClientRect();
    const s = scale();
    return {
      x: Math.floor((e.clientX - rect.left) / s),
      y: Math.floor((e.clientY - rect.top) / s),
      inside: e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom,
    };
  }

  img.addEventListener('mousemove', (e) => {
    const p = posToImage(e);
    if (!p.inside) return hideOverlay();

    const color = samplePixel(p.x, p.y);
    vscode.postMessage({ type: 'coords', x: p.x, y: p.y, color });

    if (cfg.crosshair) {
      const rect = wrap.getBoundingClientRect();
      crossV.style.display = 'block';
      crossH.style.display = 'block';
      crossV.style.left = (e.clientX - rect.left) + 'px';
      crossH.style.top = (e.clientY - rect.top) + 'px';
    }

  });

  function hideOverlay() {
    crossV.style.display = 'none';
    crossH.style.display = 'none';
    vscode.postMessage({ type: 'leave' });
  }

  img.addEventListener('mouseleave', hideOverlay);

  img.addEventListener('click', (e) => {
    const p = posToImage(e);
    if (!p.inside || cfg.clickToCopy === 'off') return;
    const color = samplePixel(p.x, p.y);
    let text = '';
    if (cfg.clickToCopy === 'coords' || cfg.clickToCopy === 'both') text = `${p.x}, ${p.y}`;
    if (cfg.clickToCopy === 'color') text = color || '';
    if (cfg.clickToCopy === 'both' && color) text += color ? ` ${color}` : '';
    if (text) vscode.postMessage({ type: 'copy', text });
  });

  // Ctrl+scroll to zoom (free scale, overrides fit/actual classes via inline width)
  let zoom = null;
  wrap.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const base = zoom || img.clientWidth;
    zoom = Math.max(32, Math.min(8000, base * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
    img.classList.remove('actual');
    img.style.maxWidth = 'none';
    img.style.maxHeight = 'none';
    img.style.width = zoom + 'px';
    updateInfo();
  }, { passive: false });

  window.addEventListener('resize', updateInfo);
})();
