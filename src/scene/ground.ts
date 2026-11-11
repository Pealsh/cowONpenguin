import {
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Fog,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector3,
} from 'three';
import { PATH_LENGTH } from '../scroll/path';
import type { BiomeLook } from './biomes';

export type Ground = { applyLook(look: BiomeLook): void; update(time: number, playerX: number): void };

const FIELD = 70;
const SEG = 4;
const FOG_NEAR = 18;
const FOG_FAR = 45;

const vertexShader = /* glsl */ `
  attribute vec3 offset; attribute vec3 params;
  uniform float uTime; uniform vec3 uPlayer; uniform float uPlayerX; uniform float uDensity;
  varying float vH; varying float vR; varying float vDepth;
  void main(){
    if (params.z >= uDensity) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    // 70 幅のパッチを x 方向にプレイヤー周りへ巻き戻して無限に見せる
    float fx = mod(offset.x - uPlayerX + 35.0, 70.0) - 35.0 + uPlayerX;
    vec3 o = vec3(fx, offset.y, offset.z);
    float h = position.y;
    vec3 p = position; p.y *= params.x;
    float c = cos(params.y), s = sin(params.y);
    p.xz = vec2(c*p.x - s*p.z, s*p.x + c*p.z);
    // 櫛でとかしたような流れ（場所で向きが変わる）
    float flowA = sin(o.x*0.08)*1.6 + cos(o.z*0.07)*1.6;
    vec2 bend = vec2(cos(flowA), sin(flowA)) * 0.9;
    // 風
    float wind = sin(uTime*1.2 + o.x*0.12 + o.z*0.09)*0.5 + sin(uTime*2.9 + o.x*0.5)*0.15;
    bend += vec2(wind, wind*0.4);
    // プレイヤーが草をかき分ける
    vec2 d = o.xz - uPlayer.xz; float dl = length(d);
    float push = smoothstep(2.4, 0.2, dl);
    bend = mix(bend, normalize(d + 1e-4) * 2.2, push);
    float k = h*h*params.x;
    vec3 w = o + p;
    w.xz += bend * k;
    w.y -= length(bend) * k * 0.35;
    vH = h; vR = params.z;
    vec4 mv = viewMatrix * vec4(w,1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;

const fragmentShader = /* glsl */ `
  uniform vec3 fogColor; uniform float fogNear, fogFar;
  uniform vec3 uBase, uTip;
  varying float vH; varying float vR; varying float vDepth;
  void main(){
    vec3 base = uBase, tip = uTip * (0.6 + vR*1.0);
    vec3 col = mix(base, tip, pow(vH, 1.4));
    col = mix(col, fogColor, smoothstep(fogNear, fogFar, vDepth));
    gl_FragColor = vec4(col,1.0);
  }`;

function bladeGeometry(blades: number): InstancedBufferGeometry {
  const geo = new InstancedBufferGeometry();
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= SEG; i++) {
    const h = i / SEG, w = 0.08 * (1 - h * 0.85);
    pos.push(-w, h, 0, w, h, 0);
  }
  for (let i = 0; i < SEG; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const off = new Float32Array(blades * 3), prm = new Float32Array(blades * 3);
  for (let i = 0; i < blades; i++) {
    off[i * 3] = (Math.random() - 0.5) * FIELD;
    off[i * 3 + 2] = (Math.random() - 0.5) * FIELD;
    prm[i * 3] = 0.45 + Math.random() * 0.55; // 長さ
    prm[i * 3 + 1] = Math.random() * Math.PI * 2; // 向き
    prm[i * 3 + 2] = Math.random(); // 明るさのばらつき（密度の閾値にも使う）
  }
  geo.setAttribute('offset', new InstancedBufferAttribute(off, 3));
  geo.setAttribute('params', new InstancedBufferAttribute(prm, 3));
  geo.instanceCount = blades;
  return geo;
}

export function createGround(scene: Scene, blades: number): Ground {
  if (!(scene.fog instanceof Fog)) scene.fog = new Fog(0x020302, FOG_NEAR, FOG_FAR);
  const fog = scene.fog;
  fog.near = FOG_NEAR;
  fog.far = FOG_FAR;

  const groundMat = new MeshLambertMaterial({ color: 0x1a2a1a });
  const plane = new Mesh(new PlaneGeometry(PATH_LENGTH + 200, 200), groundMat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.x = PATH_LENGTH / 2;
  scene.add(plane);

  const uniforms = {
    uTime: { value: 0 },
    uPlayer: { value: new Vector3() },
    uPlayerX: { value: 0 },
    uDensity: { value: 1 },
    uBase: { value: new Color() },
    uTip: { value: new Color() },
    fogColor: { value: fog.color },
    fogNear: { value: fog.near },
    fogFar: { value: fog.far },
  };
  const grassMat = new ShaderMaterial({ side: DoubleSide, uniforms, vertexShader, fragmentShader });
  const grass = new Mesh(bladeGeometry(blades), grassMat);
  grass.frustumCulled = false;
  scene.add(grass);

  return {
    applyLook(look) {
      groundMat.color.copy(look.ground);
      // legacy のシェーダは sRGB の値をそのまま書いていたので、作業色空間（linear）から戻して渡す
      uniforms.uBase.value.copy(look.grassBase).convertLinearToSRGB();
      uniforms.uTip.value.copy(look.grassTip).convertLinearToSRGB();
      uniforms.uDensity.value = look.grassDensity;
      fog.color.copy(look.fog);
      if (scene.background instanceof Color) scene.background.copy(look.sky);
      else scene.background = look.sky.clone();
    },
    update(time, playerX) {
      uniforms.uTime.value = time;
      uniforms.uPlayerX.value = playerX;
      uniforms.uPlayer.value.set(playerX, 0, 0);
    },
  };
}
