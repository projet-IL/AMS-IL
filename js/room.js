function openPanel(panelId) {
  // fermer tous les panels
  closePanels();

  // ouvrir le panel demandé
  const panel = document.getElementById(panelId);
  const overlay = document.getElementById("overlay");

  if (panel) {
    panel.classList.remove("-translate-x-full");
    overlay.classList.remove("hidden");
  }
}

function closePanels() {
  const panels = document.querySelectorAll(
    "#invitePanel, #authPanel, #settingsPanel, #helpPanel"
  );
  const overlay = document.getElementById("overlay");

  panels.forEach(panel => {
    panel.classList.add("-translate-x-full");
  });

  overlay.classList.add("hidden");
}
