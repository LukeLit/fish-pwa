/**
 * WebGL Chroma Key Shader
 * 
 * High-performance GPU-based chroma key removal for video frames.
 * Uses the same Euclidean color distance algorithm as the CPU version,
 * but processes all pixels in parallel on the GPU.
 * 
 * ~10x faster than CPU-based processing for video frames.
 */

// Vertex shader - simple pass-through
const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

// Fragment shader - chroma key removal with edge feathering
const FRAGMENT_SHADER = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform vec3 u_chromaKey;    // Chroma key color (normalized 0-1)
  uniform float u_tolerance;   // Color distance tolerance (normalized)
  uniform float u_feather;     // Feather multiplier (typically 1.5)
  
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    
    // Calculate Euclidean distance from chroma key color
    float dist = distance(color.rgb, u_chromaKey);
    
    // Calculate alpha based on distance
    float alpha = 1.0;
    
    if (dist < u_tolerance) {
      // Within tolerance - fully transparent
      alpha = 0.0;
    } else if (dist < u_tolerance * u_feather) {
      // Feather zone - smooth transition
      alpha = (dist - u_tolerance) / (u_tolerance * (u_feather - 1.0));
    }
    
    // Output with modified alpha
    gl_FragColor = vec4(color.rgb, color.a * alpha);
  }
`;

/**
 * ChromaKeyProcessor - WebGL-based chroma key removal
 */
export class ChromaKeyProcessor {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private canvas: HTMLCanvasElement;
  private texture: WebGLTexture | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;

  // Uniform locations
  private chromaKeyLocation: WebGLUniformLocation | null = null;
  private toleranceLocation: WebGLUniformLocation | null = null;
  private featherLocation: WebGLUniformLocation | null = null;

  // Default chroma key color: magenta (#FF00FF)
  private chromaKey: [number, number, number] = [1.0, 0.0, 1.0];
  private tolerance: number = 0.2;  // Normalized (50/255 ≈ 0.2)
  private feather: number = 1.5;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.initWebGL();
  }

  private initWebGL(): boolean {
    const gl = this.canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });

    if (!gl) {
      console.error('[ChromaShader] WebGL not supported');
      return false;
    }

    this.gl = gl;

    // Create shaders
    const vertexShader = this.createShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) {
      return false;
    }

    // Create program
    const program = gl.createProgram();
    if (!program) {
      return false;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[ChromaShader] Program link error:', gl.getProgramInfoLog(program));
      return false;
    }

    this.program = program;

    // Get uniform locations
    this.chromaKeyLocation = gl.getUniformLocation(program, 'u_chromaKey');
    this.toleranceLocation = gl.getUniformLocation(program, 'u_tolerance');
    this.featherLocation = gl.getUniformLocation(program, 'u_feather');

    // Set up geometry (full-screen quad)
    this.setupGeometry();

    // Create texture
    this.texture = gl.createTexture();

    // Enable alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    return true;
  }

  private createShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl!;
    const shader = gl.createShader(type);

    if (!shader) {
      return null;
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('[ChromaShader] Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private setupGeometry(): void {
    const gl = this.gl!;
    const program = this.program!;

    // Position buffer (full-screen quad)
    const positions = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1,
    ]);

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Texture coordinate buffer
    const texCoords = new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      1, 0,
    ]);

    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
  }

  /**
   * Set chroma key color (defaults to magenta)
   * @param r Red (0-255)
   * @param g Green (0-255)
   * @param b Blue (0-255)
   */
  setChromaKey(r: number, g: number, b: number): void {
    this.chromaKey = [r / 255, g / 255, b / 255];
  }

  /**
   * Set tolerance (color distance threshold)
   * @param tolerance Value from 0-255 (converted to normalized internally)
   */
  setTolerance(tolerance: number): void {
    // Convert from 0-255 range to normalized distance
    // Max Euclidean distance in RGB space is sqrt(3) ≈ 1.73
    this.tolerance = (tolerance / 255) * Math.sqrt(3);
  }

  /**
   * Set feather multiplier for edge smoothing
   * @param feather Typically 1.2-2.0
   */
  setFeather(feather: number): void {
    this.feather = feather;
  }

  /**
   * Process a video frame or image with chroma key removal
   * 
   * @param source HTMLVideoElement, HTMLImageElement, or HTMLCanvasElement
   * @returns Processed canvas with transparency
   */
  process(source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
    if (!this.gl || !this.program || !this.texture) {
      // Fallback: return source as-is if WebGL not available
      console.warn('[ChromaShader] WebGL not initialized, returning source');
      if (source instanceof HTMLCanvasElement) {
        return source;
      }
      const canvas = document.createElement('canvas');
      canvas.width = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
      canvas.height = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(source, 0, 0);
      return canvas;
    }

    const gl = this.gl;
    const width = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
    const height = source instanceof HTMLVideoElement ? source.videoHeight : source.height;

    // Resize canvas if needed
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      gl.viewport(0, 0, width, height);
    }

    // Use program
    gl.useProgram(this.program);

    // Bind and update texture
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    // Set uniforms
    gl.uniform3fv(this.chromaKeyLocation, this.chromaKey);
    gl.uniform1f(this.toleranceLocation, this.tolerance);
    gl.uniform1f(this.featherLocation, this.feather);

    // Clear and draw
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    return this.canvas;
  }

  /**
   * Process and return result as a new canvas (for caching)
   */
  processToCanvas(source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
    const processed = this.process(source);

    // Copy to new canvas
    const result = document.createElement('canvas');
    result.width = processed.width;
    result.height = processed.height;
    const ctx = result.getContext('2d');
    ctx?.drawImage(processed, 0, 0);

    return result;
  }

  /**
   * Clean up WebGL resources
   */
  dispose(): void {
    if (this.gl) {
      if (this.texture) this.gl.deleteTexture(this.texture);
      if (this.positionBuffer) this.gl.deleteBuffer(this.positionBuffer);
      if (this.texCoordBuffer) this.gl.deleteBuffer(this.texCoordBuffer);
      if (this.program) this.gl.deleteProgram(this.program);
    }
    this.gl = null;
    this.program = null;
    this.texture = null;
  }
}

// Singleton instance for shared use
let sharedProcessor: ChromaKeyProcessor | null = null;

/**
 * Get shared ChromaKeyProcessor instance
 */
export function getChromaKeyProcessor(): ChromaKeyProcessor {
  if (!sharedProcessor) {
    sharedProcessor = new ChromaKeyProcessor();
  }
  return sharedProcessor;
}

/**
 * Process a single frame with chroma key removal (convenience function)
 */
export function processWithChromaKey(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  tolerance: number = 50
): HTMLCanvasElement {
  const processor = getChromaKeyProcessor();
  processor.setTolerance(tolerance);
  return processor.processToCanvas(source);
}
