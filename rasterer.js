const mul = math.multiply;
const sub = math.subtract;
const norm = math.norm;
const dot = math.dot;
const cross = math.cross;
const t = math.transpose;
const inv = math.inv;

let projections = {
  orthographic: orthographicProjection,
  perspective: orthographicProjection,
};

// Default convertion function. Invert y and adds pan.
function convertToCanvas(canvas, coord) {
  return [
    (canvas.width / 2) + coord[0],
    (canvas.height / 2) - coord[1],
  ];
}

function convertFromCanvas(canvas, coord) {
  const rect = canvas.getBoundingClientRect();
  const x = coord[0] - rect.left;
  const y = coord[1] - rect.top;
  return [x - canvas.width / 2 - 1, canvas.height - y - canvas.height / 2 + 2];
}

// Construct a camera matrix from the 3 key vectors
function toCamera(eye, look, up) {
  const z = math.subtract(look, eye);
  return math.transpose([
    math.cross(up, z),
    up,
    z
  ]);
}

// Project b on A
// See 4.2 Projections from Introduction to Linear Agebra 5th (G. Strang)
function orthographicProjection(b, camera) {
  const A = normalizeCameraPlane(camera);
  // convert to column vector
  b = math.transpose(b);
  const toto = math.multiply(
    math.inv(
      math.multiply(
        math.transpose(A),
        A,
      )
    ),
    math.transpose(A),
  );
  const xh = math.multiply(
    math.multiply(
      math.inv(
        math.multiply(
          math.transpose(A),
          A,
        ),
      ),
      math.transpose(A),
    ),
    b,
  );
  return xh;
}

// Normalize the basis of the camera plane
function normalizeCameraPlane(camera) {
  let cameraPlaneX = math.flatten(math.subset(camera, math.index([0, 1, 2], 0)));
  let cameraPlaneY = math.flatten(math.subset(camera, math.index([0, 1, 2], 1)));
  cameraPlaneX = math.divide(cameraPlaneX, norm(cameraPlaneX));
  cameraPlaneY = math.divide(cameraPlaneY, norm(cameraPlaneY));
  return t([cameraPlaneX, cameraPlaneY]);
}

function draw(canvas, toCanvas, projection, vertices, camera) {
  function drawVertices(v, camera) {
    v.forEach(vertex => {
      // Project the vertices to the camera plane
      // and then convert the coordinates to canvas
      const x1 = toCanvas(projections[projection](vertex[0], camera));
      const x2 = toCanvas(projections[projection](vertex[1], camera));
      ctx.beginPath();
      ctx.moveTo(x1[0], x1[1]);
      ctx.lineTo(x2[0], x2[1]);
      ctx.stroke();
    });
  }
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw axis
  ctx.strokeStyle="#0000FF";
  drawVertices([
    [[0, 0, -500], [0, 0, 500]],
    [[0, -500, 0], [0, 500, 0]],
    [[-500, 0, 0], [500, 0, 0]],
  ], camera);
  // Draw vertices
  ctx.strokeStyle="#00FF00";
  drawVertices(vertices, camera);
}


// Compute a 3D point on the trackball (or hyperbolic) from the
// ball center, its radius and the current mouse position.
// If the mouse is on the sphere, then: z = sqrt(radius^2 - (x^2 + y^2))
// Otherwise, the mouse is on the hyperbolic sheet around the sphere, then:
// z = (r^2 / 2) / sqrt(x^2 + y^2)
// The circle where the sphere and the hyperbolic meet is used in the
// condition: x^2 + y^2 = r^2 / 2
// https://www.khronos.org/opengl/wiki/Object_Mouse_Trackball
function computeTrackball(ballCenter, radius, mouse) {
  const radius_squared = Math.pow(radius, 2);
  const vector_from_center = sub(mouse, ballCenter);
  const norm_squared = dot(vector_from_center, vector_from_center);
  let z = 0;
  if (norm_squared < (radius_squared / 2)) {
    // On the sphere
    z = Math.sqrt(radius_squared - norm_squared);
  } else {
    // if point outside of sphere, use the hyperbolic sheet
    z = (radius_squared / 2) / Math.sqrt(norm_squared);
  }
  return [mouse[0], mouse[1], z];
}

