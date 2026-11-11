import {
  Camera,
  CanvasTexture,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three';

export type AsciiPass = {
  render(scene: Scene, camera: Camera): void;
  resize(w: number, h: number): void;
  setCell(w: number, h: number): void;
};

const CHARS = ' .,:-=+*oxQ0#%&@';

function glyphAtlas(): CanvasTexture {
  const cw = 32, ch = 48;
  const c = document.createElement('canvas');
  c.width = cw * CHARS.length;
  c.height = ch;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#000';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#fff';
    g.font = 'bold 40px Menlo, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    [...CHARS].forEach((glyph, i) => g.fillText(glyph, i * cw + cw / 2, ch / 2 + 2));
  }
  const t = new CanvasTexture(c);
  t.minFilter = LinearFilter;
  return t;
}

const fragmentShader = /* glsl */ `
  uniform sampler2D tScene, tGlyph; uniform vec2 uRes, uCell; uniform float uCount;
  void main(){
    vec2 cell = floor(gl_FragCoord.xy / uCell);
    vec3 col = texture2D(tScene, (cell + 0.5) * uCell / uRes).rgb;
    float lum = dot(col, vec3(0.299,0.587,0.114));
    float idx = floor(clamp(pow(lum, 0.75) * 1.25, 0.0, 0.999) * uCount);
    vec2 local = fract(gl_FragCoord.xy / uCell);
    float g = texture2D(tGlyph, vec2((idx + local.x) / uCount, local.y)).r;
    vec3 tint = normalize(col + 1e-3) * 0.6 + 0.55;
    gl_FragColor = vec4(tint * g * (0.35 + lum * 1.6), 1.0);
  }`;

export function createAsciiPass(renderer: WebGLRenderer, dpr: number): AsciiPass {
  const rt = new WebGLRenderTarget(1, 1);
  const uniforms = {
    tScene: { value: rt.texture },
    tGlyph: { value: glyphAtlas() },
    uRes: { value: new Vector2(1, 1) },
    uCell: { value: new Vector2(7 * dpr, 11 * dpr) },
    uCount: { value: CHARS.length },
  };
  const mat = new ShaderMaterial({
    uniforms,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
    fragmentShader,
  });
  const quadScene = new Scene();
  const quadCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  quadScene.add(new Mesh(new PlaneGeometry(2, 2), mat));

  return {
    render(scene, camera) {
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(quadScene, quadCam);
    },
    resize(w, h) {
      rt.setSize(w, h);
      uniforms.uRes.value.set(w, h);
    },
    setCell(w, h) {
      uniforms.uCell.value.set(w, h);
    },
  };
}
