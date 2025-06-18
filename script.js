const { createMachine, interpret, assign } = XState;
const { Subject, fromEvent, interval, merge } = rxjs;
const { map, filter, tap } = rxjs.operators;

const updateStat = (currentVal, change, min = 0, max = 10) =>
  Math.max(min, Math.min(max, currentVal + change));

const assignMood = (mood) => assign({ mood: () => mood });

const assignEnergy = (energyChange) => assign({
  energy: (context) => updateStat(context.energy, energyChange)
});

const assignHunger = (hungerChange) => assign({
  hunger: (context) => updateStat(context.hunger, hungerChange)
});

const trackFood = assign({
  lastFood: (context, event) => event.food,
  consecutiveSameFoodCount: (context, event) =>
    context.lastFood === event.food ? context.consecutiveSameFoodCount + 1 : 1,
});

const assignRandomFunFact = assign({
  currentFunFact: () => getRandomFunFact(),
});

const isUnhealthyForGrumpy = (context) => {
  const unhealthy = context.hunger >= 5 || context.energy <= 5;
  console.log(`Checking if grumpy: Hunger ${context.hunger}, Energy ${context.energy} -> ${unhealthy}`);
  return unhealthy;
};

const isUnhealthyForSick = (context) => {
  const sick = context.hunger >= 8 || context.energy <= 2;
  console.log(`Checking if sick: Hunger ${context.hunger}, Energy ${context.energy} -> ${sick}`);
  return sick;
};

const isHealthy = (context) => {
  const healthy = context.hunger < 5 && context.energy > 5;
  console.log(`Checking if healthy: Hunger ${context.hunger}, Energy ${context.energy} -> ${healthy}`);
  return healthy;
};

const isEnergySufficientForPlay = (context) => {
  const sufficient = context.energy > 5;
  console.log(`Checking if energy sufficient for play: Energy ${context.energy} -> ${sufficient}`);
  return sufficient;
};


