/**
 * WarpText — Pure WebGL2 Interactive Glass Refraction Text Component
 * Based on React Bits WarpText component by reactbits.dev
 * Zero external dependencies (self-contained WebGL2 engine)
 */

const LENS_MODES = { bulge: 0, pinch: 1, swirl: 2 };
const INTRO_MS = 1600;
const RIPPLE_LIFE = 1.6;
const MAX_CLICKS = 4;

const VERTEX_SHADER_SRC = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SRC = `#version 300 es
precision highp float;

uniform sampler2D uTextTexture;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uTime;
uniform float uWarpStrength;
uniform float uWarpScale;
uniform float uSpeed;
uniform float uPointerInfluence;
uniform float uPointerStrength;
uniform float uRefraction;
uniform float uChromatic;
uniform float uRipple;
uniform float uMotion;
uniform float uLens;
uniform float uIntro;
uniform float uReveal;
uniform float uBackdrop;
uniform vec4 uClicks[4];

in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

vec4 sampleText(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    return vec4(0.0);
  }
  return texture(uTextTexture, uv);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float time = uTime * uSpeed;
  float scale = max(uWarpScale, 0.001);

  vec2 drift = vec2(time * 0.055, -time * 0.045);
  float n1 = fbm(uv * scale * 3.1 + drift);
  float n2 = fbm((uv + 19.17) * scale * 3.4 - drift.yx);
  vec2 ambient = (vec2(n1, n2) - 0.5) * (uWarpStrength * 0.045 * uMotion + uIntro * 0.18);

  vec2 pointerDelta = uv - uPointer;
  vec2 aspectDelta = vec2(pointerDelta.x * aspect, pointerDelta.y);
  float dist = length(aspectDelta);
  float radius = max(uPointerInfluence, 0.001);
  float t = clamp(dist / radius, 0.0, 1.0);
  float lens = smoothstep(radius, 0.0, dist) * uPointerActive;
  float bulge = t * (1.0 - t) * (1.0 - t) * 6.75 * uPointerActive;
  vec2 dir = dist > 0.0001 ? vec2(aspectDelta.x / aspect, aspectDelta.y) / dist : vec2(0.0);

  float rippleWave = sin(dist * 28.0 - time * 4.2) * 0.5 + 0.5;
  float rippleRing = (rippleWave - 0.5) * uRipple;
  vec2 pointerWarp = dir * rippleRing * bulge * uPointerStrength * 0.016;

  if (uLens > 1.5) {
    float twist = (1.0 - t) * (1.0 - t) * uPointerActive * uPointerStrength * 2.4;
    float s = sin(twist);
    float c = cos(twist);
    vec2 turned = vec2(aspectDelta.x * c - aspectDelta.y * s, aspectDelta.x * s + aspectDelta.y * c);
    pointerWarp += vec2(turned.x / aspect, turned.y) - pointerDelta;
  } else {
    float side = uLens > 0.5 ? -1.0 : 1.0;
    pointerWarp -= dir * side * bulge * uPointerStrength * 0.045;
  }

  vec2 shock = vec2(0.0);
  float shockLight = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 click = uClicks[i];
    if (click.w <= 0.0) continue;
    vec2 clickDelta = uv - click.xy;
    vec2 clickAspect = vec2(clickDelta.x * aspect, clickDelta.y);
    float clickDist = length(clickAspect);
    float age = click.z;
    float offset = (clickDist - age * 0.9) / (0.06 + age * 0.06);
    float fade = 1.0 - smoothstep(0.0, 1.6, age);
    float energy = exp(-offset * offset) * fade * smoothstep(0.0, 0.08, age) * click.w;
    vec2 clickDir = clickDist > 0.0001 ? vec2(clickAspect.x / aspect, clickAspect.y) / clickDist : vec2(0.0);
    shock -= clickDir * offset * energy * 0.09;
    shockLight += energy;
  }

  vec2 bend = pointerWarp + shock;
  vec2 rest = uv + ambient;
  vec2 splitDir = ambient + bend;
  float splitLen = length(splitDir);
  splitDir = splitLen > 0.00001 ? splitDir / splitLen : vec2(0.7071, 0.7071);
  vec2 split = splitDir * uRefraction * 0.16 * (0.35 + lens * 1.65 + uIntro * 3.0);
  float dispersion = uChromatic * 0.5;

  vec3 ink = vec3(0.0);
  vec3 cover = vec3(0.0);
  vec3 weight = vec3(0.0);
  for (int i = 0; i < 7; i++) {
    float k = 1.0 - float(i) / 3.0;
    vec4 tap = sampleText(rest + bend * (1.0 + dispersion * k) + split * k);
    vec3 band = vec3(max(k, 0.0), 1.0 - abs(k), max(-k, 0.0));
    ink += tap.rgb * band;
    cover += tap.a * band;
    weight += band;
  }
  ink /= weight;
  cover /= weight;
  float a = max(max(cover.r, cover.g), cover.b);
  vec3 color = ink + (a - cover) * uBackdrop;
  color = min(color + (lens + shockLight * 0.5) * cover.g * 0.055, vec3(a));
  fragColor = vec4(color, a) * uReveal;
}
`;

