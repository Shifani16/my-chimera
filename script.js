document.getElementById('splash-screen').addEventListener('click', function () {
  this.style.display = 'none';
});

function updateEnergyBar(value) {
  const fill = document.getElementById("energy-fill");
  const percent = Math.max(0, Math.min(value * 10, 100));
  fill.style.width = percent + "%";
  document.getElementById("energy-value").textContent = value;
}