const chimeraMachine = createMachine(
  {
    context: {
      mood: "normal",
      energy: 10,
      hunger: 0,
      lastFood: null,
      consecutiveSameFoodCount: 0,
      currentFunFact: "", 
    },
    id: "My Chimera",
    initial: "healthy_mood_normal",
    states: {
      paused: {
        description: "The game is paused.",
        on: {
          TOGGLE_PAUSE: "healthy_mood_normal", 
          RESTART_GAME: {
            target: 'healthy_mood_normal',
            actions: () => event$$.next({ type: 'RESTART_GAME_FROM_PAUSE' }) 
          }
        }
      },
      healthy_mood_normal: {
        description:
          "Chimera akan berada di state idle, sedang tidak berinteraksi atau menunjukkan perilaku tidak normal. Mood yang ditunjukkan sedang normal.",
        on: {
          play: {
            target: "playing",
            actions: [assignEnergy(-3), assignMood("happy"), "assignRandomFunFact"], 
            cond: "isEnergySufficientForPlay",
          },
          feed: {
            target: "food_selection",
          },
          makes_sleep: {
            target: "enough_sleep",
            actions: [assignEnergy(3)],
          },
          time_check: [
            {
              target: "mood_grumpy",
              cond: "is_unhealthy_for_grumpy",
              actions: [assignEnergy(-1), assignHunger(1), assignMood("grumpy")],
              description: "If stats are unhealthy on periodic check, become grumpy and degrade stats slightly."
            },
            {
                actions: [assignEnergy(-1), assignHunger(1)],
            }
          ],
          TOGGLE_PAUSE: "paused"
        },
      },
      playing: {
        description:
          "Chimera is happy and actively playing for a short period. Other events (like time_check) are ignored.",
        after: {
          5000: {
            target: "recovered_status",
          },
        },
        on: {
          time_check: undefined,
          TOGGLE_PAUSE: "paused"
        }
      },

      food_selection: {
        description:
          "Player dapat memilih beberapa jenis makanan seperti cookies, milk, dan honeycake",
        entry: 'showFeedCarousel',
        exit: 'hideFeedCarousel',
        on: {
          player_selecting: {
            target: "stomach_full",
            actions: [assignHunger(-3), "trackFood"],
          },
          CANCEL_FEED: { target: 'healthy_mood_normal' },
          TOGGLE_PAUSE: "paused"
        },
      },
      enough_sleep: {
        description:
          "Chimera akan berada di state cukup tidur. Tidak akan rentan terhadap penyakit.",
        after: {
          5000: {
            target: "healthy_mood_normal",
          },
        },
        on: {
          TOGGLE_PAUSE: "paused"
        }
      },
      mood_grumpy: {
        description:
          "Chimera akan berada di state grumpy. Chimera akan menunjukkan perilaku tidak senang",
        on: {
          time_check: [
            {
              target: "sick_mood_grumpy",
              cond: "is_unhealthy_for_sick",
              actions: [assignEnergy(-1), assignHunger(1)],
              description: "If still unhealthy while grumpy on periodic check, become sick."
            },
            {
              actions: [assignEnergy(-1), assignHunger(1)]
            }
          ],
          play: {
            target: "playing",
            actions: [assignEnergy(-3), assignMood("happy"), "assignRandomFunFact"], 
            cond: "isEnergySufficientForPlay",
          },
          makes_sleep: {
            target: "recovered_status",
            actions: [assignEnergy(3)],
          },
          feed: {
            target: "food_selection_grumpy",
          },
          TOGGLE_PAUSE: "paused"
        },
      },
      stomach_full: {
        description:
          "Chimera akan berada di state dimana perutnya kenyang. Tidak kelaparan",
        after: {
          5000: {
            target: "healthy_mood_normal",
          },
        },
        on: {
          repeat_same_food_3_times: {
            target: "mood_grumpy",
            actions: assign((context) => ({
              mood: 'grumpy',
              hunger: updateStat(context.hunger, 5),
              energy: updateStat(context.energy, -5),
            })),
          },
          TOGGLE_PAUSE: "paused"
        },
      },
      sick_mood_grumpy: {
        description:
          "Chimera akan berada di state sakit. Chimera tidak bahagia dan dalam keadaan yang tidak baik-baik saja. Virtual pet berakhir",
        type: 'final'
      },
      recovered_status: {
        description:
          "Status akan berganti secara dinamis sesuai dengan opsi yang dipilih player untuk memulihkan status",
        always: [
          {
            target: "healthy_mood_normal",
            cond: "is_healthy",
          },
          {
            target: "mood_grumpy",
            cond: "is_unhealthy_for_grumpy",
          },
          {
              target: "mood_grumpy"
          }
        ],
        on: {
          TOGGLE_PAUSE: "paused"
        }
      },
      food_selection_grumpy: {
        description:
          "Player dapat memilih beberapa jenis makanan seperti cookies, milk, dan honeycake",
        entry: 'showFeedCarousel',
        exit: 'hideFeedCarousel',
        on: {
          player_selecting: {
            target: "recovered_status",
            actions: [assignHunger(-3), "trackFood"],
          },
          CANCEL_FEED: { target: 'mood_grumpy' },
          TOGGLE_PAUSE: "paused"
        },
      },
    },
    predictableActionArguments: true,
    preserveActionOrder: true,
  },
  {
    actions: {
      mood: assignMood,
      energy: assignEnergy,
      hunger: assignHunger,
      trackFood: trackFood,
      assignRandomFunFact: assignRandomFunFact, 
      // showFeedOptions: () => {
      //   const feedOptions = document.getElementById('feed-options');
      //   if (feedOptions) feedOptions.style.display = 'flex';
      // },
      // hideFeedOptions: () => {
      //   const feedOptions = document.getElementById('feed-options');
      //   if (feedOptions) feedOptions.style.display = 'none';
      // },
      showFeedCarousel: () => {
        if (actionButtonsContainer)
          actionButtonsContainer.style.display = 'none';
        if (feedCarouselContainer) feedCarouselContainer.style.display = 'flex';
          updateCarouselView();
      },
      hideFeedCarousel: () => {
        if (feedCarouselContainer) feedCarouselContainer.style.display = 'none';
        if (actionButtonsContainer) actionButtonsContainer.style.display = 'flex';
      }
    },
    guards: {
      is_unhealthy_for_grumpy: isUnhealthyForGrumpy,
      is_unhealthy_for_sick: isUnhealthyForSick,
      is_healthy: isHealthy,
      isEnergySufficientForPlay: isEnergySufficientForPlay,
    },
  }
);

