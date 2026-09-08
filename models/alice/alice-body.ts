import { deformBodyPoint, IDLE_RIG, type BodyPainter, type RigDefinition, type RigFrame, type RigImages } from './alice-rig';

type Mesh = { id: 'body' | 'backing'; source: Float32Array; vertices: Float32Array; indices: Uint16Array };
function makeMesh(id: Mesh['id'], definition: RigDefinition): Mesh {
  const layer = definition.layers[id];
  const start = layer.y;
  const end = Math.min(layer.y + layer.height, definition.rig.bodyFixedFrom);
  const steps = Math.max(1, Math.ceil((end - start) / (id === 'body' ? 65 : 95)));
  const rows = Array.from({ length: steps + 1 }, (_, i) => start + (end - start) * i / steps);
  if (id === 'body' && rows.at(-1)! < definition.height) rows.push(definition.height);
  const columns = id === 'body' ? 26 : 16;
  const source: number[] = [], indices: number[] = [];
  rows.forEach((y, row) => {
    for (let col = 0; col <= columns; col++) {
      const x = layer.x + layer.width * col / columns;
      source.push(x, y, col / columns, (y - layer.y) / layer.height);
      if (row && col) {
        const d = row * (columns + 1) + col, c = d - 1, b = d - columns - 1, a = b - 1;
        indices.push(a, b, c, b, d, c);
      }
    }
  });
  return { id, source: new Float32Array(source), vertices: new Float32Array(source), indices: new Uint16Array(indices) };
}
const makeMeshes = (definition: RigDefinition) => [makeMesh('backing', definition), makeMesh('body', definition)];
function updateMesh(mesh: Mesh, frame: RigFrame) {
  for (let i = 0; i < mesh.source.length; i += 4) {
    const p = deformBodyPoint(mesh.source[i], mesh.source[i + 1], frame);
    mesh.vertices[i] = p.x; mesh.vertices[i + 1] = p.y;
  }
}

