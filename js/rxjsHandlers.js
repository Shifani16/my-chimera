const { fromEvent, interval, Subject, merge } = rxjs
const { map, filter } = rxjs.operators;

import {
  splashScreen, feedButton, playButton, sleepButton, retryMainButton, pauseButton,
  feedCarousel, cancelFeedButton, updateCarouselView, rotateCarousel,
  mainActionButtons, updateMainUI, resetGameUI, toggleSplashScreen, currentFoodOrder
} from './ui.js';
import { chimeraMachine, setUIElementsForMachine } from './chimeraMachine.js';

export const event$$ = new Subject();
export let chimeraService;
export let periodicCheckSubscription;

let retryGameOverSubscription;
let resumeButtonSubscription;
let restartFromPauseButtonSubscription;

export const startGame = () => {
  console.log("Starting game...");
  toggleSplashScreen(false);

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

  setUIElementsForMachine({
    actionButtonsContainer: document.getElementById('action-buttons-container'),
    feedCarouselContainer: document.getElementById('feed-carousel-container'),
    feedCarousel: document.getElementById('feed-carousel'),
    currentFoodOrder: currentFoodOrder
  }, updateCarouselView);

  chimeraService = XState.interpret(chimeraMachine).start();
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

      const resumeButton = document.getElementById('resume-button');
      if (resumeButton && !resumeButton.dataset.listenerAdded) {
        resumeButtonSubscription = fromEvent(resumeButton, 'click')
          .subscribe(() => event$$.next({ type: 'TOGGLE_PAUSE' }));
        resumeButton.dataset.listenerAdded = 'true';
      }
      const restartFromPauseButton = document.getElementById('restart-from-pause-button');
      if (restartFromPauseButton && !restartFromPauseButton.dataset.listenerAdded) {
        restartFromPauseButtonSubscription = fromEvent(restartFromPauseButton, 'click')
          .subscribe(() => event$$.next({ type: 'RESTART_GAME' }));
        restartFromPauseButton.dataset.listenerAdded = 'true';
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

    if (state.matches('sick_mood_grumpy')) {
      const retryGameOverButton = document.getElementById('retry-game-over-button');
      if (retryGameOverButton && !retryGameOverButton.dataset.listenerAdded) {
        retryGameOverSubscription = fromEvent(retryGameOverButton, 'click')
          .subscribe(() => event$$.next({ type: 'RESTART_GAME' }));
        retryGameOverButton.dataset.listenerAdded = 'true';
      }
    }
  });

  event$$.subscribe(event => {
    console.log('Event sent to service:', event);
    chimeraService.send(event);
  });

  updateMainUI(chimeraService.state);
};

export const restartGame = () => {
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

  resetGameUI();
  toggleSplashScreen(true); 
};


export const setupEventListeners = () => {
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
    filter(event => event.type === 'RESTART_GAME' || event.type === 'RESTART_GAME_FROM_PAUSE')
  ).subscribe(() => restartGame());

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
  } else {
    console.error("Feed carousel tidak ditemukan!");
  }

  if (cancelFeedButton) {
    fromEvent(cancelFeedButton, 'click')
      .pipe(map(() => ({ type: 'CANCEL_FEED' })))
      .subscribe(event$$.next.bind(event$$));
  } else {
    console.error("Tombol cancel feed tidak ditemukan!");
  }
};