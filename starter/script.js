'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = Date.now() + ''.slice(-10); //generate id

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
  setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration); // call super with all common params
    this.cadence = cadence;
    this.calcPace(); // utilize constructor to immediately calculate pace
    this.setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration); // call super with all common params
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this.setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// APPLICATION ARCHITECTURE
class App {
  // CLASS FIELDS
  #map;
  #mapZoomLevel = 13;
  #mapEvent; // private property in app obj
  workouts = [];

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this.getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this)); // when you are using event listeners inside of a class the this keyword becomes what the event handler is attached to, so you need to bind it to this
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this.moveToPopUp.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this), // manually bind this keyword bc callback function is treating this as a regular function call, not a method call
        function () {
          alert('could not get your position');
        }
      );
    }
  }
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));
    this.workouts.forEach(workout => this.renderWorkoutMarker(workout));
  }
  _showForm(mapE) {
    this.#mapEvent = mapE; // copy to global variable to use for form
    form.classList.remove('hidden');
    inputDistance.focus(); // selects form element so user can start typing
  }

  hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden'); // inverse query selector selects parents and not children.
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    //HELPER FUNCTIONS
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp)); // will return false if just 1 input falsy

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    //get data from form
    const type = inputType.value; // running or cycling
    const distance = +inputDistance.value; // convert to number
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if running create running obj
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //check if data is valid with guard clause
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs need to be positive numbers.');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if cycling create cycling obj
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs need to be positive numbers.');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // add new obj to workout array
    this.workouts.push(workout);
    console.log(this.workouts);

    //render workout on map as marker
    this.renderWorkoutMarker(workout);

    //render workout on list
    this.renderWorkout(workout);

    // hide the form and clear input fields
    this.hideForm();

    // set local storage to all workouts
    this.setLocalStorage();
  }
  renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running') {
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
        <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
    }
    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }
  moveToPopUp(e) {
    const workoutEl = e.target.closest('.workout');
    console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    console.log(workout);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
  setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.workouts)); // convert workouts to string and set to local storage
  }

  getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts')); // converts back into array of objs
    console.log(data);

    if (!data) return;

    this.workouts = data;

    this.workouts.forEach(workout => this.renderWorkout(workout));
  }
  reset() {
    localStorage.removeItem('workouts'); //removes item from local storage
    location.reload(); //reloads page
  }
}

const app = new App(); // new app variable is created out of the class
