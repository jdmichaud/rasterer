const add = math.add;
const mul = math.multiply;
const divide = math.divide;
const sub = math.subtract;
const norm = math.norm;
const dot = math.dot;
const cross = math.cross;
const t = math.transpose;
const inv = math.inv;

let projections = {
  orthographic: orthographicProjection,
  perspective: perspectiveProjection,
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
  const A = getCameraPlane(normalizeMatrix(camera));
  // convert to column vector
  b = math.transpose(b);
  const xh = mul(mul(inv(mul(t(A), A)), t(A)), b);
  return xh;
}

function perspectiveProjection(p, camera, eye, look, up) {
  // Get point in camera space
  const A = inv(normalizeMatrix(camera));
  const cameraSpaceP = mul(A, p);
  // Get vector from eyes to P in camera space
  const toP = sub(cameraSpaceP, mul(A, eye));
  // Projection plane is proportional to z axis norm
  const projectionPlaneDistance = norm(eye);
  const xh = [
    toP[0] * projectionPlaneDistance / toP[2],
    toP[1] * projectionPlaneDistance / toP[2],
  ];
  return xh;
}

// Normalize the basis of a space
function normalizeMatrix(A) {
  const normalized = [];
  for (var i = 0; i < A.length; ++i) {
    let v = math.flatten(math.subset(A, math.index(math.range(0, A[i].length), i)));
    v = divide(v, norm(v));
    normalized.push(v);
  }
  return t(normalized);
}

function getCameraPlane(A) {
  let Ax = math.flatten(math.subset(A, math.index([0, 1, 2], 0)));
  let Ay = math.flatten(math.subset(A, math.index([0, 1, 2], 1)));
  return t([Ax, Ay]);
}