const getFontValue = value => (typeof value === 'number' ? `${value}px` : value);
const smooth = value => value * value * (3 - 2 * value);

const getLuminance = color => {
  const probe = document.createElement('canvas');
  probe.width = 1;
  probe.height = 1;
  const ctx = probe.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 1;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

const measureLine = (ctx, line, letterSpacing) => {
  const chars = Array.from(line);
  const textWidth = chars.reduce((width, char) => width + ctx.measureText(char).width, 0);
  return textWidth + Math.max(0, chars.length - 1) * letterSpacing;
};

const drawLine = (ctx, line, x, y, letterSpacing, align = 'left') => {
  const chars = Array.from(line);
  let cursor;
  if (align === 'center') {
    cursor = x - measureLine(ctx, line, letterSpacing) / 2;
  } else {
    cursor = x;
  }

  chars.forEach((char, index) => {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + (index === chars.length - 1 ? 0 : letterSpacing);
  });
};

const buildTextCanvas = ({ container, width, height, dpr, props }) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));

  const ctx = canvas.getContext('2d');
  if (!ctx) return { canvas, ink: props.color || '#F4EDE4' };

  const probe = document.createElement('span');
  probe.textContent = props.text;
  Object.assign(probe.style, {
    position: 'absolute',
    visibility: 'hidden',
    pointerEvents: 'none',
    whiteSpace: 'pre',
    inset: '0 auto auto 0',
    color: props.color || 'inherit',
    fontFamily: props.fontFamily || 'inherit',
    fontSize: getFontValue(props.fontSize),
    fontWeight: String(props.fontWeight),
    letterSpacing: getFontValue(props.letterSpacing),
    lineHeight: typeof props.lineHeight === 'number' ? String(props.lineHeight) : props.lineHeight
  });
  container.appendChild(probe);
  const computed = window.getComputedStyle(probe);
  let fontSizePx = parseFloat(computed.fontSize) || 120;
  const ink = (props.color && props.color !== 'currentColor') ? props.color : (computed.color || '#F4EDE4');
  const fontFamily = computed.fontFamily || props.fontFamily || 'serif';
  const fontWeight = computed.fontWeight || String(props.fontWeight);
  let letterSpacing = computed.letterSpacing === 'normal' ? 0 : parseFloat(computed.letterSpacing) || 0;
  let lineHeight = parseFloat(computed.lineHeight);
  if (!Number.isFinite(lineHeight)) {
    lineHeight = fontSizePx * (typeof props.lineHeight === 'number' ? props.lineHeight : 0.88);
  }
  probe.remove();

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ink;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const lines = String(props.text || '').split('\n');
  const applyFont = () => {
    ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;
  };
  applyFont();

  const maxWidth = width * 0.95;
  const maxHeight = height * 0.90;
  const widest = Math.max(...lines.map(line => measureLine(ctx, line, letterSpacing)), 1);
  const blockHeight = lines.length > 1
    ? (lineHeight * (lines.length - 1) + fontSizePx * 0.85)
    : fontSizePx;
  const fit = Math.min(1, maxWidth / widest, maxHeight / blockHeight);

  if (fit < 1) {
    fontSizePx *= fit;
    letterSpacing *= fit;
    lineHeight *= fit;
    applyFont();
  }

  const startY = height / 2 - (lineHeight * (lines.length - 1)) / 2;
  const align = props.align || 'left';
  const paddingLeft = typeof props.paddingLeft === 'number' ? props.paddingLeft : Math.max(2, width * 0.01);
  const blockLeft = align === 'center'
    ? (width / 2)
    : (align === 'block-left' ? Math.max(paddingLeft, (width - widest) / 2) : paddingLeft);

  lines.forEach((line, index) => {
    drawLine(ctx, line, blockLeft, startY + index * lineHeight, letterSpacing, align);
  });

  return { canvas, ink };
};