const event$$ = new Subject();

const hungerElement = document.getElementById('hunger');
const energyValueElement = document.getElementById('energy-value');
const energyFillElement = document.getElementById('energy-fill');
const statusParagraph = document.getElementById('status');
const statusTextSpan = document.getElementById('status-value-text');

const feedButton = document.getElementById('feed-button');
const playButton = document.getElementById('play');
const sleepButton = document.getElementById('sleep');
// const feedOptionsDiv = document.getElementById('feed-options');
// const foodOptionButtons = document.querySelectorAll('.food-option');

const actionButtonsContainer = document.getElementById('action-buttons-container');
const feedCarouselContainer = document.getElementById('feed-carousel-container');
const feedCarousel = document.getElementById('feed-carousel');
const cancelFeedButton = document.getElementById('cancel-feed-button');

const splashScreen = document.getElementById('splash-screen');
const container = document.querySelector('.container');
const chimeraImageElement = document.querySelector('.chimera');
const retryMainButton = document.getElementById('retry-main-button');
const pauseButton = document.getElementById('pause-button'); 

const mainActionButtons = [feedButton, playButton, sleepButton];

const foodData = [
  { name: 'cookie', src: 'assets/Food-Cookie.png', alt: 'Cookie' },
  { name: 'milk', src: 'assets/Drink-Milk.png', alt: 'Milk' },
  { name: 'honeycake', src: 'assets/Food-Honeycake.png', alt: 'Honeycake' }
];

let currentFoodOrder = ['cookie', 'milk', 'honeycake'];

