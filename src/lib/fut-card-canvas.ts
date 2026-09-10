import { PlayerCardCustomState, CARD_TEMPLATES, NATIONS, CLUBS, DEFAULT_PLAYER_AVATAR } from './fut-card-config';

/**
 * Load an image safely into an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Renders the custom FUT card onto an HTML5 canvas and returns the canvas element
 */
export async function renderCardToCanvas(
  state: PlayerCardCustomState,
  options: {
    targetWidth?: number;
    includeSubFooter?: boolean;
  } = {}
): Promise<HTMLCanvasElement> {
  const targetWidth = options.targetWidth || 800;
  // Aspect ratio based on standard EA FC card: 1.42
  const targetHeight = Math.round(targetWidth * 1.42);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not supported');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Ensure Barlow Condensed font is loaded
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await Promise.all([
        document.fonts.load('900 24px "Barlow Condensed"'),
        document.fonts.load('800 24px "Barlow Condensed"'),
      ]);
    } catch {}
  }

  // 1. Find template
  const template = CARD_TEMPLATES.find((t) => t.id === state.templateId) || CARD_TEMPLATES[0];

  // 2. Load template image
  let templateImg: HTMLImageElement | null = null;
  try {
    templateImg = await loadImage(template.src);
  } catch (err) {
    console.warn('Could not load template image, falling back to base', err);
    try {
      templateImg = await loadImage('/fut-cards/templates/rare_gold.png');
    } catch {}
  }

  // 3. Define Card Shield Path for clipping
  const w = targetWidth;
  const h = targetHeight;
  const pad = w * 0.03;

  function createShieldPath(context: CanvasRenderingContext2D) {
    context.beginPath();
    // Top arch curve
    context.moveTo(w * 0.5, pad);
    context.bezierCurveTo(w * 0.85, pad, w - pad, pad * 2, w - pad, h * 0.2);
    // Right side straight down
    context.lineTo(w - pad, h * 0.72);
    // Bottom tapered tip
    context.bezierCurveTo(w - pad, h * 0.88, w * 0.65, h - pad, w * 0.5, h - pad * 0.6);
    context.bezierCurveTo(w * 0.35, h - pad, pad, h * 0.88, pad, h * 0.72);
    // Left side straight up
    context.lineTo(pad, h * 0.2);
    context.bezierCurveTo(pad, pad * 2, w * 0.15, pad, w * 0.5, pad);
    context.closePath();
  }

  // 4. Draw Card Background Frame FIRST
  if (templateImg) {
    ctx.save();
    createShieldPath(ctx);
    ctx.clip();
    ctx.drawImage(templateImg, 0, 0, w, h);
    ctx.restore();
  }

  // 5. Draw player avatar ON TOP of template frame with smooth bottom fade
  const rawAvatar = state.avatarUrl?.trim();
  const isWrong10 =
    state.jerseyNumber !== 10 &&
    !state.playerName?.toUpperCase().includes('NGHĨA') &&
    (rawAvatar?.includes('/10.webp') || rawAvatar === '/player/10.webp');
  const avatarToLoad = !rawAvatar || isWrong10 ? DEFAULT_PLAYER_AVATAR : rawAvatar;

  try {
    let avatarImg: HTMLImageElement;
    try {
      avatarImg = await loadImage(avatarToLoad);
    } catch {
      avatarImg = await loadImage(DEFAULT_PLAYER_AVATAR);
    }

    ctx.save();
    createShieldPath(ctx);
    ctx.clip();

    // Position player photo in upper-middle area
    const playerBaseW = w * 0.72 * state.scale;
    const playerAspect = (avatarImg.naturalHeight || 1) / (avatarImg.naturalWidth || 1);
    const playerBaseH = playerBaseW * playerAspect;

    const centerX = w * 0.52 + (state.offsetX * (w / 300));
    const centerY = h * 0.38 + (state.offsetY * (h / 417));

    const drawX = centerX - playerBaseW / 2;
    const drawY = centerY - playerBaseH / 2;

    // Draw avatar with gradient mask on an offscreen canvas
    if (typeof document !== 'undefined') {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = w;
      offCanvas.height = h;
      const offCtx = offCanvas.getContext('2d');
      if (offCtx) {
        offCtx.drawImage(avatarImg, drawX, drawY, playerBaseW, playerBaseH);

        // Fade out lower body seamlessly before the Name banner (h * 0.638)
        offCtx.globalCompositeOperation = 'destination-out';
        const maskGrad = offCtx.createLinearGradient(0, h * 0.50, 0, h * 0.638);
        maskGrad.addColorStop(0, 'rgba(0,0,0,0)');
        maskGrad.addColorStop(1, 'rgba(0,0,0,1)');
        offCtx.fillStyle = maskGrad;
        offCtx.fillRect(0, h * 0.50, w, h * 0.25);

        ctx.drawImage(offCanvas, 0, 0);
      } else {
        ctx.drawImage(avatarImg, drawX, drawY, playerBaseW, playerBaseH);
      }
    } else {
      ctx.drawImage(avatarImg, drawX, drawY, playerBaseW, playerBaseH);
    }

    ctx.restore();
  } catch (e) {
    console.warn('Avatar image could not be loaded into canvas:', e);
  }

  // Determine text color
  const textColor = state.customTextColor
    ? state.customTextColor
    : template.textTheme === 'dark'
    ? '#362812'
    : '#ffffff';
  const subTextColor = template.textTheme === 'dark' ? 'rgba(54, 40, 18, 0.8)' : 'rgba(255, 255, 255, 0.85)';

  // 6. Draw Top-Left: Overall Rating (OVR) & Position (FUTBIN: top 22.29%, left 17.00%)
  ctx.save();
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';

  const leftColX = w * 0.235;

  // Rating
  ctx.font = `700 ${Math.round(w * 0.125)}px "Barlow Condensed", "Saira Condensed", "DIN Alternate", sans-serif`;
  ctx.shadowColor = template.textTheme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fillText(String(state.rating), leftColX, h * 0.26);

  // Position
  ctx.font = `700 ${Math.round(w * 0.058)}px "Barlow Condensed", "Saira Condensed", "DIN Alternate", sans-serif`;
  ctx.fillText(state.position.toUpperCase(), leftColX, h * 0.315);

  // Role Intensity (+ or ++)
  if (state.roleIntensity) {
    ctx.font = `700 ${Math.round(w * 0.042)}px "Barlow Condensed", "Saira Condensed", sans-serif`;
    ctx.fillStyle = template.accentColor || '#ef4444';
    ctx.fillText(state.roleIntensity, leftColX, h * 0.355);
  }
  ctx.restore();

  // 7. Draw Top-Right: Alternate Positions Badge (EA FC 26 Hexagon Polygon Style)
  if (state.showAltPositions && state.altPositions && state.altPositions.length > 0) {
    const positions = state.altPositions.filter((p) => p && p.trim().length > 0);
    if (positions.length > 0) {
      ctx.save();
      const count = positions.length;
      const badgeW = w * 0.126; // ~38px on 300px
      const itemH = h * 0.0528; // ~22px per item on 417px
      const badgeH = itemH * count;
      const chev = w * 0.020; // ~6px

      const badgeX = w * 0.962 - badgeW; // right: 3.8%
      const badgeY = h * 0.255;

      const textColor = state.altPositionTextColor || '#ffffff';
      const borderColor = state.altPositionBorderColor || '#ffffff';
      const bgColor = state.altPositionBgColor || '#623B91';

      // Draw Outer Hexagon Polygon Badge
      ctx.beginPath();
      ctx.moveTo(badgeX, badgeY + chev);
      ctx.lineTo(badgeX + badgeW / 2, badgeY);
      ctx.lineTo(badgeX + badgeW, badgeY + chev);
      ctx.lineTo(badgeX + badgeW, badgeY + badgeH - chev);
      ctx.lineTo(badgeX + badgeW / 2, badgeY + badgeH);
      ctx.lineTo(badgeX, badgeY + badgeH - chev);
      ctx.closePath();

      ctx.fillStyle = bgColor;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      ctx.fill();

      // Outline
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = borderColor;
      ctx.stroke();

      // Divider Lines between position slots
      for (let i = 1; i < count; i++) {
        const lineY = badgeY + i * itemH;
        ctx.beginPath();
        ctx.moveTo(badgeX, lineY);
        ctx.lineTo(badgeX + badgeW, lineY);
        ctx.stroke();
      }

      // Draw Text for Each Position
      ctx.fillStyle = textColor;
      ctx.font = `700 ${Math.round(w * 0.040)}px "Barlow Condensed", "Saira Condensed", "DIN Alternate", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < count; i++) {
        const posText = positions[i].toUpperCase();
        const textY = badgeY + (i + 0.5) * itemH;
        ctx.fillText(posText, badgeX + badgeW / 2, textY);
      }

      ctx.restore();
    }
  }

  // 8. Draw Middle Player Name Banner (FUTBIN: top 63.83%)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = textColor;
  ctx.font = `700 ${Math.round(w * 0.076)}px "Barlow Condensed", "Saira Condensed", "DIN Alternate", sans-serif`;
  ctx.shadowColor = template.textTheme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  const displayName = state.playerName ? state.playerName.toUpperCase() : 'CẦU THỦ';
  const nameY = h * 0.665;
  ctx.fillText(displayName, w * 0.5, nameY);

  // Injury Prone Badge next to name
  if (state.isInjuryProne) {
    const textWidth = ctx.measureText(displayName).width;
    const badgeX = w * 0.5 + textWidth / 2 + 10;
    const badgeY = nameY - Math.round(w * 0.06);

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, w * 0.05, w * 0.05, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(w * 0.032)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', badgeX + (w * 0.05) / 2, badgeY + (w * 0.05) / 2);
  }
  ctx.restore();

  // 10. Draw 6 Face Stats (FUTBIN: top 71.31%)
  if (state.showStats) {
    ctx.save();
    const faceStats = state.faceStats;
    const rawNo = faceStats?.no ?? state.jerseyNumber;
    const displayNo = (rawNo !== undefined && rawNo !== null && rawNo !== '' && rawNo !== 0 && rawNo !== '0' && rawNo !== '?')
      ? rawNo
      : '?';

    const statsList = [
      { label: 'WR', val: faceStats?.wr ?? 68 },
      { label: 'W', val: faceStats?.w ?? 12 },
      { label: 'D', val: faceStats?.d ?? 4 },
      { label: 'L', val: faceStats?.l ?? 3 },
      { label: 'P', val: faceStats?.p ?? 19 },
      { label: 'No.', val: displayNo },
    ];

    const colWidth = (w * 0.78) / 6;
    for (let i = 0; i < 6; i++) {
      const colX = w * 0.11 + (i + 0.5) * colWidth;

      // Label (on top)
      ctx.textAlign = 'center';
      ctx.fillStyle = subTextColor;
      ctx.font = `700 ${Math.round(w * 0.033)}px "Barlow Condensed", "Saira Condensed", sans-serif`;
      ctx.fillText(statsList[i].label, colX, h * 0.735);

      // Value (below label)
      ctx.textAlign = 'center';
      ctx.fillStyle = textColor;
      ctx.font = `700 ${Math.round(w * 0.060)}px "Barlow Condensed", "Saira Condensed", sans-serif`;
      ctx.fillText(String(statsList[i].val), colX, h * 0.782);
    }
    ctx.restore();
  }

  // 11. Draw Bottom Badges: Vietnam Flag + Chấm Hết FC (.HẾT) Logo (FUTBIN: top 81.37%)
  ctx.save();
  const badgeY = h * 0.825;
  const flagW = Math.round(w * 0.080);
  const flagH = Math.round(flagW * 0.667);
  const clubSize = Math.round(w * 0.076);
  const gap = Math.round(w * 0.028);

  const showNation = state.showNation !== false;
  const showClub = true; // Always display Chấm Hết FC logo after flag

  let totalW = 0;
  if (showNation && showClub) {
    totalW = flagW + gap + clubSize;
  } else if (showNation) {
    totalW = flagW;
  } else if (showClub) {
    totalW = clubSize;
  }

  const startX = (w - totalW) / 2;
  let currentX = startX;

  // Draw Vietnam Flag
  if (showNation) {
    const nationUrl = state.customNationUrl || '/fut-cards/nations/Vietnam.png';
    try {
      const nationImg = await loadImage(nationUrl);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(currentX, badgeY - flagH / 2, flagW, flagH, 3);
      ctx.clip();
      ctx.drawImage(nationImg, currentX, badgeY - flagH / 2, flagW, flagH);
      ctx.restore();
    } catch {}
    currentX += flagW + gap;
  }

  // Draw Chấm Hết FC Logo (.HẾT)
  if (showClub) {
    const clubUrl = state.customClubUrl || '/fut-cards/clubs/cham_het_fc.png';
    try {
      const clubImg = await loadImage(clubUrl);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      ctx.drawImage(clubImg, currentX, badgeY - clubSize / 2, clubSize, clubSize);
      ctx.restore();
    } catch {}
  }
  ctx.restore();

  return canvas;
}

/**
 * Triggers a direct download of the generated card as a PNG file
 */
export async function downloadCardPng(state: PlayerCardCustomState, filename?: string): Promise<void> {
  const canvas = await renderCardToCanvas(state, { targetWidth: 1000 });
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `${state.playerName.trim() || 'fut-card'}_fc26.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}

/**
 * Copies the generated card image to clipboard
 */
export async function copyCardToClipboard(state: PlayerCardCustomState): Promise<boolean> {
  try {
    const canvas = await renderCardToCanvas(state, { targetWidth: 800 });
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) return resolve(false);
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          resolve(true);
        } catch (err) {
          console.error('Clipboard write error:', err);
          resolve(false);
        }
      }, 'image/png');
    });
  } catch (err) {
    console.error(err);
    return false;
  }
}