class WarpTextInstance {
  constructor(container, options = {}) {
    this.container = container;
    this.props = Object.assign({
      text: 'Anisha Anil',
      color: null,
      warpStrength: 0.08,
      warpScale: 1.7,
      speed: 0.55,
      lens: 'bulge',
      pointerInfluence: 0.42,
      pointerStrength: 0.38,
      refraction: 0.018,
      chromatic: 0.35,
      idleDrift: 0.2,
      ripple: true,
      clickRipple: true,
      intro: true,
      fontSize: 146,
      fontWeight: 800,
      fontFamily: 'inherit',
      letterSpacing: '-0.06em',
      lineHeight: 0.9
    }, options);

    this.disposed = false;
    this.contextLost = false;
    this.visible = true;
    this.pageVisible = !document.hidden;
    this.reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.rasterVersion = 0;
    this.textReady = false;
    this.introProgress = this.props.intro && !this.reduceMotion ? 0 : 1;
    this.lastFrame = 0;
    this.frame = 0;
    this.lastInk = '';
    this.raf = 0;

    this.pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, active: 0, activeTarget: 0 };
    this.clicks = Array.from({ length: MAX_CLICKS }, () => [0.5, 0.5, 0, 0]);
    this.flatClicks = new Float32Array(MAX_CLICKS * 4);
    this.clickSlot = 0;
    this.startTime = performance.now();

