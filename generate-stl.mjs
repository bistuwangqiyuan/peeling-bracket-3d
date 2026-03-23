import * as THREE from 'three';
import { writeFileSync } from 'fs';

const P = 0.03, L = 0.6, W = 0.12, H = 0.30;
const BL = 0.50, beamThick = 0.010;
const WH = 0.062;
const actSpacing = 0.18;

const root = new THREE.Group();

function box(parent, w, h, d, x, y, z, rx, ry, rz) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    parent.add(m);
    return m;
}

function cyl(parent, r, h, x, y, z, rx, ry, rz) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16));
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    parent.add(m);
    return m;
}

function profile3030(len, axis, x, y, z) {
    const dims = [P, P, P];
    const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    dims[idx] = len;
    box(root, ...dims, x, y, z);
}

/* Base Frame */
profile3030(L, 'x', 0, P/2, -W/2 + P/2);
profile3030(L, 'x', 0, P/2, W/2 - P/2);
profile3030(W - 2*P, 'z', -L/2 + P/2, P/2, 0);
profile3030(W - 2*P, 'z', L/2 - P/2, P/2, 0);
profile3030(W - 2*P, 'z', -actSpacing - 0.025, P/2, 0);
profile3030(W - 2*P, 'z', -actSpacing + 0.025, P/2, 0);
profile3030(W - 2*P, 'z', actSpacing - 0.025, P/2, 0);
profile3030(W - 2*P, 'z', actSpacing + 0.025, P/2, 0);

/* Vertical Posts */
const vLen = H - P;
[[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx, sz]) => {
    profile3030(vLen, 'y', sx*(L/2-P/2), P + vLen/2, sz*(W/2-P/2));
});

/* Top Frame */
const topY = H + P/2;
profile3030(L, 'x', 0, topY, -W/2 + P/2);
profile3030(L, 'x', 0, topY, W/2 - P/2);
profile3030(W - 2*P, 'z', -L/2 + P/2, topY, 0);
profile3030(W - 2*P, 'z', L/2 - P/2, topY, 0);

/* Corner Brackets */
[[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sz]) => {
    [P, H].forEach(py => {
        box(root, 0.020, 0.020, 0.003, sx*(L/2-P/2), py, sz*(W/2-P/2));
        box(root, 0.003, 0.020, 0.020, sx*(L/2-P/2) + sx*0.0085, py, sz*(W/2-P/2));
    });
});

/* Actuators (simplified) */
function makeActuator(xPos) {
    const g = new THREE.Group();
    box(g, 0.06, 0.007, 0.08, 0, 0.0035, 0.0175);
    box(g, 0.048, 0.032, 0.067, 0, 0.023, 0.0135);
    cyl(g, 0.018, 0.077, 0, 0.023, 0.0135, Math.PI/2);
    box(g, 0.042, 0.014, 0.062, 0, 0.046, 0.0054);
    box(g, 0.036, 0.13, 0.036, 0, 0.053 + 0.065, 0);
    box(g, 0.038, 0.010, 0.038, 0, 0.058, 0);
    box(g, 0.038, 0.010, 0.038, 0, 0.178, 0);
    cyl(g, 0.006, 0.07, 0, 0.183 + 0.035, 0);
    cyl(g, 0.010, 0.012, 0, 0.30, 0);
    g.position.set(xPos, P, 0);
    root.add(g);
}
makeActuator(-actSpacing);
makeActuator(actSpacing);

/* Top Beam (simplified as a box with holes approximated) */
const beamY = H + P + beamThick / 2;
box(root, BL, beamThick, P, 0, beamY, 0);

/* Peeling Line Assemblies */
const peelSpacing = 0.12;
const peelTopY = beamY - beamThick / 2;

[-1, 1].forEach(sign => {
    const x = sign * peelSpacing;
    const clampCy = peelTopY - 0.24;
    const sensorCy = clampCy + 0.022;

    cyl(root, 0.0018, peelTopY - sensorCy - 0.013, x, (peelTopY + sensorCy + 0.013)/2, 0);

    const s = new THREE.Mesh(new THREE.SphereGeometry(0.015, 16, 12));
    s.position.set(x, sensorCy, 0);
    s.scale.set(1, 0.5, 0.7);
    root.add(s);

    box(root, 0.020, 0.008, 0.014, x, clampCy, 0);
    box(root, 0.004, 0.016, 0.014, x - 0.009, clampCy - 0.004, 0);
    box(root, 0.004, 0.016, 0.014, x + 0.009, clampCy - 0.004, 0);

    cyl(root, 0.01, 0.008, x, clampCy, 0.014, Math.PI/2);

    const tapeTopY2 = clampCy - 0.018;
    box(root, 0.02, 0.15, 0.001, x, tapeTopY2 - 0.075, 0);
});

