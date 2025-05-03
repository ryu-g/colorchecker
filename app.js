function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function colorDistance(color1, color2) { // 3d distance calcuration
  const c1 = color1
  const c2 = color2
  const dr = c1[0] - c2[0];
  const dg = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function mergeSimilarColors(colorMap, threshold = 32) {
  const entries = Object.entries(colorMap);
  const merged = [];

  entries.forEach(([key, count]) => {
    const rgb = key.split(',').map(Number);
    let mergedInto = false;

    for (let m of merged) {
      if (colorDistance(m.rgb, rgb) < threshold) {
        m.count += count;
        m.rgbSum[0] += rgb[0] * count;
        m.rgbSum[1] += rgb[1] * count;
        m.rgbSum[2] += rgb[2] * count;
        mergedInto = true;
        break;
      }
    }

    if (!mergedInto) {
      merged.push({
        rgb,
        count,
        rgbSum: [rgb[0] * count, rgb[1] * count, rgb[2] * count]
      });
    }
  });

  return merged.map(({ count, rgbSum }) => {
    const r = Math.round(rgbSum[0] / count);
    const g = Math.round(rgbSum[1] / count);
    const b = Math.round(rgbSum[2] / count);
    return {
      color: rgbToHex(r, g, b),
      count
    };
  });
}
function getDominantColors(image, count = 10, minPercent = 0.5) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const colorCount = {};
  let totalPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a === 0) continue; // 完全透明は無視

    const key = `${r},${g},${b}`;
    colorCount[key] = (colorCount[key] || 0) + 1;
    totalPixels++;
  }

  const mergedColors = mergeSimilarColors(colorCount);
  const total = mergedColors.reduce((sum, c) => sum + c.count, 0);

  return mergedColors
    .sort((a, b) => b.count - a.count)
    .map(c => {
      const percent = (c.count / total) * 100;
      return {
        color: c.color,
        percent: percent.toFixed(1),
        rawPercent: percent
      };
    })
    .filter(c => c.rawPercent >= minPercent)
    .slice(0, count);
}

document.getElementById('dropZone').addEventListener('dragover', e => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

document.getElementById('dropZone').addEventListener('drop', e => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files);
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const container = document.createElement('div');
      container.className = 'image-box';
      container.innerHTML = `
        <div style="text-align:center;padding:20px;">
          <img src="icon_loading_circle.gif" width="48" height="48" alt="loading..."><br>
          <span> <unchi class = "filename">${file.name}</unchi><br>の色情報を分析中...</span>
        </div>
      `
      document.getElementById('imageContainer').appendChild(container);

      const img = new Image();
      img.onload = () => {
        const colors = getDominantColors(img);
        // const container = document.createElement('div');
        // container.className = 'image-box';
        const barHTML = colors.map(c => `<div class="bar-segment" style="width:${c.percent}%;background:${c.color}" title="${c.color} (${c.percent}%)"></div>`).join('');
        container.innerHTML = `
          <img src="${img.src}" width="100%" /><br />
          ${colors.map(c => `<div style="display:flex;align-items:center;margin:4px 0">
            <div style="width:20px;height:20px;background:${c.color};margin-right:8px"></div>
            <div class = "color_name">${c.color} - ${c.percent}%</div>
          </div>`).join('')}
          <div class="bar">${barHTML}</div>
        `;
        // document.getElementById('imageContainer').appendChild(container);
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });
});