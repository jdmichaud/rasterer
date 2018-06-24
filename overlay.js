// Display a fps counter on the canvas overlay
function fpsMonitor(fpsLabel) {
  let counter = 0;
  let then = Date.now();

  const incCounter = () => {
    counter = counter + 1
    requestAnimationFrame(incCounter);
  };
  requestAnimationFrame(incCounter);

  setInterval(() => {
    const interval = Date.now() - then;
    fpsLabel.textContent = `${counter / (interval / 1000).toFixed(0)} fps`;
    counter = 0;
    then = Date.now();
  }, 1000);
}

function coordinatesDisplay(c) {
  return `${c[0].toFixed(2)} ${c[1].toFixed(2)} ${c[2].toFixed(2)}`;
}

function initOverlay(overlay, model) {
  fpsMonitor(overlay.getElementsByClassName('fps')[0]);
  model.projection.subscribe(p =>
    overlay.getElementsByClassName('projection')[0].textContent = p);
  model.eye.subscribe(eye => {
    const content = `eye: ${coordinatesDisplay(eye)} (${math.norm(eye).toFixed(0)})`;
    overlay.getElementsByClassName('eye')[0].textContent = content;
  });
  model.look.subscribe(look => {
    const content = `look: ${coordinatesDisplay(look)}`;
    overlay.getElementsByClassName('look')[0].textContent = content;
  });
  model.up.subscribe(up => {
    const content = `up: ${coordinatesDisplay(up)} (${math.norm(up).toFixed(0)})`;
    overlay.getElementsByClassName('up')[0].textContent = content;
  });
}