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
  console.log(`Checking if grumpy: Hungger ${context.hunger}, Energy ${context.energy} -> ${unhealthy}`);
  return unhealthy;
};

const isUnhealthyForSick = (context) => {
  const sick = context.hunger >= 8 || context.energy <= 2;
  console.log(`Checking if sick: Hungger ${context.hunger}, Energy ${context.energy} -> ${sick}`);
  return sick;
};

const isHealthy = (context) => {
  const healthy = context.hunger < 5 && context.energy > 5;
  console.log(`Checking if healthy: Hungger ${context.hunger}, Energy ${context.energy} -> ${healthy}`);
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
        }
      },

      food_selection: {
        description:
          "Player dapat memilih beberapa jenis makanan seperti cookies, milk, dan fruits",
        entry: 'showFeedOptions',
        exit: 'hideFeedOptions',
        on: {
          player_selecting: {
            target: "stomach_full",
            actions: [assignHunger(-3), "trackFood"],
          },
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
        }
      },
      food_selection_grumpy: {
        description:
          "Player dapat memilih beberapa jenis makanan seperti cookies, milk, dan fruits",
        entry: 'showFeedOptions',
        exit: 'hideFeedOptions',
        on: {
          player_selecting: {
            target: "recovered_status",
            actions: [assignHunger(-3), "trackFood"],
          },
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
      showFeedOptions: () => {
        const feedOptions = document.getElementById('feed-options');
        if (feedOptions) feedOptions.style.display = 'flex';
      },
      hideFeedOptions: () => {
        const feedOptions = document.getElementById('feed-options');
        if (feedOptions) feedOptions.style.display = 'none';
      },
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
const feedOptionsDiv = document.getElementById('feed-options');
const foodOptionButtons = document.querySelectorAll('.food-option');

const splashScreen = document.getElementById('splash-screen');
const container = document.querySelector('.container');
const chimeraImageElement = document.querySelector('.chimera');
const retryMainButton = document.getElementById('retry-main-button');

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

  [feedButton, playButton, sleepButton].forEach(btn => btn && (btn.disabled = false));
  if (retryMainButton) retryMainButton.style.display = 'block';

  const existingGameOverDiv = document.getElementById('game-over-message');
  if (existingGameOverDiv) existingGameOverDiv.remove();

  if (state.matches('healthy_mood_normal')) {
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
    chimeraImgSrc = "assets/Chimera-Happy.gif";
  } else if (state.matches('enough_sleep')) {
    dynamicText = "[RESTED]";
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

    [feedButton, playButton, sleepButton].forEach(btn => btn && (btn.disabled = true));
    if (retryMainButton) retryMainButton.style.display = 'none';

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
  }

  if (statusParagraph) {
    if (state.matches('playing')) {
      statusParagraph.textContent = dynamicText;
    } else {
      statusParagraph.innerHTML = `I'M <span id="status-value-text">${dynamicText}</span> RIGHT NOW!`;
    }

    const currentStatusTextSpan = document.getElementById('status-value-text');
    if (currentStatusTextSpan) {
        currentStatusTextSpan.classList.remove('fine', 'happy', 'full', 'rested', 'grumpy', 'sick');
        currentStatusTextSpan.classList.add(statusClass);
    } else {
        statusParagraph.classList.remove('fine', 'happy', 'full', 'rested', 'grumpy', 'sick');
        statusParagraph.classList.add(statusClass);
    }
  } else {
    console.error("Status paragraph element not found!");
  }


  if (chimeraImageElement) {
    chimeraImageElement.src = chimeraImgSrc;
  } else {
    console.error("Chimera image element not found!");
  }

  if (playButton) {
      playButton.disabled = state.context.energy <= 5;
      if (state.context.energy <= 5) {
          playButton.style.opacity = '0.5';
          playButton.style.cursor = 'not-allowed';
      } else {
          playButton.style.opacity = '1';
          playButton.style.cursor = 'pointer';
      }
  }
};

let chimeraService;
let periodicCheckSubscription;
let retryGameOverSubscription;

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

  chimeraService = interpret(chimeraMachine).start();
  console.log("New service started.");

  chimeraService.subscribe(state => {
    updateMainUI(state);

    if (state.matches('stomach_full') && state.context.consecutiveSameFoodCount > 3) {
        console.log("Detected >= 3 consecutive same food. Sending 'repeat_same_food_3_times' event.");
        if (state.nextEvents.includes('repeat_same_food_3_times')) {
            event$$.next({ type: 'repeat_same_food_3_times' });
        } else {
           console.warn("repeat_same_food_3_times event triggered but state cannot receive it.");
        }
    }
  });

  periodicCheckSubscription = interval(5000).pipe(
    map(() => ({ type: 'time_check' }))
  ).subscribe(event$$.next.bind(event$$));
    console.log("Periodic check subscription started.");

  event$$.subscribe(event => {
      console.log('Event sent to service:', event);
      chimeraService.send(event);
  });

  updateMainUI(chimeraService.state);
};

const restartGame = () => {
  console.log("Restarting game...");

  if (chimeraService) chimeraService.stop();
  if (periodicCheckSubscription) periodicCheckSubscription.unsubscribe();
  if (retryGameOverSubscription) {
      retryGameOverSubscription.unsubscribe();
      retryGameOverSubscription = null;
      const retryBtn = document.getElementById('retry-game-over-button');
      if (retryBtn) retryBtn.dataset.listenerAdded = '';
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

  [feedButton, playButton, sleepButton].forEach(btn => btn && (btn.disabled = false));
    if (playButton) {
        playButton.style.opacity = '1';
        playButton.style.cursor = 'pointer';
    }
  if (retryMainButton) retryMainButton.style.display = 'block';

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

foodOptionButtons.forEach(button => {
  fromEvent(button, 'click').pipe(
    map(event => ({ type: 'player_selecting', food: event.target.dataset.food }))
  ).subscribe(event$$.next.bind(event$$));
});

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

event$$.pipe(
  filter(event => event.type === 'RESTART_GAME')
).subscribe(() => restartGame());


if (container) {
  container.style.display = 'none';
}

const feedOptions = document.getElementById('feed-options');
if (feedOptions) feedOptions.style.display = 'none';