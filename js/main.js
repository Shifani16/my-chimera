import { setupEventListeners, startGame, event$$ } from './rxjsHandlers.js';
import { container, toggleSplashScreen } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  if (container) {
    container.style.display = 'none';
  }

  setupEventListeners();

  toggleSplashScreen(true);
});