// Returns the rotation axis and its angle
function computeRotation(previous, current) {
  previous = math.divide(previous, norm(previous));
  current = math.divide(current, norm(current));
  const axis = cross(previous, current);
  const angle = Math.acos(dot(previous, current));
  return { axis, angle };
}

function rotate(center, axis, angle, vertices) {
  axis = math.divide(axis, norm(axis));
  // First, find two points on the plane for which the axis is the normal vector
  let v1, v2;
  if (axis[1] === 0 && axis[2] === 0) {
    v1 = [0, 1, 0];
    v2 = [0, 0, 1];
  } else if (axis[0] === 0 && axis[2] === 0) {
    v1 = [0, 0, 1];
    v2 = [1, 0, 0];
  } else if (axis[0] === 0 && axis[1] === 0) {
    v1 = [1, 0, 0];
    v2 = [0, 1, 0];
  } else {
    v1 = axis[2] === 0 ? [1, 0, 0] :
      [1, 0, (axis[0] * center[0] + axis[1] * center[1] + axis[2] * center[2] -
        axis[0] * (center[0] + 1) + axis[1] * center[1]) / axis[2]];
    v1 = math.divide(v1, norm(v1));
    v2 = cross(v1, axis);
  }
  // Create a new basis, with rotation axis as the z axis
  const newBasis = [v1, v2, axis];
  // Create the rotation matrix
  const rotMat = [
    [Math.cos(angle), -Math.sin(angle), 0],
    [Math.sin(angle),  Math.cos(angle), 0],
    [0, 0, 1],
  ];
  // Rotate !
  return vertices.map(vertice => {
    return mul(mul(mul(inv(newBasis), rotMat), newBasis), vertice);
  });
}

function getFromSubject(subject) {
  let value;
  subject.subscribe(v => value = v);
  return value;
}

function rasterer(viewport, model) {
  // Convertion partial function
  const toCanvas = convertToCanvas.bind(this, viewport);
  const fromCanvas = convertFromCanvas.bind(this, viewport);
  const drawScene = draw.bind(this, viewport, toCanvas);

  let eye = getFromSubject(model.eye);
  let look = getFromSubject(model.look);
  let up = getFromSubject(model.up);
  const object = getFromSubject(model.object);

  let projection;
  model.projection.subscribe(newProjection => {
    projection = newProjection;
    drawScene(projection, object, toCamera(eye, look, up));
  });

  // Scope where the rotation happens when using the mouse.
  {
    let previous = undefined;
    // Mouse event handler
    eventHandler(viewport, (position) => {
      // Compute the current position on the trackball we are point it to
      const current =
        computeTrackball(
          look, 70, [...fromCanvas([position.clientX, position.clientY]), 0]);
      // If the current position and the previous one are different
      if (previous !== undefined && JSON.stringify(previous) !== JSON.stringify(current)) {
        // If we have a previous point on the trackaball, compute the rotation from:
        // 1. The normal axis of the plane formed by both points
        // 2. The angle between the vectors formed by those two points
        const rotation = computeRotation(previous, current);
        // Rotate the eye and up accordingly
        [eye, up] = rotate([0, 0, 0], rotation.axis, rotation.angle, [eye, up]);
        drawScene(projection, object, toCamera(eye, look, up));
        model.eye.next(eye);
        model.up.next(up);
      }
      previous = current;
    }, () => previous = undefined);
  }

  // Nice rotation animation
  // setInterval(() => {
  //   [eye, up] = rotate([0, 0, 0], [1, 0, 0], 0.001, [eye, up]);
  //   [eye, up] = rotate([0, 0, 0], [0, 1, 0], 0.001, [eye, up]);
  //   draw(viewport, toCanvas, object, toCamera(eye, look, up));
  // }, 10);

  drawScene(projection, object, toCamera(eye, look, up));
}