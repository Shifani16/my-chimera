import { foodData } from './utils.js';

export const hungerElement = document.getElementById('hunger');
export const energyValueElement = document.getElementById('energy-value');
export const energyFillElement = document.getElementById('energy-fill');
export const statusParagraph = document.getElementById('status');
export const statusTextSpan = document.getElementById('status-value-text');

export const feedButton = document.getElementById('feed-button');
export const playButton = document.getElementById('play');
export const sleepButton = document.getElementById('sleep');

export const actionButtonsContainer = document.getElementById('action-buttons-container');
export const feedCarouselContainer = document.getElementById('feed-carousel-container');
export const feedCarousel = document.getElementById('feed-carousel');
export const cancelFeedButton = document.getElementById('cancel-feed-button');

export const splashScreen = document.getElementById('splash-screen');
export const container = document.querySelector('.container');
export const chimeraImageElement = document.querySelector('.chimera');
export const retryMainButton = document.getElementById('retry-main-button');
export const pauseButton = document.getElementById('pause-button');

export const mainActionButtons = [feedButton, playButton, sleepButton];

export let currentFoodOrder = ['cookie', 'milk', 'honeycake'];

export const updateEnergyBar = (value) => {
  if (!energyFillElement || !energyValueElement) {
    console.error("Energy bar elements not found!");
    return;
  }
  const percent = Math.max(0, Math.min(value * 10, 100));
  energyFillElement.style.width = percent + "%";
  energyValueElement.textContent = value;

  energyFillElement.style.backgroundColor =
    value <= 2 ? 'red' :
    value <= 5 ? 'orange' : 'green';
};

export const updateHungerUI = (hunger) => {
  if (hungerElement) {
    hungerElement.textContent = hunger;
    hungerElement.style.color =
      hunger >= 8 ? 'red' :
      hunger >= 5 ? 'orange' : 'inherit';
  } else {
    console.error("Hunger element not found!");
  }
};

export const updateCarouselView = () => {
  if (!feedCarousel) return;
  feedCarousel.innerHTML = '';
  currentFoodOrder.forEach((foodName, index) => {
    const food = foodData.find(f => f.name === foodName);
    if (food) {
      const img = document.createElement('img');
      img.src = food.src;
      img.alt = food.alt;
      img.dataset.food = food.name;
      img.classList.add('food-carousel-item');
      if (index === 1) {
        img.classList.add('active');
      }
      feedCarousel.appendChild(img);
    }
  });
};

export const rotateCarousel = (direction) => {
  if (direction === 'left') {
    currentFoodOrder.push(currentFoodOrder.shift());
  } else if (direction === 'right') {
    currentFoodOrder.unshift(currentFoodOrder.pop());
  }
  updateCarouselView();
};

