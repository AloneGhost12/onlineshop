'use client';

import { useEffect, useRef } from 'react';

export default function FluidBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', { antialias: false, alpha: true });
    if (!gl) {
      console.error('WebGL2 not supported');
      return;
    }

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Compile shader
    const compileShader = (source, type) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
      }
      return shader;
    };

    // Create program
    const createProgram = (vertexSource, fragmentSource) => {
      const program = gl.createProgram();
      gl.attachShader(program, compileShader(vertexSource, gl.VERTEX_SHADER));
      gl.attachShader(program, compileShader(fragmentSource, gl.FRAGMENT_SHADER));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
      }
      return program;
    };

    // Shaders
    const displayVertexShader = `#version 300 es
    precision highp float;
    in vec2 uv;
    out vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(uv, 0.0, 1.0);
    }`;

    const displayFragmentShader = `#version 300 es
    precision highp float;
    uniform sampler2D uTexture;
    uniform float uTime;
    in vec2 vUv;
    out vec4 outColor;
    void main() {
      vec3 color = texture(uTexture, vUv).rgb;
      outColor = vec4(color, 1.0);
    }`;

    const splatVertexShader = `#version 300 es
    precision highp float;
    in vec2 uv;
    out vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(uv, 0.0, 1.0);
    }`;

    const splatFragmentShader = `#version 300 es
    precision highp float;
    uniform sampler2D uTarget;
    uniform vec2 uPoint;
    uniform vec3 uColor;
    uniform float uRadius;
    in vec2 vUv;
    out vec4 outColor;
    void main() {
      float d = distance(vUv, uPoint);
      float falloff = exp(-d * d / (uRadius * uRadius));
      outColor = texture(uTarget, vUv) + vec4(uColor * falloff, 0.0);
    }`;

    const advectionVertexShader = `#version 300 es
    precision highp float;
    in vec2 uv;
    out vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(uv, 0.0, 1.0);
    }`;

    const advectionFragmentShader = `#version 300 es
    precision highp float;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 uTexelSize;
    uniform float uDissipation;
    uniform float uDt;
    in vec2 vUv;
    out vec4 outColor;
    void main() {
      vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uTexelSize;
      outColor = uDissipation * texture(uSource, coord);
    }`;

    const divergenceVertexShader = `#version 300 es
    precision highp float;
    in vec2 uv;
    out vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(uv, 0.0, 1.0);
    }`;

    const divergenceFragmentShader = `#version 300 es
    precision highp float;
    uniform sampler2D uVelocity;
    uniform vec2 uTexelSize;
    in vec2 vUv;
    out vec4 outColor;
    void main() {
      float x0 = texture(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
      float x1 = texture(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
      float y0 = texture(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
      float y1 = texture(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;
      float div = 0.5 * ((x1 - x0) + (y1 - y0));
      outColor = vec4(div, 0.0, 0.0, 1.0);
    }`;

    const pressureVertexShader = `#version 300 es
    precision highp float;
    in vec2 uv;
    out vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(uv, 0.0, 1.0);
    }`;

    const pressureFragmentShader = `#version 300 es
    precision highp float;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;
    uniform vec2 uTexelSize;
    in vec2 vUv;
    out vec4 outColor;
    void main() {
      float x0 = texture(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
      float x1 = texture(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
      float y0 = texture(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
      float y1 = texture(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
      float divergence = texture(uDivergence, vUv).x;
      float p = (x0 + x1 + y0 + y1 - divergence) * 0.25;
      outColor = vec4(p, 0.0, 0.0, 1.0);
    }`;

    const gradientVertexShader = `#version 300 es
    precision highp float;
    in vec2 uv;
    out vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(uv, 0.0, 1.0);
    }`;

    const gradientFragmentShader = `#version 300 es
    precision highp float;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;
    uniform vec2 uTexelSize;
    in vec2 vUv;
    out vec4 outColor;
    void main() {
      float x = (texture(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x - texture(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x) * 0.5;
      float y = (texture(uPressure, vUv + vec2(0.0, uTexelSize.y)).x - texture(uPressure, vUv - vec2(0.0, uTexelSize.y)).x) * 0.5;
      vec2 velocity = texture(uVelocity, vUv).xy - vec2(x, y);
      outColor = vec4(velocity, 0.0, 1.0);
    }`;

    // Create programs
    const displayProgram = createProgram(displayVertexShader, displayFragmentShader);
    const splatProgram = createProgram(splatVertexShader, splatFragmentShader);
    const advectionProgram = createProgram(advectionVertexShader, advectionFragmentShader);
    const divergenceProgram = createProgram(divergenceVertexShader, divergenceFragmentShader);
    const pressureProgram = createProgram(pressureVertexShader, pressureFragmentShader);
    const gradientProgram = createProgram(gradientVertexShader, gradientFragmentShader);

    // Create quad
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(displayProgram, 'uv');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Create textures
    const createTexture = () => {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, canvas.width, canvas.height, 0, gl.RGBA, gl.FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    };

    const velocity = createTexture();
    const divergence = createTexture();
    const pressure = createTexture();
    const pressure2 = createTexture();
    let color = createTexture();
    let color2 = createTexture();

    // Create framebuffers
    const createFB = (texture) => {
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      return fb;
    };

    const velocityFB = createFB(velocity);
    const divergenceFB = createFB(divergence);
    const pressureFB = createFB(pressure);
    const pressure2FB = createFB(pressure2);
    const colorFB = createFB(color);
    const color2FB = createFB(color2);

    // Mouse tracking
    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;
    let prevMouseX = mouseX;
    let prevMouseY = mouseY;

    const handleMouseMove = (e) => {
      prevMouseX = mouseX;
      prevMouseY = mouseY;
      mouseX = e.clientX;
      mouseY = canvas.height - e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    let time = 0;

    // Animation loop
    const animate = () => {
      time += 0.016;

      // Splat velocity
      gl.useProgram(splatProgram);
      gl.bindFramebuffer(gl.FRAMEBUFFER, velocityFB);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, velocity);
      gl.uniform1i(gl.getUniformLocation(splatProgram, 'uTarget'), 0);
      gl.uniform2f(gl.getUniformLocation(splatProgram, 'uPoint'), mouseX / canvas.width, mouseY / canvas.height);
      gl.uniform3f(gl.getUniformLocation(splatProgram, 'uColor'), (mouseX - prevMouseX) * 0.1, (mouseY - prevMouseY) * 0.1, 0.0);
      gl.uniform1f(gl.getUniformLocation(splatProgram, 'uRadius'), 0.1);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

      // Splat color
      const hue = (time * 30) % 360;
      const s = 100;
      const l = 50;
      const c = ((100 - Math.abs(2 * l - 100)) / 100) * (s / 100);
      const hPrime = hue / 60;
      const x = c * (1 - Math.abs((hPrime % 2) - 1));
      let r = 0, g = 0, b = 0;
      if (hPrime < 1) [r, g, b] = [c, x, 0];
      else if (hPrime < 2) [r, g, b] = [x, c, 0];
      else if (hPrime < 3) [r, g, b] = [0, c, x];
      else if (hPrime < 4) [r, g, b] = [0, x, c];
      else if (hPrime < 5) [r, g, b] = [x, 0, c];
      else [r, g, b] = [c, 0, x];
      const m = l / 100 - c / 2;

      gl.bindFramebuffer(gl.FRAMEBUFFER, colorFB);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, color);
      gl.uniform3f(gl.getUniformLocation(splatProgram, 'uColor'), r + m, g + m, b + m);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

      // Advect velocity
      gl.useProgram(advectionProgram);
      gl.bindFramebuffer(gl.FRAMEBUFFER, velocityFB);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, velocity);
      gl.uniform1i(gl.getUniformLocation(advectionProgram, 'uVelocity'), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, velocity);
      gl.uniform1i(gl.getUniformLocation(advectionProgram, 'uSource'), 1);
      gl.uniform2f(gl.getUniformLocation(advectionProgram, 'uTexelSize'), 1 / canvas.width, 1 / canvas.height);
      gl.uniform1f(gl.getUniformLocation(advectionProgram, 'uDissipation'), 0.99);
      gl.uniform1f(gl.getUniformLocation(advectionProgram, 'uDt'), 0.016);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

      // Advect color
      gl.bindFramebuffer(gl.FRAMEBUFFER, color2FB);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, velocity);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, color);
      gl.uniform1i(gl.getUniformLocation(advectionProgram, 'uSource'), 1);
      gl.uniform1f(gl.getUniformLocation(advectionProgram, 'uDissipation'), 0.98);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

      // Swap color textures
      const tempColor = color;
      color = color2;
      color2 = tempColor;

      // Display
      gl.useProgram(displayProgram);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, color);
      gl.uniform1i(gl.getUniformLocation(displayProgram, 'uTexture'), 0);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

      requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', setCanvasSize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
}