/** Also used by the offline renderer and on devices without WebGL. */
export function createCanvasBodyPainter(definition: RigDefinition = IDLE_RIG): BodyPainter {
  const meshes = makeMeshes(definition);
  return (ctx, images, frame) => {
    const m = ctx.getTransform(), overlap = 1 / Math.hypot(m.a, m.b);
    for (const mesh of meshes) {
      updateMesh(mesh, frame);
      const src = mesh.source, dst = mesh.vertices, image = images[mesh.id] as CanvasImageSource & { width: number; height: number };
      const layer = definition.layers[mesh.id], rx = image.width / layer.width, ry = image.height / layer.height;
      for (let t = 0; t < mesh.indices.length; t += 3) {
        const i = mesh.indices[t] * 4, j = mesh.indices[t + 1] * 4, k = mesh.indices[t + 2] * 4;
        const sx = src[j] - src[i], sy = src[j + 1] - src[i + 1], tx = src[k] - src[i], ty = src[k + 1] - src[i + 1];
        const ux = dst[j] - dst[i], uy = dst[j + 1] - dst[i + 1], vx = dst[k] - dst[i], vy = dst[k + 1] - dst[i + 1];
        const det = sx * ty - sy * tx;
        const a = (ux * ty - vx * sy) / det, b = (uy * ty - vy * sy) / det;
        const c = (vx * sx - ux * tx) / det, d = (vy * sx - uy * tx) / det;
        ctx.save(); ctx.beginPath();
        const triangle = [i, j, k];
        triangle.forEach((v, n) => {
          const prev = triangle[(n + 2) % 3], next = triangle[(n + 1) % 3];
          const ax = dst[v] - dst[prev], ay = dst[v + 1] - dst[prev + 1], al = Math.hypot(ax, ay);
          const bx = dst[next] - dst[v], by = dst[next + 1] - dst[v + 1], bl = Math.hypot(bx, by);
          // Offset the edges by one device pixel, including long thin leg
          // triangles, whose corners would barely expand with radial padding.
          const nx = ay / al + by / bl, ny = -ax / al - bx / bl;
          const padding = overlap / (1 + (ax * bx + ay * by) / (al * bl));
          const x = dst[v] + nx * padding, y = dst[v + 1] + ny * padding;
          if (!n) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.closePath(); ctx.clip();
        ctx.transform(a, b, c, d, dst[i] - a * src[i] - c * src[i + 1], dst[i + 1] - b * src[i] - d * src[i + 1]);
        const x0 = Math.max(layer.x, Math.min(src[i], src[j], src[k]) - overlap * 3);
        const y0 = Math.max(layer.y, Math.min(src[i + 1], src[j + 1], src[k + 1]) - overlap * 3);
        const w = Math.min(layer.x + layer.width, Math.max(src[i], src[j], src[k]) + overlap * 3) - x0;
        const h = Math.min(layer.y + layer.height, Math.max(src[i + 1], src[j + 1], src[k + 1]) + overlap * 3) - y0;
        ctx.drawImage(image, (x0 - layer.x) * rx, (y0 - layer.y) * ry, w * rx, h * ry, x0, y0, w, h);
        ctx.restore();
      }
    }
  };
}

/** Shared mesh vertices avoid the cracks of separately moving cutout hands.
 * GPU triangles keep this inexpensive at retina resolution; the same skinning
 * function is used by the CPU fallback and attachment regression checks. */
export function createBodyRenderer(images: RigImages, definition: RigDefinition = IDLE_RIG) {
  const surface = document.createElement('canvas');
  const gl = surface.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true, depth: false, stencil: false });
  const fallback = createCanvasBodyPainter(definition);
  if (!gl) return { paint: fallback, dispose() {} };
  const shaders: WebGLShader[] = [], textures: WebGLTexture[] = [], buffers: WebGLBuffer[] = [];
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!; shaders.push(shader);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Body shader did not compile');
    return shader;
  };
  const program = gl.createProgram()!;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    textures.forEach(t => gl.deleteTexture(t)); buffers.forEach(b => gl.deleteBuffer(b));
    shaders.forEach(s => gl.deleteShader(s)); gl.deleteProgram(program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
  try {
    gl.attachShader(program, compile(gl.VERTEX_SHADER, `
      attribute vec2 position; attribute vec2 uv; uniform mat3 camera; uniform vec2 viewport; varying vec2 texCoord;
      void main() { vec3 p = camera * vec3(position, 1.0); gl_Position = vec4(p.x / viewport.x * 2.0 - 1.0, 1.0 - p.y / viewport.y * 2.0, 0.0, 1.0); texCoord = uv; }
    `));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `
      precision mediump float; uniform sampler2D artwork; varying vec2 texCoord;
      void main() { gl_FragColor = texture2D(artwork, texCoord); }
    `));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Body shader did not link');
    const position = gl.getAttribLocation(program, 'position'), uv = gl.getAttribLocation(program, 'uv');
    const camera = gl.getUniformLocation(program, 'camera'), viewport = gl.getUniformLocation(program, 'viewport');
    const meshes = makeMeshes(definition).map(mesh => {
      const vertex = gl.createBuffer()!, index = gl.createBuffer()!, texture = gl.createTexture()!;
      buffers.push(vertex, index); textures.push(texture);
      gl.bindBuffer(gl.ARRAY_BUFFER, vertex); gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const image = images[mesh.id] as HTMLImageElement;
      if (Math.max(image.width, image.height) > gl.getParameter(gl.MAX_TEXTURE_SIZE)) throw new Error('Body texture exceeds device limit');
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[mesh.id] as TexImageSource);
      return { ...mesh, vertex, index, texture };
    });
    gl.useProgram(program); gl.uniform1i(gl.getUniformLocation(program, 'artwork'), 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const paint: BodyPainter = (ctx, currentImages, frame) => {
      if (gl.isContextLost()) { fallback(ctx, currentImages, frame); return; }
      if (surface.width !== ctx.canvas.width || surface.height !== ctx.canvas.height) {
        surface.width = ctx.canvas.width; surface.height = ctx.canvas.height;
      }
      gl.viewport(0, 0, surface.width, surface.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      const m = ctx.getTransform();
      gl.uniform2f(viewport, surface.width, surface.height);
      gl.uniformMatrix3fv(camera, false, [m.a, m.b, 0, m.c, m.d, 0, m.e, m.f, 1]);
      for (const mesh of meshes) {
        updateMesh(mesh, frame);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertex); gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.vertices);
        gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(uv); gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.index); gl.bindTexture(gl.TEXTURE_2D, mesh.texture);
        gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
      }
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(surface, 0, 0); ctx.restore();
    };
    return { paint, dispose: release };
  } catch { release(); return { paint: fallback, dispose() {} }; }
}
