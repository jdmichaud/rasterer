
function eventHandler(viewport, mousemove, mouseup) {
  // disable context menu
  viewport.oncontextmenu = (e) => e.preventDefault();
  // Mouse dragging
  let mousedown = undefined;
  viewport.addEventListener('mousedown', (event) => {
    mousedown = event
  });
  viewport.addEventListener('mouseup', () => {
    mousedown = undefined;
    mouseup();
  });
  viewport.addEventListener('mousemove', (event) => {
    if (mousedown !== undefined) {
      // We call mousemove only when the mouse has been clicked
      mousemove(event);
    }
  });
}

// Vertices should be arranged in clockwise order when facing the polygon
//    7     6
//  3     2
//
//    4     5
//  0     1
//
function buildCube(vertices) {
  return [
    [vertices[0], vertices[1], vertices[5]],
    [vertices[0], vertices[5], vertices[4]],

    [vertices[0], vertices[2], vertices[1]],
    [vertices[0], vertices[3], vertices[2]],

    [vertices[1], vertices[6], vertices[5]],
    [vertices[1], vertices[2], vertices[6]],

    [vertices[5], vertices[7], vertices[4]],
    [vertices[5], vertices[6], vertices[7]],

    [vertices[4], vertices[7], vertices[3]],
    [vertices[4], vertices[3], vertices[0]],

    [vertices[3], vertices[6], vertices[2]],
    [vertices[3], vertices[7], vertices[6]],
  ];
}

function createSubject(value) {
  const subject = new Observable.Subject(1);
  subject.next(value);
  return subject;
}

function main() {
  // Vertices we will use to build the cube
  let vertices = [
    [-50, 50, -50], [50, 50, -50], [50, -50, -50], [-50, -50, -50],
    [-50, 50,  50], [50, 50,  50], [50, -50,  50], [-50, -50,  50],
  ];

  const projections = ['orthographic', 'perspective'];
  let currentProjection = 1;
  const rotations = [
    '2D rotation (centered)',
    '2D rotation',
    '3D rotation',
  ];
  let currentRotation = 2;

  const canvas = document.getElementById('vp1')
    .getElementsByClassName('canvas')[0];
  const viewportModel = {
    eye: createSubject([0, 0, -500]),
    look: createSubject([0, 0, 0]),
    up: createSubject([0, 1, 0]),
    projection: createSubject(projections[currentProjection]),
    object: createSubject(buildCube(vertices)),
    rotation: createSubject(rotations[currentRotation]),
  };
  // Initialize rasterer
  rasterer(canvas, viewportModel);
  // Initialize overlay with the model
  const overlay = document.getElementById('vp1')
    .getElementsByClassName('overlay')[0];
  initOverlay(overlay, viewportModel);

  overlay
    .getElementsByClassName('projection')[0]
    .addEventListener('mousedown', () => {
      currentProjection = (currentProjection + 1) % projections.length;
      viewportModel.projection.next(projections[currentProjection]);
    });

  overlay
    .getElementsByClassName('rotation')[0]
    .addEventListener('mousedown', () => {
      currentRotation = (currentRotation + 1) % rotations.length;
      viewportModel.rotation.next(rotations[currentRotation]);
    });

  document.addEventListener('keypress', event => {
    switch (event.key) {
      case 'c':
        viewportModel.eye.next([0, 0, -500]);
        viewportModel.up.next([0, 1, 0]);
        viewportModel.look.next([0, 0, 0]);
        break;
      default:
    }
  });
}

window.onload = main;
