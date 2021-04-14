"use strict";

const Units = Object.freeze({
  STANDARD : {
    system: 'standard',
    temp: 'K',
    wind: 'm/s'
  },
  METRIC: {
    system: 'metric',
    temp: 'C',
    wind: 'm/s'
  },
  IMPERIAL: {
    system: 'imperial',
    temp: 'F',
    wind: 'mph'
  }
});

class Display {
  constructor() {
    if (!Display._instance) {
      this._weatherData = {
        unit: Units.STANDARD
      }
      this._urlBase = 'https://api.openweathermap.org/data/2.5/'
      this._appID = 'dc72fdf8d282d01f0fdec0c8d1449acc';
      Display._instance = this;
    }
  }

  async init() {
    this.loadWeatherData();

    if (Object.keys(this._weatherData).length < 2) {
      try {
        const dataCurrent = await this.fetchCurrentData('Lappeenranta');
        const lat = dataCurrent.coord.lat;
        const lon = dataCurrent.coord.lon;
    
        const dataOne = await this.fetchOneData(lat, lon);
    
        this.processWeatherData(dataCurrent, dataOne);
        this.saveWeatherData();
      } catch (error) {
        console.log(error);
      }
    }

    this.displayWeatherData();

    const form = document.querySelector('.search-form');
    form.addEventListener('submit', (e) => {
      this.handleSearch(e);
    });

    const unitRadios = document.querySelectorAll('.unit-radio');
    unitRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.handleUnitChange(e);
      });
      if (radio.value === this._weatherData.unit.system) radio.checked = true;
    });
  }
  
  async handleSearch(e) {
    e.preventDefault();

    const searchInput = document.querySelector('.search-input');
    if (!searchInput.value) return;

    let location = searchInput.value.trim();

    try {
      const dataCurrent = await this.fetchCurrentData(location);
      const lat = dataCurrent.coord.lat;
      const lon = dataCurrent.coord.lon;
  
      const dataOne = await this.fetchOneData(lat, lon);
  
      this.processWeatherData(dataCurrent, dataOne);
      this.saveWeatherData();
      this.displayWeatherData();
    
    } catch (error) {
      console.log(error);
    }
  }

  async handleUnitChange(e) {
    for (const unit in Units) {
      if (Units[unit].system === e.target.value) {
        this._weatherData.unit = Units[unit];
      }
    }

    // If data has been loaded, fetch new data for that location
    if (Object.keys(this._weatherData).length > 1) {
      let lat = this._weatherData.coords.lat;
      let lon = this._weatherData.coords.lon;
      try {
        const dataOne = await this.fetchOneData(lat, lon);

        this.processWeatherData(null, dataOne);
        this.saveWeatherData();
        this.displayWeatherData();

      } catch (error) {
        console.log(error);
      }
    }
  }
  
  async fetchCurrentData(location) {
    if (!location) return;

    try {
      const response = await fetch(
        `${this._urlBase}weather?q=${location}&units=${this._weatherData.unit.system}&appid=${this._appID}`,
        { mode: 'cors'}
      );
      const data = await response.json();
      return data;

    } catch (error) {
      console.log(error)
    }
  }

  async fetchOneData(lat, lon) {
    if (!lat || !lon) return;

    try {
      const response = await fetch(
        `${this._urlBase}onecall?lat=${lat}&lon=${lon}&units=${this._weatherData.unit.system}&exclude=minutely,alerts&appid=${this._appID}`,
        { mode: 'cors'}
      );
      const data = await response.json();
      return data;

    } catch (error) {
      console.log(error);
    }
  }

  processWeatherData(current = null, one = null) {
    if (current) {
      this._weatherData.location = current.name;
      this._weatherData.country = current.sys.country;
      this._weatherData.coords = {
        lat: current.coord.lat,
        lon: current.coord.lon
      };
    }

    if (one) {
      this._weatherData.temp = one.current.temp;
      this._weatherData.desc = one.current.weather[0].description;
      this._weatherData.feels_like = one.current.feels_like;
      this._weatherData.temp_min = one.daily[0].temp.min;
      this._weatherData.temp_max = one.daily[0].temp.max;
      this._weatherData.sunrise = one.daily[0].sunrise;
      this._weatherData.sunset = one.daily[0].sunset;
      this._weatherData.rain_chance = one.hourly[0].pop;
      this._weatherData.humidity = one.current.humidity;
      this._weatherData.wind = {
        speed: one.current.wind_speed,
        deg: one.current.wind_deg
      };
  
      this._weatherData.hourly = [];
      one.hourly.forEach(hour => {
        let hourData = {
          time: hour.dt,
          icon: hour.weather[0].icon,
          temp: hour.temp
        };
        this._weatherData.hourly.push(hourData);
      });
  
      this._weatherData.daily = [];
      one.daily.forEach(day => {
        let dayData = {
          time: day.dt,
          icon: day.weather[0].icon,
          temp_min: day.temp.min,
          temp_max: day.temp.max,
          rain_chance: day.pop,
          humidity: day.humidity
        };
        this._weatherData.daily.push(dayData);
      });
  
      this._weatherData.icon = one.current.weather[0].icon;
    }
  }

  saveWeatherData() {
    localStorage.setItem('weatherData', JSON.stringify(this._weatherData));
  }

  loadWeatherData() {
    if (localStorage.getItem('weatherData')) {
      Object.assign(this._weatherData, JSON.parse(localStorage.getItem('weatherData')));
    }
  }

  displayWeatherData() {
    if (Object.keys(this._weatherData).length < 2) return;

    const location = document.querySelector('.location');
    const temperature = document.querySelector('.temperature');
    const description = document.querySelector('.description');
    const weatherImg = document.querySelector('.weather-img');

    console.log(this._weatherData);

    try {
      // Main info
      location.textContent = `${this._weatherData.location.toUpperCase()}, ${this._weatherData.country}`;
      temperature.textContent = `${Math.round(this._weatherData.temp)} °${this._weatherData.unit.temp}`;
      description.textContent = `${this._weatherData.desc}`;
      weatherImg.src = this.getImgLink(this._weatherData.icon);

      this.populateAdditionalInfo();
      this.populateHourlyInfo();
      this.populateDailyInfo();

    } catch (error) {
      console.log(error);
    }
  }

  populateAdditionalInfo() {
    const additionalInfo = document.querySelector('.additional-info');
    this.removeElementChildren(additionalInfo);

    this.appendInfoPair(this.getHoursAndMinutes(this._weatherData.sunrise), 'sunrise', '');

    this.appendInfoPair(this.getHoursAndMinutes(this._weatherData.sunset), 'sunset', '');

    this.appendInfoPair(Math.floor(this._weatherData.rain_chance * 100),'chance of rain', '%');
    this.appendInfoPair(this._weatherData.humidity, 'humidity', '%');
    this.appendInfoPair(Math.round(this._weatherData.temp_max), 'max', `°${this._weatherData.unit.temp}`);
    this.appendInfoPair(Math.round(this._weatherData.temp_min), 'min', `°${this._weatherData.unit.temp}`);
    this.appendInfoPair(Math.round(this._weatherData.wind.speed * 10) / 10, 'wind', `${this._weatherData.unit.wind}`);
    this.appendInfoPair(Math.round(this._weatherData.feels_like), 'feels like', `°${this._weatherData.unit.temp}`);

    if (this._weatherData.precipitation) {
      this.appendInfoPair(this._weatherData.precipitation, 'precipitation', 'mm');
    }

  }

  appendInfoPair(content, title, unit) {
    if (content === null || title === null || unit === null) return;

    const infoPairTemplate = document.querySelector('.info-pair-template');
    const additionalInfo = document.querySelector('.additional-info');

    let clone = infoPairTemplate.content.cloneNode(true);
    clone.querySelector('.info-title').textContent = title.toUpperCase();
    clone.querySelector('.info-content').textContent = `${content} ${unit}`;
    additionalInfo.appendChild(clone);
  }

  populateHourlyInfo() {
    const hourlyInfoContainer = document.querySelector('.hourly-info-container');
    this.removeElementChildren(hourlyInfoContainer);

    for (let i = 0; i < 24; i++) {
      this.appendHourlyInfo(this._weatherData.hourly[i]);
    }
  }

  appendHourlyInfo(hour) {
    if (!hour) return;

    const hourlyInfoTemplate = document.querySelector('.hourly-info-template');
    const hourlyInfoContainer = document.querySelector('.hourly-info-container');

    let clone = hourlyInfoTemplate.content.cloneNode(true);
    clone.querySelector('.hourly-time').textContent = this.getHoursAndMinutes(hour.time);
    clone.querySelector('.hourly-img').src = this.getImgLink(hour.icon);
    clone.querySelector('.hourly-temperature').textContent = `${Math.round(hour.temp)} °${this._weatherData.unit.temp}`;
    hourlyInfoContainer.appendChild(clone);
  }

  populateDailyInfo() {
    const dailyInfoTableBody = document.querySelector('.daily-info-table').querySelector('tbody');
    this.removeElementChildren(dailyInfoTableBody);

    for (let i = 0; i < 7; i++) {
      this.appendDailyInfo(this._weatherData.daily[i]);
    }
  }
  
  appendDailyInfo(day) {
    const dailyWeatherTable = document.querySelector('.daily-info-table');
    const tableBody = dailyWeatherTable.querySelector('tbody');
    let row = tableBody.insertRow();

    let dayCell = row.insertCell();
    dayCell.appendChild(document.createTextNode(`${this.getDayAndMonth(day.time)} – ${this.getWeekday(day.time)}`));
    
    let iconCell = row.insertCell();
    let iconImg = document.createElement('img');
    iconImg.src = this.getImgLink(day.icon)
    iconCell.appendChild(iconImg);

    let tempCell = row.insertCell();
    tempCell.appendChild(document.createTextNode(`${Math.round(day.temp_min)} / ${Math.round(day.temp_max)} °${this._weatherData.unit.temp}`));

    let rainCell = row.insertCell();
    rainCell.appendChild(document.createTextNode(`${Math.round(day.rain_chance * 100)} %`));

    let humidityCell = row.insertCell();
    humidityCell.appendChild(document.createTextNode(`${day.humidity} %`));
  }

  removeElementChildren(el) {
    while (el.lastElementChild) el.removeChild(el.lastElementChild);
  }

  getHoursAndMinutes(time) {
    return new Date(time * 1000).toLocaleString('fi-FI', { hour: '2-digit', minute: '2-digit' });
  }

  getDayAndMonth(time) {
    return new Date(time * 1000).toLocaleString('fi-FI', { day: 'numeric', month: 'numeric'});
  }

  getWeekday(time) {
    return new Date(time * 1000).toLocaleDateString('en-US', { weekday: 'long' });
  }

  getImgLink(icon) {
    return `http://openweathermap.org/img/wn/${icon}@2x.png`;
  }

  isEmpty(object) {
    for (let prop in object) return false;
    return true;
  }
}

const display = new Display();
display.init();