const updateCarouselView = () => {
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

const rotateCarousel = (direction) => {
    if (direction === 'left') {
        currentFoodOrder.push(currentFoodOrder.shift());
    } else if (direction === 'right') {
        currentFoodOrder.unshift(currentFoodOrder.pop());
    }
    updateCarouselView(); 
};

const funFacts = [
  "Hello, my name is Fig Stew! Nice to meet you, kind human!.",
  "Do you like my orange fur?",
  "Hey do you know where Beagle Coconut is?",
  "I like the food you gave to me! Thanks",
  "Don't understimate me okay! I can fight too",
  "The garden is so nice..."
];

const getRandomFunFact = () => {
  const randomIndex = Math.floor(Math.random() * funFacts.length);
  return funFacts[randomIndex];
};

const updateEnergyBar = (value) => {
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

const updateHungerUI = (hunger) => {
  if (hungerElement) {
    hungerElement.textContent = hunger;
    hungerElement.style.color =
      hunger >= 8 ? 'red' :
      hunger >= 5 ? 'orange' : 'inherit';
  } else {
    console.error("Hunger element not found!");
  }
};

const updateMainUI = (state) => {
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

    if (!document.getElementById('retry-game-over-button').dataset.listenerAdded) {
        fromEvent(document.getElementById('retry-game-over-button'), 'click')
           .subscribe(() => event$$.next({ type: 'RESTART_GAME' }));
        document.getElementById('retry-game-over-button').dataset.listenerAdded = 'true';
    }

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

    const resumeButton = document.getElementById('resume-button');
    if (resumeButton && !resumeButton.dataset.listenerAdded) {
      fromEvent(resumeButton, 'click')
        .subscribe(() => event$$.next({ type: 'TOGGLE_PAUSE' }));
      resumeButton.dataset.listenerAdded = 'true';
    }

    const restartFromPauseButton = document.getElementById('restart-from-pause-button');
    if (restartFromPauseButton && !restartFromPauseButton.dataset.listenerAdded) {
      fromEvent(restartFromPauseButton, 'click')
        .subscribe(() => event$$.next({ type: 'RESTART_GAME' }));
      restartFromPauseButton.dataset.listenerAdded = 'true';
    }
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

let chimeraService;
let periodicCheckSubscription;
let retryGameOverSubscription; 
let resumeButtonSubscription; 
let restartFromPauseButtonSubscription; 

const startGame = () => {
  console.log("Starting game...");
  if (splashScreen && container) {
    splashScreen.style.display = 'none';
    container.style.display = 'block';
  } else {
    console.error("Splash screen or container element not found!");
    return;
  }

  if (chimeraService) {
    chimeraService.stop();
    console.log("Previous service stopped.");
  }
  if (periodicCheckSubscription) {
    periodicCheckSubscription.unsubscribe();
    console.log("Previous periodic check subscription unsubscribed.");
  }

  if (retryGameOverSubscription) {
    retryGameOverSubscription.unsubscribe();
    retryGameOverSubscription = null;
    const retryBtn = document.getElementById('retry-game-over-button');
    if (retryBtn) retryBtn.dataset.listenerAdded = '';
  }
  if (resumeButtonSubscription) {
    resumeButtonSubscription.unsubscribe();
    resumeButtonSubscription = null;
    const resumeBtn = document.getElementById('resume-button');
    if (resumeBtn) resumeBtn.dataset.listenerAdded = '';
  }
  if (restartFromPauseButtonSubscription) {
    restartFromPauseButtonSubscription.unsubscribe();
    restartFromPauseButtonSubscription = null;
    const restartBtn = document.getElementById('restart-from-pause-button');
    if (restartBtn) restartBtn.dataset.listenerAdded = '';
  }


  chimeraService = interpret(chimeraMachine).start();
  console.log("New service started.");

  chimeraService.subscribe(state => {
    updateMainUI(state);

    if (state.matches('stomach_full') && state.context.consecutiveSameFoodCount > 3) {
        console.log("Detected >= 3 consecutive same food. Sending 'repeat_same_food_3_times' event.");
        event$$.next({ type: 'repeat_same_food_3_times' });
    }

    if (state.matches('paused')) {
      if (periodicCheckSubscription) {
        periodicCheckSubscription.unsubscribe();
        periodicCheckSubscription = null; 
        console.log("Periodic check paused.");
      }
    } else {
      mainActionButtons.forEach(btn => {
          if (btn) btn.style.display = 'block';
      });

      if (retryMainButton) retryMainButton.style.display = 'block';
      if (pauseButton) pauseButton.style.display = 'block';

     
      mainActionButtons.forEach(btn => {
          if (btn) {
              btn.disabled = false;
              btn.style.opacity = '1';
              btn.style.cursor = 'pointer';
          }
      });
      if (pauseButton) pauseButton.textContent = 'PAUSE'; 


      if (!periodicCheckSubscription || periodicCheckSubscription.closed) { 
        periodicCheckSubscription = interval(5000).pipe(
          map(() => ({ type: 'time_check' }))
        ).subscribe(event$$.next.bind(event$$));
        console.log("Periodic check resumed/started.");
      }
    }
  });

  event$$.subscribe(event => {
      console.log('Event sent to service:', event);
      chimeraService.send(event);
  });

  updateMainUI(chimeraService.state);
};

const restartGame = () => {
  console.log("Restarting game...");

  if (chimeraService) chimeraService.stop();
  if (periodicCheckSubscription) {
    periodicCheckSubscription.unsubscribe();
    periodicCheckSubscription = null;
  }
  
  if (retryGameOverSubscription) {
    retryGameOverSubscription.unsubscribe();
    retryGameOverSubscription = null;
    const retryBtn = document.getElementById('retry-game-over-button');
    if (retryBtn) retryBtn.dataset.listenerAdded = '';
  }
  if (resumeButtonSubscription) {
    resumeButtonSubscription.unsubscribe();
    resumeButtonSubscription = null;
    const resumeBtn = document.getElementById('resume-button');
    if (resumeBtn) resumeBtn.dataset.listenerAdded = '';
  }
  if (restartFromPauseButtonSubscription) {
    restartFromPauseButtonSubscription.unsubscribe();
    restartFromPauseButtonSubscription = null;
    const restartBtn = document.getElementById('restart-from-pause-button');
    if (restartBtn) restartBtn.dataset.listenerAdded = '';
  }


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

if (splashScreen) {
  fromEvent(splashScreen, 'click')
    .subscribe(startGame);
} else {
  console.error("Splash screen element not found! Cannot start game.");
}

if (feedButton) {
  fromEvent(feedButton, 'click').pipe(
    map(() => ({ type: 'feed' }))
  ).subscribe(event$$.next.bind(event$$));
} else { console.error("Feed button not found!"); }

// foodOptionButtons.forEach(button => {
//   fromEvent(button, 'click').pipe(
//     map(event => ({ type: 'player_selecting', food: event.target.dataset.food }))
//   ).subscribe(event$$.next.bind(event$$));
// });

if (playButton) {
  fromEvent(playButton, 'click').pipe(
    map(() => ({ type: 'play' }))
  ).subscribe(event$$.next.bind(event$$));
} else { console.error("Play button not found!"); }

if (sleepButton) {
  fromEvent(sleepButton, 'click').pipe(
    map(() => ({ type: 'makes_sleep' }))
  ).subscribe(event$$.next.bind(event$$));
} else { console.error("Sleep button not found!"); }

if (retryMainButton) {
  fromEvent(retryMainButton, 'click').pipe(
    map(() => ({ type: 'RESTART_GAME' }))
  ).subscribe(event$$.next.bind(event$$));
} else {
  console.error("Retry main button not found!");
}

if (pauseButton) {
  fromEvent(pauseButton, 'click').pipe(
    map(() => ({ type: 'TOGGLE_PAUSE' }))
  ).subscribe(event$$.next.bind(event$$));
} else {
  console.error("Pause button not found!");
}

event$$.pipe(
  filter(event => event.type === 'RESTART_GAME')
).subscribe(() => restartGame());


if (container) {
  container.style.display = 'none';
}

const feedOptions = document.getElementById('feed-options');
// if (feedOptions) feedOptions.style.display = 'none';

if (feedCarousel) {
    fromEvent(feedCarousel, 'click')
        .pipe(
            filter(event => event.target.classList.contains('food-carousel-item'))
        )
        .subscribe(event => {
            const clickedItem = event.target;
            const foodName = clickedItem.dataset.food;
            
            if (clickedItem.classList.contains('active')) {
                event$$.next({ type: 'player_selecting', food: foodName });
            } else {
                const clickedIndex = currentFoodOrder.indexOf(foodName);
                if (clickedIndex === 0) { 
                    rotateCarousel('right'); 
                } else if (clickedIndex === 2) { 
                    rotateCarousel('left'); 
                }
            }
        });
}  else { 
  console.error("Feed carousel tidak ditemukan!"); 
}

if (cancelFeedButton) {
  fromEvent(cancelFeedButton, 'click')
    .pipe(map(() => ({ type: 'CANCEL_FEED' })))
    .subscribe(event$$.next.bind(event$$));
} else {
  console.error("Tombol cancel feed tidak ditemukan!");
}