/* Support Wheels */
function makeWheel(px, pz) {
    const g = new THREE.Group();
    const wheelR = 0.018, wheelCY = -(WH - wheelR);
    box(g, 0.032, 0.005, 0.032, 0, -0.0025, 0);
    box(g, 0.022, 0.020, 0.010, 0, -0.015, 0);
    box(g, 0.004, 0.030, 0.010, -0.011, -0.020, 0);
    box(g, 0.004, 0.030, 0.010, 0.011, -0.020, 0);
    cyl(g, wheelR, 0.014, 0, wheelCY, 0, 0, 0, Math.PI/2);
    cyl(g, wheelR * 0.4, 0.016, 0, wheelCY, 0, 0, 0, Math.PI/2);
    cyl(g, 0.003, 0.028, 0, wheelCY, 0, 0, 0, Math.PI/2);
    g.position.set(px, 0, pz);
    root.add(g);
}
[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz]) => {
    makeWheel(sx*(L/2-P/2), sz*(W/2-P/2));
});

/* Merge all geometries into a single buffer for STL export */
root.updateMatrixWorld(true);

const geometries = [];
root.traverse(child => {
    if (child.isMesh && child.geometry) {
        const g = child.geometry.clone();
        g.applyMatrix4(child.matrixWorld);
        geometries.push(g);
    }
});

const merged = new THREE.BufferGeometry();
const posArrays = [];
const normArrays = [];
let totalVerts = 0;

geometries.forEach(g => {
    const nonIndexed = g.index ? g.toNonIndexed() : g;
    const pos = nonIndexed.getAttribute('position');
    const norm = nonIndexed.getAttribute('normal');
    if (pos) { posArrays.push(pos.array); totalVerts += pos.count; }
    if (norm) { normArrays.push(norm.array); }
});

const positions = new Float32Array(totalVerts * 3);
const normals = new Float32Array(totalVerts * 3);
let offset = 0;
posArrays.forEach((arr, i) => {
    positions.set(arr, offset);
    if (normArrays[i]) normals.set(normArrays[i], offset);
    offset += arr.length;
});

merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

const numTriangles = totalVerts / 3;
const headerSize = 80;
const countSize = 4;
const triangleSize = 50;
const bufferSize = headerSize + countSize + numTriangles * triangleSize;
const buffer = Buffer.alloc(bufferSize);

buffer.fill(0, 0, 80);
Buffer.from('Peeling Bracket STL - Generated').copy(buffer, 0);
buffer.writeUInt32LE(numTriangles, 80);

let off2 = 84;
const posArr = merged.getAttribute('position').array;
const normArr = merged.getAttribute('normal').array;

for (let i = 0; i < numTriangles; i++) {
    const i9 = i * 9;
    const nx = (normArr[i9] + normArr[i9+3] + normArr[i9+6]) / 3;
    const ny = (normArr[i9+1] + normArr[i9+4] + normArr[i9+7]) / 3;
    const nz = (normArr[i9+2] + normArr[i9+5] + normArr[i9+8]) / 3;

    buffer.writeFloatLE(nx, off2); off2 += 4;
    buffer.writeFloatLE(ny, off2); off2 += 4;
    buffer.writeFloatLE(nz, off2); off2 += 4;

    for (let v = 0; v < 3; v++) {
        buffer.writeFloatLE(posArr[i9 + v*3] * 1000, off2); off2 += 4;
        buffer.writeFloatLE(posArr[i9 + v*3 + 1] * 1000, off2); off2 += 4;
        buffer.writeFloatLE(posArr[i9 + v*3 + 2] * 1000, off2); off2 += 4;
    }

    buffer.writeUInt16LE(0, off2); off2 += 2;
}

writeFileSync('peeling-bracket.stl', buffer);
console.log(`STL generated: peeling-bracket.stl (${numTriangles} triangles, ${buffer.length} bytes)`);
