/**
 * SpecularButton — WebGL2 Specular Light Button Engine
 * Based on React Bits SpecularButton component by reactbits.dev
 * Zero external dependencies (self-contained WebGL2 engine)
 */

const PAD = 24;
const TAU = Math.PI * 2;

const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uCenter;
uniform vec2 uHalf;
uniform float uRadius;
uniform float uPx;
uniform float uSpot;
uniform vec2 uEntry;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform vec2 uWindow;
uniform float uThickness;
uniform float uGlow;
out vec4 outColor;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float loopPosition(vec2 p, vec2 b, float r) {
  vec2 inner = b - r;
  float arc = 1.5707963 * r;
  float quarter = inner.x + inner.y + arc;
  vec2 a = abs(p);
  vec2 q = a - inner;
  float s = q.x > 0.0 && q.y > 0.0
    ? inner.y + atan(q.y, q.x) * r
    : (q.x > q.y ? min(a.y, inner.y) : inner.y + arc + inner.x - min(a.x, inner.x));
  if (p.x < 0.0) s = p.y >= 0.0 ? 2.0 * quarter - s : 2.0 * quarter + s;
  else if (p.y < 0.0) s = 4.0 * quarter - s;
  return s / max(4.0 * quarter, 0.0001);
}

float lobe(float position, float center) {
  float gap = abs(fract(position - center + 0.5) - 0.5);
  return 1.0 - smoothstep(uWindow.x, uWindow.x + uWindow.y, gap);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = roundedBox(p, uHalf, uRadius);
  float position = loopPosition(p, uHalf, uRadius);
  float key = lobe(position, uSpot);
  float back = lobe(position, uSpot + 0.5);
  float streak = key + back * 0.45;
  float width = max(uThickness * uPx * mix(1.0, max(key, back), 0.6), 0.35);
  float band = smoothstep(-width - 0.6, -width + 0.6, d) * (1.0 - smoothstep(-0.6, 0.6, d));
  float hair = smoothstep(-uPx - 0.6, -uPx + 0.6, d) * (1.0 - smoothstep(-0.6, 0.6, d));
  float inside = 1.0 - smoothstep(-0.6, 0.6, d);
  vec2 pool = (p - uEntry) / (uHalf.y * vec2(1.6, 1.1));
  float glow = streak * 0.2 * exp(-abs(d + width * 0.5) / (5.0 * uPx)) + inside * 0.08 * exp(-dot(pool, pool));
  float light = clamp((band * streak + glow * uGlow) * uIntensity, 0.0, 1.0);
  vec4 base = vec4(uBaseColor, 1.0) * hair * 0.6;
  outColor = vec4(uLineColor, 1.0) * light + base * (1.0 - light);
}`;

const UNIFORMS = [
  'uCenter',
  'uHalf',
  'uRadius',
  'uPx',
  'uSpot',
  'uEntry',
  'uLineColor',
  'uBaseColor',
  'uIntensity',
  'uWindow',
  'uThickness',
  'uGlow'
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrap = value => value - Math.floor(value);

const loopPosition = (x, y, halfX, halfY, r) => {
  const innerX = halfX - r;
  const innerY = halfY - r;
  const arc = (Math.PI / 2) * r;
  const quarter = innerX + innerY + arc;
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const qx = ax - innerX;
  const qy = ay - innerY;
  let s;
  if (qx > 0 && qy > 0) s = innerY + Math.atan2(qy, qx) * r;
  else if (qx > qy) s = Math.min(ay, innerY);
  else s = innerY + arc + innerX - Math.min(ax, innerX);
  if (x < 0) s = y >= 0 ? 2 * quarter - s : 2 * quarter + s;
  else if (y < 0) s = 4 * quarter - s;
  return wrap(s / Math.max(4 * quarter, 0.0001));
};

const rimPoint = (position, halfX, halfY, r) => {
  const innerX = halfX - r;
  const innerY = halfY - r;
  const arc = (Math.PI / 2) * r;
  const quarter = innerX + innerY + arc;
  let s = wrap(position) * 4 * quarter;
  let signX = 1;
  let signY = 1;
  if (s > 3 * quarter) {
    s = 4 * quarter - s;
    signY = -1;
  } else if (s > 2 * quarter) {
    s -= 2 * quarter;
    signX = -1;
    signY = -1;
  } else if (s > quarter) {
    s = 2 * quarter - s;
    signX = -1;
  }
  let x = innerX - (s - innerY - arc);
  let y = halfY;
  if (s <= innerY) {
    x = halfX;
    y = s;
  } else if (s <= innerY + arc) {
    const angle = (s - innerY) / Math.max(r, 0.0001);
    x = innerX + Math.cos(angle) * r;
    y = innerY + Math.sin(angle) * r;
  }
  return [x * signX, y * signY];
};

const compile = (gl, type, source) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};

const link = gl => {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
  return null;
};

class SpecularButtonInstance {
  constructor(element, options = {}) {
    this.button = element;
    this.settings = Object.assign({
      radius: 17,
      tint: '#ffffff',
      tintOpacity: 0.06,
      blur: 0,
      textColor: '#f5f5f5',
      lineColor: '#ffffff',
      baseColor: '#525252',
      intensity: 1.25,
      idleIntensity: 0.3,
      shineSize: 19,
      shineFade: 43,
      thickness: 0.5,
      glow: 0.35,
      speed: 0.35,
      followMouse: true,
      proximity: 310,
      autoAnimate: false,
      disabled: false
    }, options);

    this.init();
  }

  init() {
    const button = this.button;
    button.classList.add('specular-button');
    if (!button.classList.contains('specular-button--sm') &&
        !button.classList.contains('specular-button--md') &&
        !button.classList.contains('specular-button--lg')) {
      button.classList.add('specular-button--lg');
    }

    // Apply CSS variables for styling
    button.style.setProperty('--sb-radius', `${this.settings.radius}px`);
    button.style.setProperty('--sb-tint', this.settings.tint);
    button.style.setProperty('--sb-tint-opacity', this.settings.tintOpacity);
    button.style.setProperty('--sb-blur', `${this.settings.blur}px`);
    button.style.setProperty('--sb-text-color', this.settings.textColor);

    // Look for canvas or create it
    let canvas = button.querySelector('.specular-button__light');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'specular-button__light';
      canvas.setAttribute('aria-hidden', 'true');
      button.prepend(canvas);
    }
    this.canvas = canvas;

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false
    });
    if (!gl) {
      console.warn('SpecularButton: WebGL2 not supported.');
      return;
    }
    this.gl = gl;

    this.program = link(gl);
    if (!this.program) return;

    this.uniforms = {};
    for (const name of UNIFORMS) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }

    this.buffer = gl.createBuffer();
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    this.reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.colors = new Map();
    this.view = { width: 1, height: 1, ratio: 1 };
    this.pointer = { x: 0, y: 0, known: false };
    this.state = { spot: 0, level: 0, press: 0, ready: false };
    this.raf = 0;
    this.last = 0;
    this.visible = true;

    this.bindEvents();
    this.measure();
  }

  toRgb(value) {
    if (this.colors.has(value)) return this.colors.get(value);
    let rgb = [1, 1, 1];
    if (this.probe) {
      this.probe.clearRect(0, 0, 1, 1);
      this.probe.fillStyle = '#000000';
      this.probe.fillStyle = value;
      this.probe.fillRect(0, 0, 1, 1);
      const [r, g, b] = this.probe.getImageData(0, 0, 1, 1).data;
      rgb = [r / 255, g / 255, b / 255];
    }
    this.colors.set(value, rgb);
    return rgb;
  }

  cornerRadius(s) {
    return Math.min(s.radius, this.view.width / 2, this.view.height / 2);
  }

  restSpot(s) {
    const r = this.cornerRadius(s);
    const inset = r * (1 - Math.SQRT1_2);
    return loopPosition(inset - this.view.width / 2, this.view.height / 2 - inset, this.view.width / 2, this.view.height / 2, r);
  }

  aim(s) {
    if (!s.followMouse || s.disabled || !this.pointer.known) return null;
    const rect = this.button.getBoundingClientRect();
    const scale = rect.width / this.view.width || 1;
    const halfX = this.view.width / 2;
    const halfY = this.view.height / 2;
    const x = (this.pointer.x - rect.left - rect.width / 2) / scale;
    const y = (rect.top + rect.height / 2 - this.pointer.y) / scale;
    const distance = Math.hypot(Math.max(Math.abs(x) - halfX, 0), Math.max(Math.abs(y) - halfY, 0));
    const t = clamp(1 - distance / s.proximity, 0, 1);
    const near = t * t * (3 - 2 * t);
    const nearest = loopPosition(x, y, halfX, halfY, this.cornerRadius(s));
    if (distance > 0) return { spot: nearest, near };
    const depth = clamp(Math.min(halfX - Math.abs(x), halfY - Math.abs(y)) / (halfY * 0.8), 0, 1);
    const sway = this.restSpot(s) - (x / halfX) * 0.06 - (y / halfY) * 0.02;
    const offset = sway - nearest - Math.round(sway - nearest);
    return { spot: wrap(nearest + offset * depth * depth * (3 - 2 * depth)), near };
  }

  draw(s) {
    const { width, height } = this.view;
    const canvas = this.canvas;
    const gl = this.gl;
    const scaleX = canvas.width / (width + PAD * 2);
    const scaleY = canvas.height / (height + PAD * 2);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.uniform2f(this.uniforms.uCenter, (PAD + width / 2) * scaleX, (PAD + height / 2) * scaleY);
    gl.uniform2f(this.uniforms.uHalf, (width / 2) * scaleX, (height / 2) * scaleY);
    gl.uniform1f(this.uniforms.uRadius, Math.min(s.radius, width / 2, height / 2) * scaleX);
    gl.uniform1f(this.uniforms.uPx, this.view.ratio);

    const r = Math.min(s.radius, width / 2, height / 2);
    const [rimX, rimY] = rimPoint(this.state.spot, width / 2, height / 2, r);
    const pull = 1 - Math.min(0.35 * (height / 2), Math.hypot(rimX, rimY)) / Math.max(Math.hypot(rimX, rimY), 0.0001);

    gl.uniform1f(this.uniforms.uSpot, this.state.spot);
    gl.uniform2f(this.uniforms.uEntry, rimX * pull * scaleX, rimY * pull * scaleY);
    gl.uniform3fv(this.uniforms.uLineColor, this.toRgb(s.lineColor));
    gl.uniform3fv(this.uniforms.uBaseColor, this.toRgb(s.baseColor));
    gl.uniform1f(this.uniforms.uIntensity, s.intensity * (this.state.level + this.state.press * 0.8));
    gl.uniform2f(this.uniforms.uWindow, s.shineSize / 360 + this.state.press * 0.06, s.shineFade / 360 + 0.0001);
    gl.uniform1f(this.uniforms.uThickness, s.thickness);
    gl.uniform1f(this.uniforms.uGlow, s.glow);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  frame(now) {
    this.raf = 0;
    if (!this.visible) return;
    const s = this.settings;
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 1 / 60;
    this.last = now;

    const target = this.aim(s);
    const spinning = s.autoAnimate && !this.reduce;
    const steering = !!target && target.near > 0;

    if (!this.state.ready) {
      this.state.spot = this.restSpot(s);
      this.state.level = s.autoAnimate ? 1 : s.idleIntensity;
      this.state.ready = true;
    }

    let diff = 0;
    if (spinning && !steering) {
      this.state.spot = wrap(this.state.spot + (s.speed / TAU) * dt);
    } else {
      diff = (steering ? target.spot : this.restSpot(s)) - this.state.spot;
      diff -= Math.round(diff);
      this.state.spot = wrap(this.state.spot + diff * (1 - Math.exp(-dt * 8)));
    }

    const level = s.autoAnimate ? 1 : s.idleIntensity + (1 - s.idleIntensity) * (target ? target.near : 0);
    this.state.level += (level - this.state.level) * (1 - Math.exp(-dt * 7));
    this.state.press *= Math.exp(-dt * 5);

    this.draw(s);

    const settling = Math.abs(diff) > 0.0002 || Math.abs(level - this.state.level) > 0.001 || this.state.press > 0.002;
    if (settling || (spinning && !steering)) {
      this.raf = requestAnimationFrame(this.frame.bind(this));
    } else {
      this.last = 0;
    }
  }

  wake() {
    if (!this.raf && this.visible) {
      this.raf = requestAnimationFrame(this.frame.bind(this));
    }
  }

  measure(entry) {
    const box = entry?.borderBoxSize?.[0];
    this.view.width = Math.max(1, box ? box.inlineSize : this.button.offsetWidth);
    this.view.height = Math.max(1, box ? box.blockSize : this.button.offsetHeight);
    this.view.ratio = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.max(1, Math.round((this.view.width + PAD * 2) * this.view.ratio));
    this.canvas.height = Math.max(1, Math.round((this.view.height + PAD * 2) * this.view.ratio));
    if (this.state.ready) this.draw(this.settings);
    this.wake();
  }

  bindEvents() {
    this.onPointerMove = event => {
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.pointer.known = true;
      this.wake();
    };

    this.onPointerDown = event => {
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.pointer.known = true;
      if (!this.settings.disabled) this.state.press = 1;
      this.wake();
    };

    this.onPointerEnd = event => {
      if (event.pointerType === 'mouse') return;
      this.pointer.known = false;
      this.wake();
    };

    this.onPointerLeave = () => {
      this.pointer.known = false;
      this.wake();
    };

    this.resizeObserver = new ResizeObserver(entries => this.measure(entries[entries.length - 1]));
    this.resizeObserver.observe(this.button);

    this.intersection = new IntersectionObserver(entries => {
      this.visible = entries.some(entry => entry.isIntersecting);
      if (this.visible) {
        this.last = 0;
        this.wake();
      }
    });
    this.intersection.observe(this.button);

    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerup', this.onPointerEnd, { passive: true });
    window.addEventListener('pointercancel', this.onPointerEnd, { passive: true });
    document.documentElement.addEventListener('pointerleave', this.onPointerLeave);
    this.button.addEventListener('pointerdown', this.onPointerDown);
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.intersection?.disconnect();
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerEnd);
    window.removeEventListener('pointercancel', this.onPointerEnd);
    document.documentElement.removeEventListener('pointerleave', this.onPointerLeave);
    this.button.removeEventListener('pointerdown', this.onPointerDown);
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteProgram(this.program);
    if (!this.canvas.isConnected) this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

// Global factory helper
window.SpecularButton = SpecularButtonInstance;
