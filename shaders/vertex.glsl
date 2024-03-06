// attribute mat4 instanceMatrix;
varying vec2 vUv;
varying vec3 vPosition;
uniform float uOpacity;

void main() {
    vUv = uv;

    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

}