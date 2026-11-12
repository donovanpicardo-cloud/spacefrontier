import * as T from "three";

let panel: T.CanvasTexture | undefined;
/** One shared, neutral coating map. Fine wear never overrides semantic colours. */
export function engineeringMap() {
  if (panel) return panel;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const pixels = ctx.createImageData(512, 512);
  let seed = 4701;
  const random = () => ((seed = Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let y = 0; y < 512; y++) {
    const brushing = random() * 3;
    for (let x = 0; x < 512; x++) {
      const i = (y * 512 + x) * 4;
      const value = 225 + brushing + random() * 13;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
      pixels.data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  for (let i = 0; i < 100; i++) {
    ctx.strokeStyle = `rgba(65,75,82,${.025 + random() * .045})`;
    const x = random() * 512, y = random() * 512;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2 + random() * 17, y + random() * 2); ctx.stroke();
  }
  // Recessed panel joint, chamfer highlight and captive fasteners, all in one map.
  ctx.strokeStyle = "#747d83"; ctx.lineWidth = 3;
  ctx.strokeRect(5, 5, 502, 502);
  ctx.strokeStyle = "#fafbfc"; ctx.lineWidth = 2;
  ctx.strokeRect(9, 9, 494, 494);
  ctx.strokeStyle = "#b9bec1"; ctx.lineWidth = 1;
  ctx.strokeRect(21, 21, 470, 470);
  for (const x of [31, 481]) for (const y of [31, 481]) {
    ctx.fillStyle = "#727b82";
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#dfe3e5";
    ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x + 2, y); ctx.stroke();
  }
  const dust = ctx.createLinearGradient(0, 390, 0, 505);
  dust.addColorStop(0, "#484d5100"); dust.addColorStop(1, "#484d5122");
  ctx.fillStyle = dust; ctx.fillRect(11, 390, 490, 112);
  ctx.fillStyle = "#7b8388"; ctx.font = "9px monospace";
  ctx.fillText("THERMAL / 07", 42, 474);
  for (let i = 0; i < 14; i++) ctx.fillRect(408 + i * 3, 460, i % 3 === 0 ? 2 : 1, 12);
  panel = new T.CanvasTexture(canvas);
  panel.name = "Ceramic coating / fine brushed wear";
  panel.colorSpace = T.SRGBColorSpace;
  panel.wrapS = panel.wrapT = T.RepeatWrapping;
  panel.anisotropy = 8;
  return panel;
}

export function isEngineeringMap(texture: T.Texture) { return texture === panel; }