export const updateMainUI = (state) => {
  console.log('Current State:', state.value);
  console.log('Current Context:', state.context);

  updateHungerUI(state.context.hunger);
  updateEnergyBar(state.context.energy);

  let dynamicText = "";
  let statusClass = "fine";
  let chimeraImgSrc = "assets/Chimera-Idle.gif";

  const existingGameOverDiv = document.getElementById('game-over-message');
  if (existingGameOverDiv) existingGameOverDiv.remove();
  const existingPauseDiv = document.getElementById('pause-message');
  if (existingPauseDiv) existingPauseDiv.remove();

  mainActionButtons.forEach(btn => {
    if (btn) btn.style.display = 'block';
  });
  if (retryMainButton) retryMainButton.style.display = 'block';
  if (pauseButton) pauseButton.style.display = 'block';

  const isPaused = state.matches('paused');

  mainActionButtons.forEach(btn => {
    if (btn) {
      const isDisabledByEnergy = (btn === playButton && state.context.energy <= 5);
      btn.disabled = isPaused || isDisabledByEnergy;

      if (btn.disabled) {
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      } else {
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      }
    }
  });

  if (state.matches('food_selection') || state.matches('food_selection_grumpy')) {
    statusParagraph.innerHTML = `What should I <span class="status-highlight-purple">[EAT]</span>?`;
    chimeraImgSrc = "assets/Chimera-Idle.gif";
  } else if (state.matches('healthy_mood_normal')) {
    dynamicText = "[DOING FINE]";
    statusClass = "fine";
    chimeraImgSrc = "assets/Chimera-Idle.gif";
  } else if (state.matches('playing')) {
    dynamicText = state.context.currentFunFact;
    statusClass = "happy";
    chimeraImgSrc = "assets/Chimera-Idle-Confused.gif";
  } else if (state.matches('stomach_full')) {
    dynamicText = "[FULL]";
    statusClass = "full";
    chimeraImgSrc = "assets/Chimera-Happy-Munch.gif";
  } else if (state.matches('enough_sleep')) {
    dynamicText = "[RESTING]";
    statusClass = "rested";
    chimeraImgSrc = "assets/Chimera-Sleep.gif";
  } else if (state.matches('mood_grumpy')) {
    dynamicText = "[GRUMPY]";
    statusClass = "grumpy";
    chimeraImgSrc = "assets/Chimera-Angy.gif";
  } else if (state.matches('sick_mood_grumpy')) {
    dynamicText = "[SICK]";
    statusClass = "sick";
    chimeraImgSrc = "assets/Chimera-Sick.gif";

    [...mainActionButtons, retryMainButton, pauseButton].forEach(btn => btn && (btn.style.display = 'none'));

    const gameOverDiv = document.createElement('div');
    gameOverDiv.id = 'game-over-message';
    gameOverDiv.innerHTML = `
        <p>Your Chimera is sick! Game Over.</p>
        <button id="retry-game-over-button" class="retry-button">RETRY</button>
    `;
    gameOverDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 30px;
        border-radius: 15px;
        font-size: 1.5em;
        z-index: 10;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    `;
    document.body.appendChild(gameOverDiv);
  } else if (state.matches('recovered_status')) {
    dynamicText = "[CHECKING STATUS...]";
    statusClass = "fine";
  } else if (state.matches('paused')) {
    dynamicText = "[PAUSED]";
    statusClass = "fine";
    chimeraImgSrc = "assets/Chimera-Idle.gif";

    if (retryMainButton) retryMainButton.style.display = 'none';
    if (pauseButton) pauseButton.style.display = 'none';


    const pauseDiv = document.createElement('div');
    pauseDiv.id = 'pause-message';
    pauseDiv.innerHTML = `
        <p>Game Paused</p>
        <button id="resume-button" class="retry-button">RESUME</button>
    `;
    pauseDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 30px;
        border-radius: 15px;
        font-size: 1.5em;
        z-index: 10;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    `;
    document.body.appendChild(pauseDiv);
  }

  if (statusParagraph && !state.matches('food_selection') && !state.matches('food_selection_grumpy')) {
    if (state.matches('playing')) {
      statusParagraph.textContent = dynamicText;
    } else {
      statusParagraph.innerHTML = `I'M <span id="status-value-text">${dynamicText}</span> RIGHT NOW!`;
    }

    const currentStatusTextSpan = document.getElementById('status-value-text');
    if (currentStatusTextSpan) {
      currentStatusTextSpan.classList.remove('fine', 'happy', 'full', 'rested', 'grumpy', 'sick');
      currentStatusTextSpan.classList.add(statusClass);
    } else if (!state.matches('playing')) {
      statusParagraph.classList.remove('fine', 'happy', 'full', 'rested', 'grumpy', 'sick');
      statusParagraph.classList.add(statusClass);
    }
  } else if (!statusParagraph) {
    console.error("Status paragraph element not found!");
  }

  if (chimeraImageElement) {
    chimeraImageElement.src = chimeraImgSrc;
  } else {
    console.error("Chimera image element not found!");
  }
};

export const resetGameUI = () => {
  updateEnergyBar(10);
  updateHungerUI(0);

  if (statusParagraph) {
    statusParagraph.innerHTML = `I'M <span id="status-value-text">[RESETTING...]</span> RIGHT NOW!`;
    const currentStatusTextSpan = document.getElementById('status-value-text');
    if (currentStatusTextSpan) {
      currentStatusTextSpan.classList.remove('happy', 'full', 'rested', 'grumpy', 'sick');
      currentStatusTextSpan.classList.add('fine');
    }
  }
  if (chimeraImageElement) chimeraImageElement.src = "assets/Chimera-Idle.gif";

  const existingGameOverDiv = document.getElementById('game-over-message');
  if (existingGameOverDiv) existingGameOverDiv.remove();
  const existingPauseDiv = document.getElementById('pause-message');
  if (existingPauseDiv) existingPauseDiv.remove();

  [...mainActionButtons, retryMainButton, pauseButton].forEach(btn => btn && (btn.style.display = 'block'));
  mainActionButtons.forEach(btn => {
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
  });
  if (pauseButton) pauseButton.textContent = 'PAUSE';

  if (container) {
    container.style.display = 'none';
  }
  if (splashScreen) {
    splashScreen.style.display = 'flex';
  }
};

export const toggleSplashScreen = (show) => {
  if (splashScreen && container) {
    splashScreen.style.display = show ? 'flex' : 'none';
    container.style.display = show ? 'none' : 'block';
  } else {
    console.error("Splash screen or container element not found!");
  }
};