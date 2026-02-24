// ============================================================
//  CAMERA
//  Smooth follow with deadzone and bounds clamping.
// ============================================================
class Camera {
  constructor(canvasW, canvasH, worldW, worldH) {
    this.cw = canvasW;
    this.ch = canvasH;
    this.worldW = worldW;
    this.worldH = worldH;
    this.x = 0;          // top-left corner of viewport in world space
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.shake  = 0;     // shake magnitude
    this.shakeX = 0;
    this.shakeY = 0;
    this.lerp   = 0.12;  // follow smoothness (0=static, 1=instant)
  }

  follow(entity, dt) {
    // Center camera on entity
    this.targetX = entity.x + entity.w * 0.5 - this.cw * 0.5;
    this.targetY = entity.y + entity.h * 0.5 - this.ch * 0.45; // slightly above center

    // Smooth lerp
    const speed = Math.min(1, this.lerp * (dt / 16.667));
    this.x += (this.targetX - this.x) * (1 - Math.pow(1 - this.lerp, dt / 16.667));
    this.y += (this.targetY - this.y) * (1 - Math.pow(1 - this.lerp, dt / 16.667));

    // Clamp to world bounds
    this.x = Math.max(0, Math.min(this.x, this.worldW - this.cw));
    this.y = Math.max(0, Math.min(this.y, this.worldH - this.ch));

    // Camera shake
    if (this.shake > 0) {
      this.shakeX = (Math.random() * 2 - 1) * this.shake;
      this.shakeY = (Math.random() * 2 - 1) * this.shake;
      this.shake  = Math.max(0, this.shake - dt * 0.15);
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  addShake(amount) {
    this.shake = Math.min(this.shake + amount, 12);
  }

  // Apply camera transform to a canvas context
  begin(ctx) {
    ctx.save();
    ctx.translate(
      -Math.round(this.x + this.shakeX),
      -Math.round(this.y + this.shakeY)
    );
  }

  end(ctx) {
    ctx.restore();
  }

  // Convert screen coords to world coords
  toWorld(sx, sy) {
    return {
      x: sx + this.x + this.shakeX,
      y: sy + this.y + this.shakeY
    };
  }

  // Is a rect visible in the viewport? (with padding for smooth pop-in)
  isVisible(x, y, w, h, pad = 64) {
    return (
      x + w > this.x - pad &&
      x     < this.x + this.cw + pad &&
      y + h > this.y - pad &&
      y     < this.y + this.ch + pad
    );
  }

  snapTo(x, y) {
    this.x = Math.max(0, Math.min(x - this.cw * 0.5, this.worldW - this.cw));
    this.y = Math.max(0, Math.min(y - this.ch * 0.5, this.worldH - this.ch));
    this.targetX = this.x;
    this.targetY = this.y;
  }
}
