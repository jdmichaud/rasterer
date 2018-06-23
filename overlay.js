// Display a fps counter on the canvas overlay
function fpsMonitor() {
  let counter = 0;
  let then = Date.now();
  let fpsLabel = document.getElementById('fps');

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

function initOverlay(projection) {
  fpsMonitor();
  projection.subscribe(p =>
    document.getElementById('projection').textContent = p);
}