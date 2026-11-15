import * as T from "three";

export type FieldLabel = T.Mesh<T.PlaneGeometry, T.MeshBasicMaterial>;

export function fieldLabel(width: number, height = width / 4) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 192;
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.anisotropy = 4;
  const label = new T.Mesh(
    new T.PlaneGeometry(width, height),
    new T.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false }),
  );
  label.userData.noCollision = true;
  return label;
}

export function drawFieldLabel(label: FieldLabel, title: string, subtitle: string, accent = "#83dcef") {
  const map = label.material.map!;
  const ctx = (map.image as HTMLCanvasElement).getContext("2d")!;
  ctx.clearRect(0, 0, 768, 192);
  ctx.beginPath();
  ctx.moveTo(10, 10);
  ctx.lineTo(734, 10);
  ctx.lineTo(758, 34);
  ctx.lineTo(758, 168);
  ctx.lineTo(34, 168);
  ctx.lineTo(10, 144);
  ctx.closePath();
  ctx.fillStyle = "#09131e";
  ctx.fill();
  ctx.strokeStyle = "#517487";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(37, 44, 79, 88);
  ctx.fillStyle = "#263544";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(76, 88, 15, 0, Math.PI * 2);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(76, 88, 5, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.fillStyle = "#f6f4f0";
  ctx.font = "600 43px monospace";
  ctx.fillText(title.toUpperCase(), 144, 85, 572);
  ctx.fillStyle = "#c0c1c2";
  ctx.font = "500 28px monospace";
  ctx.fillText(subtitle, 146, 126, 566);
  ctx.beginPath();
  ctx.moveTo(374, 168);
  ctx.lineTo(384, 182);
  ctx.lineTo(394, 168);
  ctx.fillStyle = "#09131e";
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(37, 20, 90, 4);
  ctx.fillRect(700, 147, 30, 3);
  ctx.fillRect(682, 147, 10, 3);
  map.needsUpdate = true;
}
