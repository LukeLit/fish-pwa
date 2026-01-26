/**
 * GLSL shader effects for surreal visuals
 * These can be used with p5.js WEBGL mode
 */

export const KuwaharaShader = `
#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D texture;
uniform vec2 resolution;
uniform float radius;

varying vec2 vTexCoord;

void main() {
  vec2 uv = vTexCoord;
  vec2 pixelSize = 1.0 / resolution;
  
  vec4 color = vec4(0.0);
  float total = 0.0;
  
  for (float x = -radius; x <= radius; x += 1.0) {
    for (float y = -radius; y <= radius; y += 1.0) {
      vec2 offset = vec2(x, y) * pixelSize;
      color += texture2D(texture, uv + offset);
      total += 1.0;
    }
  }
  
  gl_FragColor = color / total;
}
`;

export const GlowShader = `
#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D texture;
uniform vec2 resolution;
uniform float intensity;

varying vec2 vTexCoord;

void main() {
  vec2 uv = vTexCoord;
  vec2 pixelSize = 1.0 / resolution;
  
  vec4 color = texture2D(texture, uv);
  vec4 glow = vec4(0.0);
  
  for (float x = -2.0; x <= 2.0; x += 1.0) {
    for (float y = -2.0; y <= 2.0; y += 1.0) {
      vec2 offset = vec2(x, y) * pixelSize;
      glow += texture2D(texture, uv + offset) * intensity;
    }
  }
  
  gl_FragColor = color + glow * 0.1;
}
`;
