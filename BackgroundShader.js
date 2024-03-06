import * as THREE from "three";
// import * as THREE from "./js/three.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { DotScreenShader } from "./customShaders/DotScreenShader.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";

const fragment = `uniform float time;
varying vec3 vPosition;
uniform float uOpacity;

vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 perm(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
}

float noise(vec3 p) {
    vec3 a = floor(p);
    vec3 d = p - a;
    d = d * d * (3.0 - 2.0 * d);

    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
    vec4 k1 = perm(b.xyxy);
    vec4 k2 = perm(k1.xyxy + b.zzww);

    vec4 c = k2 + a.zzzz;
    vec4 k3 = perm(c);
    vec4 k4 = perm(c + 1.0);

    vec4 o1 = fract(k3 * (1.0 / 41.0));
    vec4 o2 = fract(k4 * (1.0 / 41.0));

    vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
    vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

    return o4.y * d.y + o4.x * (1.0 - d.y);
}

float lines(vec2 uv, float offset) {
    return smoothstep(0., 0.45 + offset * 0.5, abs(0.5 * (sin(uv.x * 30.) + offset * 2.)));
}

mat2 rotate2D(float angle) {
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

void main() {
    float n = noise(vPosition + time);
    vec2 baseUV = rotate2D(n + 0.1) * vPosition.xy * 0.1;
    float basePattern = lines(baseUV, 0.5);
    float secondPattern = lines(baseUV, 0.1);
    float thirdPattern = lines(baseUV, 0.4);

    vec3 baseFirst = vec3(255. / 255., 77. / 255., 90. / 255.);
    // vec3(129. / 255., 100. / 255., 234. / 255.);
    vec3 baseSecond = vec3(7. / 255., 33. / 255., 65. / 255.);
    vec3 baseThird = vec3(71. / 255., 85. / 255., 119. / 255.);
    // vec3 accent = vec3(88. / 255., 102. / 255., 144. / 255.);
    vec3 accent = vec3(0., 0., 0.);

    // vec3 baseColor = mix(baseFirst, baseSecond, basePattern);
    // vec3 secondBaseColor = mix(baseColor, accent, secondPattern);

    vec3 baseColor = mix(baseFirst, baseThird, basePattern);
    vec3 secondBaseColor = mix(baseColor, baseSecond, thirdPattern);
    vec3 thirdBaseColor = mix(secondBaseColor, accent, secondPattern);

    vec3 finalColor = vec3(thirdBaseColor) * uOpacity;

    gl_FragColor = vec4(vec3(finalColor), uOpacity);
    // gl_FragColor = vec4(vec3(thirdBaseColor), 1.);
}`;

const fragmentBubble = `uniform float time;
uniform float progress;
uniform sampler2D texture1;
uniform vec4 resolution;
varying vec2 vUv;
varying vec3 vPosition;
uniform float uOpacity;

uniform samplerCube tCube;
varying vec3 vReflect;
varying vec3 vRefract[3];
varying float vReflectionFactor;

void main() {

    vec4 reflectedColor = textureCube(tCube, vec3(vReflect.x, vReflect.yz));
    vec4 refractedColor = vec4(1.0);
    refractedColor.r = textureCube(tCube, vec3(vRefract[0].x, vRefract[0].yz)).r;
    refractedColor.g = textureCube(tCube, vec3(vRefract[1].x, vRefract[1].yz)).g;
    refractedColor.b = textureCube(tCube, vec3(vRefract[2].x, vRefract[2].yz)).b;

    vec4 finalColor = mix(refractedColor, reflectedColor, clamp(vReflectionFactor, 0.0, 1.0));
    finalColor.a *= uOpacity;
    gl_FragColor = finalColor;
    // gl_FragColor = mix(refractedColor, reflectedColor, clamp(vReflectionFactor, 0.0, 1.0));

}`;
const vertex = `
varying vec2 vUv;
varying vec3 vPosition;
uniform float uOpacity;

void main() {
    vUv = uv;

    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

}`;

const vertexBubble = `uniform float mRefractionRatio;
uniform float mFresnelBias;
uniform float mFresnelScale;
uniform float mFresnelPower;
varying vec3 vReflect;
varying vec3 vRefract[3];
varying float vReflectionFactor;
uniform float uOpacity;

void main() {

    float mRefractionRatio = 1.12;
    float mFresnelBias = 0.1;
    float mFresnelScale = 4.;
    float mFresnelPower = 2.;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vec3 worldNormal = normalize(mat3(modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz) * normal);
    vec3 I = worldPosition.xyz - cameraPosition;
    vReflect = reflect(I, worldNormal);
    vRefract[0] = refract(normalize(I), worldNormal, mRefractionRatio);
    vRefract[1] = refract(normalize(I), worldNormal, mRefractionRatio * 0.99);
    vRefract[2] = refract(normalize(I), worldNormal, mRefractionRatio * 0.98);
    vReflectionFactor = mFresnelBias + mFresnelScale * pow(1.0 + dot(normalize(I), worldNormal), mFresnelPower);

    // vOpacity = uOpacity;

    gl_Position = projectionMatrix * mvPosition;
}`;

const material = new THREE.ShaderMaterial({
  extensions: {
    derivatives: true,
  },
  fragmentShader: fragment,
  vertexShader: vertex,
  uniforms: {
    time: { value: 0 },
    resolution: {
      value: new THREE.Vector4(window.innerWidth, window.innerHeight, 1),
    },
    uOpacity: { value: 1 },
  },
  side: THREE.BackSide,
});

const geometrySmall = new THREE.SphereGeometry(0.4, 64, 64);
geometrySmall.translate(0.45, 0, 0);

const materialSmall = new THREE.ShaderMaterial({
  extensions: {
    derivatives: true,
  },
  fragmentShader: fragmentBubble,
  vertexShader: vertexBubble,
  uniforms: {
    time: { value: 0 },
    tCube: { value: 0 },
    resolution: {
      value: new THREE.Vector4(window.innerWidth, window.innerHeight, 1),
    },
    uOpacity: { value: 1.0 },
  },
  side: THREE.FrontSide,
  opacity: 0,
  transparent: true,
});

const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
  format: THREE.RGBAFormat,
  generateMipmaps: true,
  minFilter: THREE.LinearMipMapLinearFilter,
});

const cubeCamera = new THREE.CubeCamera(0.1, 10, cubeRenderTarget);

const effect1 = new ShaderPass(DotScreenShader);
const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);
renderer.setSize(window.innerWidth, window.innerHeight);

const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);

const smallSphere = new THREE.Mesh(geometrySmall, materialSmall);

function initPost() {
  composer.addPass(new RenderPass(scene, camera));

  effect1.uniforms["scale"].value = 4;
  composer.addPass(effect1);
}

function animation() {
  material.uniforms.time.value += 0.01;

  // mesh.rotation.x = time / 2000;

  smallSphere.visible = false;

  cubeCamera.update(renderer, scene);
  smallSphere.visible = true;
  materialSmall.uniforms.tCube.value = cubeRenderTarget.texture;
  // renderer.render(scene, camera);
  composer.render();
}

const scene = new THREE.Scene();

const currentMount = document.getElementById("container3D");

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.001, 1000);

camera.position.set(0.06, 0, 0.7);

const geometry = new THREE.SphereGeometry(1.5, 32, 32);

const mesh = new THREE.Mesh(geometry, material);

scene.add(mesh);
scene.add(smallSphere);

renderer.setAnimationLoop(animation);

initPost();

document.getElementById("container3D").appendChild(renderer.domElement);