function draw(canvas, toCanvas, projection, vertices, eye, look, up) {
  if (!draw.drawn) { // Do not draw more than once within one event loop
    function drawVertices(v, camera) {
      v.forEach(vertex => {
        // Project the vertices to the camera plane
        // and then convert the coordinates to canvas
        const x1 = toCanvas(projections[projection](vertex[0], camera, eye, look, up));
        const x2 = toCanvas(projections[projection](vertex[1], camera, eye, look, up));
        ctx.beginPath();
        ctx.moveTo(x1[0], x1[1]);
        ctx.lineTo(x2[0], x2[1]);
        ctx.stroke();
      });
    }
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const camera = toCamera(eye, look, up);
    // Draw axis
    ctx.strokeStyle="#0000FF";
    drawVertices([
      [[0, 0, 0], [100, 0, 0]],
      [[0, 0, 0], [0, 100, 0]],
      [[0, 0, 0], [0, 0, 100]],
    ], camera);
    // Draw vertices
    ctx.strokeStyle="#00FF00";
    drawVertices(vertices, camera);
    // Draw origin
    ctx.fillStyle="#FF0000";
    const origin = toCanvas(projections[projection]([0, 0, 0], camera, eye, look, up));
    ctx.fillRect(origin[0]-2, origin[1]-2, 4, 4);

    // Marker on front vertices
    ctx.fillStyle="#00FFFF";
    [[-50, -50, -50], [50, -50, -50], [50, 50, -50], [-50, 50, -50]].forEach(point => {
      const projectedPoint = toCanvas(projections[projection](point, camera, eye, look, up));
      ctx.fillRect(projectedPoint[0] - 2, projectedPoint[1] - 2, 4, 4);
    });

    draw.drawn = true;
    window.requestAnimationFrame(() => {
      draw.drawn = false; // Once the frame is displayed we can draw again
    })
  }
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
  const vector_from_center = sub(mouse.slice(0, 2), ballCenter.slice(0, 2));
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
function computeRotation(previous, current, camera) {
  const cameraSpaceTransform = inv(normalizeMatrix(camera));
  previous = mul(cameraSpaceTransform, divide(previous, norm(previous)));
  current = mul(cameraSpaceTransform, divide(current, norm(current)));
  const axis = cross(current, previous);
  const angle = Math.acos(dot(current, previous));
  return { axis, angle };
}

// Find the basis of plane when given a normal unit vector of that plane
// and an origin
function findPlaneBasis(origin, normal) {
  // First, find two points on the plane for which the axis is the normal vector
  let v1, v2;
  if (normal[1] === 0 && normal[2] === 0) {
    v1 = [0, 1, 0];
    v2 = [0, 0, 1];
  } else if (normal[0] === 0 && normal[2] === 0) {
    v1 = [0, 0, 1];
    v2 = [1, 0, 0];
  } else if (normal[0] === 0 && normal[1] === 0) {
    v1 = [1, 0, 0];
    v2 = [0, 1, 0];
  } else {
    v1 = normal[2] === 0 ? [1, 0, 0] :
      [1, 0, (normal[0] * origin[0] + normal[1] * origin[1] + normal[2] * origin[2] -
        normal[0] * (origin[0] + 1) + normal[1] * origin[1]) / normal[2]];
    v1 = divide(v1, norm(v1));
    v2 = cross(v1, normal);
  }
  return [v1, v2];
}

function rotate(center, axis, angle, vertices) {
  axis = math.divide(axis, norm(axis));
  // Create a new basis, with rotation axis as the z axis
  const planeBasis = t(findPlaneBasis(center, axis));
  const newBasis = [
    [...planeBasis[0], axis[0], center[0]],
    [...planeBasis[1], axis[1], center[1]],
    [...planeBasis[2], axis[2], center[2]],
    [            0, 0,       0,         1]
  ];
  // Create the rotation matrix
  const rotMat = [
    [Math.cos(angle), -Math.sin(angle), 0, 0],
    [Math.sin(angle),  Math.cos(angle), 0, 0],
    [              0,                0, 1, 0],
    [              0,                0, 0, 1],
  ];
  const transformMatrix = mul(newBasis, mul(rotMat, inv(newBasis)));
  // Rotate !
  return vertices.map(vertice => {
    return mul(transformMatrix, [...vertice, 1]).slice(0, 3);
  });
}

function rotation3D(event, fromCanvas, eye, look, up) {
  // Compute the current position on the trackball we are point it to
  const current =
    computeTrackball(
      look, 140, [...fromCanvas([event.clientX, event.clientY]), 0]);
  // If the current position and the previous one are different
  if (rotation3D.previous !== undefined &&
      JSON.stringify(rotation3D.previous) !== JSON.stringify(current)) {
    // If we have a previous point on the trackaball, compute the rotation from:
    // 1. The normal axis of the plane formed by both points
    // 2. The angle between the vectors formed by those two points
    const rotation = computeRotation(rotation3D.previous, current, toCamera(eye, look, up));
    // Rotate the eye and up accordingly
    [eye, look, up] = rotate([0, 0, 0], rotation.axis, rotation.angle, [eye, look, up]);
  }
  rotation3D.previous = current;
  return [eye, look, up];
}

function rotation2D(event, fromCanvas, center, eye, look, up) {
  current = event.clientY;
  if (rotation2D.previous !== undefined &&
      JSON.stringify(rotation2D.previous) !== JSON.stringify(current)) {
    const camera = normalizeMatrix(toCamera(eye, look, up));
    const normal = cross(camera[1], camera[0]);
    const angle = -(rotation2D.previous - current) / 60;

    [eye, look] = rotate(center, sub(look, eye), angle, [eye, look]);
    [up] = rotate([0, 0, 0], sub(look, eye), angle, [up]);
  }
  rotation2D.previous = current;
  return [eye, look, up];
}

function translate(event, fromCanvas, eye, look, up) {
  const current = [...fromCanvas([event.clientX, event.clientY]), 0];
  if (translate.previous !== undefined &&
      JSON.stringify(translate.previous) !== JSON.stringify(current)) {
    const camera = normalizeMatrix(toCamera(eye, look, up));
    const translateVector = mul(camera, sub(current, translate.previous));
    eye = sub(eye, translateVector);
    look = sub(look, translateVector);
  }
  translate.previous = current;
  return [eye, look];
}

// Get value form subject, assuming it already got one.
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
    drawScene(projection, object, eye, look, up);
  });

  let rotation;
  model.rotation.subscribe(newRotation => {
    rotation = newRotation;
  });

  // Mouse event handler
  eventHandler(viewport, (event) => {
    if (event.button === 0 && !event.ctrlKey) {
      if (rotation === '3D rotation') {
        [eye, look, up] = rotation3D(event, fromCanvas, eye, look, up);
      } else {
        [eye, look, up] = rotation2D(event, fromCanvas,
          rotation.endsWith('(centered)') ? [0, 0, 0] : look, eye, look, up);
      }
      model.eye.next(eye);
      model.look.next(look);
      model.up.next(up);
    } else if (event.button === 0 && event.ctrlKey || event.button === 1) {
      [eye, look] = translate(event, fromCanvas, eye, look, up);
      model.eye.next(eye);
      model.look.next(look);
    }
  }, () => {
    rotation3D.previous = undefined;
    rotation2D.previous = undefined;
    translate.previous = undefined;
  });

  model.eye.subscribe(v => {
    eye = v;
    drawScene(projection, object, eye, look, up);
  });
  model.look.subscribe(v => {
    look = v;
    drawScene(projection, object, eye, look, up);
  });
  model.up.subscribe(v => {
    up = v;
    drawScene(projection, object, eye, look, up);
  });

  // Nice rotation animation
  // let count = 0;
  // setInterval(() => {
  //   count += 0.01;
  //   [eye, up] = rotate([0, 0, 0], [1, 0, 0], 2 * Math.sin(count) / 100, [eye, up]);
  //   [eye, up] = rotate([0, 0, 0], [0, 1, 0], 2 * Math.cos(count) / 100, [eye, up]);
  //   model.eye.next(eye);
  //   model.up.next(up);
  //   drawScene(projection, object, eye, look, up);
  // }, 10);
}