    this.init();
  }

  init() {
    this.container.classList.add('warp-text');
    this.container.setAttribute('role', 'img');
    this.container.setAttribute('aria-label', this.props.text);

    // Hide any static fallback unless WebGL fails
    const existingFallback = this.container.querySelector('.warp-text__fallback');
    if (existingFallback) {
      existingFallback.style.display = 'none';
    }

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.style.position = 'absolute';
    this.canvas.style.inset = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.container.appendChild(this.canvas);

    try {
      this.gl = this.canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: true
      });
      if (!this.gl) throw new Error('WebGL2 not supported');
    } catch (e) {
      console.warn('WarpText: WebGL2 could not be initialized.', e);
      this.renderFallback();
      return;
    }

    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Compile Program
    const vertShader = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fragShader = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertShader);
    gl.attachShader(this.program, fragShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(this.program));
      this.renderFallback();
      return;
    }

    // Full screen triangle geometry
    const positions = new Float32Array([-1, -1, 3, -1, -1, 3]);
    const uvs = new Float32Array([0, 0, 2, 0, 0, 2]);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    const uvLoc = gl.getAttribLocation(this.program, 'uv');
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    // Texture
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Cache Uniform Locations
    this.uniforms = {
      uTextTexture: gl.getUniformLocation(this.program, 'uTextTexture'),
      uResolution: gl.getUniformLocation(this.program, 'uResolution'),
      uPointer: gl.getUniformLocation(this.program, 'uPointer'),
      uPointerActive: gl.getUniformLocation(this.program, 'uPointerActive'),
      uTime: gl.getUniformLocation(this.program, 'uTime'),
      uWarpStrength: gl.getUniformLocation(this.program, 'uWarpStrength'),
      uWarpScale: gl.getUniformLocation(this.program, 'uWarpScale'),
      uSpeed: gl.getUniformLocation(this.program, 'uSpeed'),
      uPointerInfluence: gl.getUniformLocation(this.program, 'uPointerInfluence'),
      uPointerStrength: gl.getUniformLocation(this.program, 'uPointerStrength'),
      uRefraction: gl.getUniformLocation(this.program, 'uRefraction'),
      uChromatic: gl.getUniformLocation(this.program, 'uChromatic'),
      uRipple: gl.getUniformLocation(this.program, 'uRipple'),
      uMotion: gl.getUniformLocation(this.program, 'uMotion'),
      uLens: gl.getUniformLocation(this.program, 'uLens'),
      uIntro: gl.getUniformLocation(this.program, 'uIntro'),
      uReveal: gl.getUniformLocation(this.program, 'uReveal'),
      uBackdrop: gl.getUniformLocation(this.program, 'uBackdrop'),
      uClicks: gl.getUniformLocation(this.program, 'uClicks') || gl.getUniformLocation(this.program, 'uClicks[0]')
    };

    // Observers & Events
    this.bindEvents();
    this.resize();
    if (document.fonts) {
      document.fonts.ready.then(() => {
        if (!this.disposed && !this.contextLost) {
          this.rasterize();
        }
      });
    }
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile failure: ${err}`);
    }
    return shader;
  }

  renderFallback() {
    this.container.classList.remove('is-active');
    if (this.canvas && this.canvas.parentNode === this.container) {
      this.container.removeChild(this.canvas);
    }
    const fallback = document.createElement('span');
    fallback.className = 'warp-text__fallback';
    fallback.textContent = this.props.text;
    Object.assign(fallback.style, {
      fontFamily: this.props.fontFamily || 'inherit',
      fontWeight: String(this.props.fontWeight),
      fontSize: getFontValue(this.props.fontSize),
      letterSpacing: getFontValue(this.props.letterSpacing),
      lineHeight: String(this.props.lineHeight)
    });
    this.container.appendChild(fallback);
  }

  async rasterize() {
    const version = ++this.rasterVersion;
    if (document.fonts) {
      try {
        await document.fonts.ready;
        if (this.props.fontFamily && this.props.fontFamily !== 'inherit') {
          await document.fonts.load(`${this.props.fontWeight || 700} 96px ${this.props.fontFamily}`);
        }
      } catch (e) {
        // ignore
      }
    }
    if (this.disposed || this.contextLost || version !== this.rasterVersion) return;

    const rect = this.container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.lastInk = window.getComputedStyle(this.container).color;
    const raster = buildTextCanvas({
      container: this.container,
      width: rect.width,
      height: rect.height,
      dpr,
      props: this.props
    });

    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, raster.canvas);

    this.backdropValue = getLuminance(raster.ink) < 0.5 ? 1 : 0;
    this.textReady = true;
    this.container.classList.add('is-active');
    this.renderOnce();
  }

  resize() {
    if (this.disposed || this.contextLost) return;
    const rect = this.container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.resX = this.gl.drawingBufferWidth;
    this.resY = this.gl.drawingBufferHeight;

    this.renderOnce();
    this.rasterize();
  }

  renderOnce() {
    if (this.disposed || this.contextLost || !this.gl) return;
    const gl = this.gl;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uniforms.uTextTexture, 0);

    gl.uniform2f(this.uniforms.uResolution, this.resX || gl.drawingBufferWidth, this.resY || gl.drawingBufferHeight);
    gl.uniform2f(this.uniforms.uPointer, this.pointer.x, this.pointer.y);
    gl.uniform1f(this.uniforms.uPointerActive, this.reduceMotion ? this.pointer.active * 0.35 : this.pointer.active);
    gl.uniform1f(this.uniforms.uTime, this.reduceMotion ? 0 : (performance.now() - this.startTime) * 0.001);

    gl.uniform1f(this.uniforms.uWarpStrength, this.props.warpStrength);
    gl.uniform1f(this.uniforms.uWarpScale, this.props.warpScale);
    gl.uniform1f(this.uniforms.uSpeed, this.props.speed);
    gl.uniform1f(this.uniforms.uPointerInfluence, this.props.pointerInfluence);
    gl.uniform1f(this.uniforms.uPointerStrength, this.props.pointerStrength);
    gl.uniform1f(this.uniforms.uRefraction, this.props.refraction);
    gl.uniform1f(this.uniforms.uChromatic, this.props.chromatic);
    gl.uniform1f(this.uniforms.uRipple, this.props.ripple ? 1 : 0);
    gl.uniform1f(this.uniforms.uMotion, this.reduceMotion ? 0 : 1);
    gl.uniform1f(this.uniforms.uLens, LENS_MODES[this.props.lens] ?? 0);

    const settle = 1 - this.introProgress;
    gl.uniform1f(this.uniforms.uIntro, settle * settle * settle);
    gl.uniform1f(this.uniforms.uReveal, this.textReady ? smooth(Math.min(1, this.introProgress / 0.45)) : 0);
    gl.uniform1f(this.uniforms.uBackdrop, this.backdropValue ?? 0);

    // Flatten clicks array for uniform4fv
    for (let i = 0; i < MAX_CLICKS; i++) {
      this.flatClicks[i * 4 + 0] = this.clicks[i][0];
      this.flatClicks[i * 4 + 1] = this.clicks[i][1];
      this.flatClicks[i * 4 + 2] = this.clicks[i][2];
      this.flatClicks[i * 4 + 3] = this.clicks[i][3];
    }
    gl.uniform4fv(this.uniforms.uClicks, this.flatClicks);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  loop(now) {
    if (this.disposed || this.contextLost) return;

    const elapsed = (now - this.startTime) * 0.001;
    const delta = this.lastFrame ? Math.min(now - this.lastFrame, 50) : 16;
    this.lastFrame = now;
    this.frame += 1;

    if (this.textReady && this.introProgress < 1) {
      this.introProgress = Math.min(1, this.introProgress + delta / INTRO_MS);
    }

    if (this.textReady && this.frame % 15 === 0 && window.getComputedStyle(this.container).color !== this.lastInk) {
      this.rasterize();
    }

    const drift = Math.min(Math.max(this.props.idleDrift, 0), 1);
    const engaged = this.pointer.activeTarget > 0;
    const idleX = 0.5 + Math.sin(elapsed * 0.33) * (0.08 + drift * 0.2);
    const idleY = 0.5 + Math.cos(elapsed * 0.27) * (0.06 + drift * 0.2);
    const follow = 1 - Math.exp(-delta / (engaged ? 130 : 470));

    this.pointer.x += ((engaged ? this.pointer.tx : idleX) - this.pointer.x) * follow;
    this.pointer.y += ((engaged ? this.pointer.ty : idleY) - this.pointer.y) * follow;
    this.pointer.active += ((engaged ? 1 : drift) - this.pointer.active) * (1 - Math.exp(-delta / 270));

    this.clicks.forEach(click => {
      if (click[3] <= 0) return;
      click[2] += delta / 1000;
      if (click[2] > RIPPLE_LIFE) click[3] = 0;
    });

    this.renderOnce();
    this.raf = requestAnimationFrame(this.loop);
  }

  bindEvents() {
    this.onPointerMove = event => {
      if (event.pointerType === 'touch') return;
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      this.pointer.tx = (event.clientX - rect.left) / rect.width;
      this.pointer.ty = 1 - (event.clientY - rect.top) / rect.height;
      this.pointer.activeTarget = 1;
    };

    this.onPointerLeave = () => {
      this.pointer.activeTarget = 0;
    };

    this.onPointerDown = event => {
      if (!this.props.clickRipple) return;
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const click = this.clicks[this.clickSlot];
      this.clickSlot = (this.clickSlot + 1) % this.clicks.length;
      click[0] = (event.clientX - rect.left) / rect.width;
      click[1] = 1 - (event.clientY - rect.top) / rect.height;
      click[2] = 0;
      click[3] = this.reduceMotion ? 0.35 : 1;
    };

    this.onContextLost = event => {
      event.preventDefault();
      this.contextLost = true;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.renderFallback();
    };

    this.onVisibility = () => {
      this.pageVisible = !document.hidden;
      if (this.pageVisible && this.visible && !this.raf) this.raf = requestAnimationFrame(this.loop);
      if (!this.pageVisible && this.raf) {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
      }
    };

    this.onReducedMotion = event => {
      this.reduceMotion = event.matches;
      if (this.reduceMotion) this.introProgress = 1;
      this.renderOnce();
    };

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);

    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting;
        if (this.visible && this.pageVisible && !this.raf) this.raf = requestAnimationFrame(this.loop);
        if (!this.visible && this.raf) {
          cancelAnimationFrame(this.raf);
          this.raf = 0;
        }
      },
      { threshold: 0 }
    );
    this.intersectionObserver.observe(this.container);

    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('webglcontextlost', this.onContextLost, false);
    document.addEventListener('visibilitychange', this.onVisibility);

    this.mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.mediaQuery?.addEventListener('change', this.onReducedMotion);
  }

  update(newProps) {
    Object.assign(this.props, newProps);
    this.rasterize();
  }

  destroy() {
    this.disposed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.canvas?.removeEventListener('pointermove', this.onPointerMove);
    this.canvas?.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas?.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas?.removeEventListener('webglcontextlost', this.onContextLost);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.mediaQuery?.removeEventListener('change', this.onReducedMotion);

    if (this.canvas && this.canvas.parentNode === this.container) {
      this.container.removeChild(this.canvas);
    }
  }
}

// Global Factory / Custom Element helper
window.WarpText = WarpTextInstance;
