
function eventHandler(viewport, mousemove, mouseup) {
  // disable context menu
  viewport.oncontextmenu = (e) => e.preventDefault();
  // Mouse dragging
  let mousedown = undefined;
  viewport.addEventListener('mousedown', (event) => mousedown = event);
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

function buildCube(vertices) {
  return [
    [vertices[0], vertices[1]],
    [vertices[1], vertices[2]],
    [vertices[2], vertices[3]],
    [vertices[3], vertices[0]],

    [vertices[4], vertices[5]],
    [vertices[5], vertices[6]],
    [vertices[6], vertices[7]],
    [vertices[7], vertices[4]],

    [vertices[0], vertices[4]],
    [vertices[1], vertices[5]],
    [vertices[2], vertices[6]],
    [vertices[3], vertices[7]],
  ];
}

function main() {
  // Vertices we will use to build the cube
  let vertices = [
    [-50, -50, -50], [50, -50, -50], [50, 50, -50], [-50, 50, -50],
    [-50, -50,  50], [50, -50,  50], [50, 50,  50], [-50, 50,  50],
  ];

  const viewport = document.getElementById('viewport');
  // The camera parameters
  // eye is where the camera is
  // look is where the camera look
  // up is the vector that point where the up is for the camera
  let eye = [0, 0, -100];
  let look = [0, 0, 0];
  let up = [0, 1, 0];
  // Additional parameters
  let projections = {
    observable: new Observable.Subject(1),
    orthographic: orthographicProjection,
  };
  projections.observable.subscribe((p) => projections.current = p);
  projections.observable.next('orthographic');
  projections.observable.get = () => projections[projections.current];
  // Initialize overlay with the model
  initOverlay(projections.observable);
  // Convertion partial function
  const toCanvas = convertToCanvas.bind(this, viewport);
  const fromCanvas = convertFromCanvas.bind(this, viewport);
  const drawScene = draw.bind(this, viewport, toCanvas,
    projections.observable.get);

  let cube = buildCube(vertices);

  // Scope where the rotation happens when using the mouse.
  {
    let previous = undefined;
    // Mouse event handler
    eventHandler(viewport, (position) => {
      // Compute the current position on the trackball we are point it to
      const current = computeTrackball(look, 70, [...fromCanvas([position.clientX, position.clientY]), 0]);
      if (previous !== undefined && JSON.stringify(previous) !== JSON.stringify(current)) {
        // If we have a previous point on the trackaball, compute the rotation from:
        // 1. The normal axis of the plane formed by both points
        // 2. The angle between the vectors formed by those two points
        const rotation = computeRotation(previous, current);
        // Rotate the eye and up accordingly
        [eye, up] = rotate([0, 0, 0], rotation.axis, rotation.angle, [eye, up]);
        drawScene(cube, toCamera(eye, look, up));
      }
      previous = current;
    }, () => previous = undefined);
  }

  // Nice rotation animation
  // setInterval(() => {
  //   [eye, up] = rotate([0, 0, 0], [1, 0, 0], 0.001, [eye, up]);
  //   [eye, up] = rotate([0, 0, 0], [0, 1, 0], 0.001, [eye, up]);
  //   draw(viewport, toCanvas, cube, toCamera(eye, look, up));
  // }, 10);

  drawScene(cube, toCamera(eye, look, up));
}

window.onload = main;
