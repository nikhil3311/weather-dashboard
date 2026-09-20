import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronDown,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Compass,
  Droplets,
  Gauge,
  LocateFixed,
  MapPin,
  Menu,
  Navigation,
  Search,
  Sunrise,
  Sunset,
  Thermometer,
  Umbrella,
  Wind,
  X,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const DEFAULT_LOCATION = null
const GOOGLE_WEATHER_KEY = import.meta.env.VITE_GOOGLE_API_KEY
const CURRENT_API = 'https://weather.googleapis.com/v1/currentConditions:lookup'
const HOURLY_API = 'https://weather.googleapis.com/v1/forecast/hours:lookup'
const DAILY_API = 'https://weather.googleapis.com/v1/forecast/days:lookup'
const GEO_API = 'https://geocoding-api.open-meteo.com/v1/search'
const EXTENDED_DAILY_API = 'https://api.open-meteo.com/v1/forecast'
const REVERSE_GEO_API = 'https://api.bigdatacloud.net/data/reverse-geocode-client'

const weatherMeta = {
  CLEAR: ['Clear sky', 'clear'], MOSTLY_CLEAR: ['Mainly clear', 'clear'], PARTLY_CLOUDY: ['Partly cloudy', 'cloud'], CLOUDY: ['Cloudy', 'cloud'],
  OVERCAST: ['Overcast', 'cloud'], FOG: ['Foggy', 'fog'], LIGHT_RAIN: ['Light rain', 'rain'], RAIN: ['Rain', 'rain'], HEAVY_RAIN: ['Heavy rain', 'rain'],
  LIGHT_SNOW: ['Light snow', 'snow'], SNOW: ['Snow', 'snow'], HEAVY_SNOW: ['Heavy snow', 'snow'], LIGHT_RAIN_SHOWERS: ['Rain showers', 'rain'],
  RAIN_SHOWERS: ['Rain showers', 'rain'], HEAVY_RAIN_SHOWERS: ['Heavy showers', 'rain'], THUNDERSTORM: ['Thunderstorm', 'storm'],
}

const weatherIcon = (code, size = 30) => {
  const type = weatherMeta[code]?.[1] || 'cloud'
  const props = { size, strokeWidth: 1.7 }
  if (type === 'clear') return <CloudSun {...props} />
  if (type === 'rain') return <CloudRain {...props} />
  if (type === 'storm') return <CloudLightning {...props} />
  if (type === 'fog') return <CloudFog {...props} />
  if (type === 'snow') return <CloudDrizzle {...props} />
  return <Cloud {...props} />
}

const formatHour = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric' }).replace(' ', '')
const formatDay = (date, index) => index === 0 ? 'Today' : new Date(date.year, date.month - 1, date.day).toLocaleDateString([], { weekday: 'short' })
const celsius = (value, unit) => unit === 'F' ? Math.round((value * 9) / 5 + 32) : Math.round(value)
const windUnit = (unit) => unit === 'F' ? 'mph' : 'km/h'
const windValue = (value, unit) => unit === 'F' ? Math.round(value * 0.621371) : Math.round(value)
const greeting = () => { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night' }
const dateKey = (date) => `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
const valueOf = (value) => value?.degrees ?? value?.value ?? 0
const conditionCode = (condition) => condition?.type || condition?.textCode || 'CLOUDY'
const conditionLabel = (condition) => condition?.description?.text || weatherMeta[conditionCode(condition)]?.[0] || 'Unknown conditions'
const timeLabel = (value) => value ? new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '--'
const openMeteoCondition = (code) => ({ 0: 'CLEAR', 1: 'MOSTLY_CLEAR', 2: 'PARTLY_CLOUDY', 3: 'CLOUDY', 45: 'FOG', 48: 'FOG', 51: 'LIGHT_RAIN', 53: 'LIGHT_RAIN', 55: 'RAIN', 61: 'LIGHT_RAIN', 63: 'RAIN', 65: 'HEAVY_RAIN', 71: 'LIGHT_SNOW', 73: 'SNOW', 75: 'HEAVY_SNOW', 80: 'LIGHT_RAIN_SHOWERS', 81: 'RAIN_SHOWERS', 82: 'HEAVY_RAIN_SHOWERS', 95: 'THUNDERSTORM', 96: 'THUNDERSTORM', 99: 'THUNDERSTORM' })[code] || 'CLOUDY'
const toDisplayDate = (date) => { const [year, month, day] = date.split('-').map(Number); return { year, month, day } }
const immediate24Hours = (hours) => {
  const currentHour = new Date()
  currentHour.setMinutes(0, 0, 0)
  const firstIndex = hours.findIndex((hour) => new Date(hour.interval?.startTime).getTime() >= currentHour.getTime())
  return hours.slice(firstIndex < 0 ? 0 : firstIndex, (firstIndex < 0 ? 0 : firstIndex) + 24)
}

function App() {
  const [location, setLocation] = useState(DEFAULT_LOCATION)
  const [weather, setWeather] = useState(null)
  const [unit, setUnit] = useState('C')
  const [chartMode, setChartMode] = useState('temperature')
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Location is not supported by this browser. Search for a city to begin.')
      setLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const response = await fetch(`${REVERSE_GEO_API}?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`)
        const data = await response.json()
        setLocation({ name: data.city || data.locality || data.principalSubdivision || 'Current location', admin1: data.principalSubdivision, latitude: coords.latitude, longitude: coords.longitude })
      } catch {
        setLocation({ name: 'Current location', latitude: coords.latitude, longitude: coords.longitude })
      }
    }, () => {
      setError('Allow location access or search for a city to see local weather.')
      setLoading(false)
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 })
  }, [])

  useEffect(() => {
    if (!location) return
    const loadWeather = async () => {
      setLoading(true)
      setError('')
      try {
        if (!GOOGLE_WEATHER_KEY) throw new Error('Weather service configuration is missing.')
        const locationParams = `location.latitude=${location.latitude}&location.longitude=${location.longitude}&key=${GOOGLE_WEATHER_KEY}`
        const [currentResponse, hourlyResponse, dailyResponse] = await Promise.all([
          fetch(`${CURRENT_API}?${locationParams}`),
          fetch(`${HOURLY_API}?${locationParams}&hours=24`),
          fetch(`${DAILY_API}?${locationParams}&days=7`),
        ])
        let currentData
        let hourlyData
        let dailyData
        if ([currentResponse, hourlyResponse, dailyResponse].every((response) => response.ok)) {
          ;[currentData, hourlyData, dailyData] = await Promise.all([currentResponse.json(), hourlyResponse.json(), dailyResponse.json()])
        } else {
          const fallbackParams = new URLSearchParams({ latitude: location.latitude, longitude: location.longitude, timezone: 'auto', current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,visibility,dew_point_2m', hourly: 'temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m', daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset,wind_speed_10m_max' })
          const fallbackResponse = await fetch(`${EXTENDED_DAILY_API}?${fallbackParams}&forecast_days=7`)
          if (!fallbackResponse.ok) throw new Error('Weather service is temporarily unavailable. Please try again shortly.')
          const fallback = await fallbackResponse.json()
          currentData = { temperature: { degrees: fallback.current.temperature_2m }, feelsLikeTemperature: { degrees: fallback.current.apparent_temperature }, relativeHumidity: fallback.current.relative_humidity_2m, weatherCondition: { type: openMeteoCondition(fallback.current.weather_code) }, wind: { speed: { value: fallback.current.wind_speed_10m }, direction: { degrees: fallback.current.wind_direction_10m } }, airPressure: { meanSeaLevelMillibars: fallback.current.surface_pressure }, visibility: { distance: fallback.current.visibility / 1000, unit: 'KILOMETERS' }, dewPoint: { degrees: fallback.current.dew_point_2m } }
          hourlyData = { forecastHours: fallback.hourly.time.map((time, index) => ({ interval: { startTime: time }, temperature: { degrees: fallback.hourly.temperature_2m[index] }, feelsLikeTemperature: { degrees: fallback.hourly.apparent_temperature[index] }, precipitation: { probability: { percent: fallback.hourly.precipitation_probability[index] || 0 } }, weatherCondition: { type: openMeteoCondition(fallback.hourly.weather_code[index]) }, wind: { speed: { value: fallback.hourly.wind_speed_10m[index] } } })) }
          dailyData = { forecastDays: [] }
          fallback.daily.time.forEach((date, index) => dailyData.forecastDays.push({ displayDate: toDisplayDate(date), maxTemperature: { degrees: fallback.daily.temperature_2m_max[index] }, minTemperature: { degrees: fallback.daily.temperature_2m_min[index] }, feelsLikeMaxTemperature: { degrees: fallback.daily.temperature_2m_max[index] }, maxUvIndex: fallback.daily.uv_index_max[index], sunEvents: { sunriseTime: fallback.daily.sunrise[index], sunsetTime: fallback.daily.sunset[index] }, daytimeForecast: { weatherCondition: { type: openMeteoCondition(fallback.daily.weather_code[index]) }, precipitationProbability: { percent: fallback.daily.precipitation_probability_max[index] || 0 }, wind: { speed: { value: fallback.daily.wind_speed_10m_max[index] || 0 } } } }))
        }
        let forecastDays = dailyData.forecastDays || []
        if (forecastDays.length < 7) {
          const extendedParams = new URLSearchParams({ latitude: location.latitude, longitude: location.longitude, timezone: 'auto', forecast_days: 7, daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset,wind_speed_10m_max' })
          const extendedResponse = await fetch(`${EXTENDED_DAILY_API}?${extendedParams}`)
          if (extendedResponse.ok) {
            const extendedData = await extendedResponse.json()
            const existingDates = new Set(forecastDays.map((day) => dateKey(day.displayDate)))
            const additionalDays = extendedData.daily.time.map((date, index) => ({
              displayDate: toDisplayDate(date),
              maxTemperature: { degrees: extendedData.daily.temperature_2m_max[index] },
              minTemperature: { degrees: extendedData.daily.temperature_2m_min[index] },
              feelsLikeTemperature: { degrees: extendedData.daily.temperature_2m_max[index] },
              maxUvIndex: extendedData.daily.uv_index_max[index],
              sunriseTime: extendedData.daily.sunrise[index],
              sunsetTime: extendedData.daily.sunset[index],
              daytimeForecast: {
                weatherCondition: { type: openMeteoCondition(extendedData.daily.weather_code[index]) },
                precipitationProbability: { percent: extendedData.daily.precipitation_probability_max[index] || 0 },
                wind: { speed: { value: extendedData.daily.wind_speed_10m_max[index] || 0 } },
              },
            })).filter((day) => !existingDates.has(dateKey(day.displayDate)))
            forecastDays = [...forecastDays, ...additionalDays].sort((a, b) => dateKey(a.displayDate).localeCompare(dateKey(b.displayDate))).slice(0, 7)
          }
        }
        setWeather({ current: currentData, hourly: immediate24Hours(hourlyData.forecastHours || []), daily: forecastDays })
        setLastUpdated(new Date())
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setLoading(false)
      }
    }
    loadWeather()
    const refresh = window.setInterval(loadWeather, 300000)
    return () => window.clearInterval(refresh)
  }, [location])

  const searchLocations = async (event) => {
    event.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    try {
      const response = await fetch(`${GEO_API}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`)
      const data = await response.json()
      setSuggestions(data.results || [])
    } catch {
      setSuggestions([])
    } finally {
      setSearching(false)
    }
  }

  const pickLocation = (nextLocation) => {
    setLocation(nextLocation)
    setSelectedDay(null)
    setQuery('')
    setSuggestions([])
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return setError('Location is not supported by this browser.')
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const response = await fetch(`${REVERSE_GEO_API}?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`)
        const data = await response.json()
        setLocation({ name: data.city || data.locality || data.principalSubdivision || 'Current location', admin1: data.principalSubdivision, latitude: coords.latitude, longitude: coords.longitude })
      } catch {
        setLocation({ name: 'Current location', latitude: coords.latitude, longitude: coords.longitude })
      }
    }, () => setError('Allow location access to use your current position.'), { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 })
  }

  const hourly = useMemo(() => {
    if (!weather) return []
    return weather.hourly.slice(0, 24).map((hour) => ({
      time: hour.interval?.startTime,
      label: formatHour(hour.interval?.startTime),
      temperature: celsius(valueOf(hour.temperature), unit),
      feels: celsius(valueOf(hour.feelsLikeTemperature), unit),
      wind: windValue(valueOf(hour.wind?.speed), unit),
      rain: hour.precipitation?.probability?.percent || 0,
      code: conditionCode(hour.weatherCondition),
    }))
  }, [weather, unit])

  const current = weather?.current
  const currentLabel = conditionLabel(current?.weatherCondition)
  const today = weather?.daily
  const chartData = hourly
  const chartKey = chartMode === 'temperature' ? 'temperature' : chartMode === 'wind' ? 'wind' : 'rain'
  const chartUnit = chartMode === 'temperature' ? `°${unit}` : chartMode === 'wind' ? windUnit(unit) : '%'
  const currentTemperature = valueOf(current?.temperature)
  const apparentTemperature = valueOf(current?.feelsLikeTemperature)
  const currentWind = valueOf(current?.wind?.speed)
  const currentDirection = current?.wind?.direction?.degrees || 0
  const todayForecast = today?.[0]
  const visibilityDistance = current?.visibility?.distance ?? 0
  const visibilityInKm = current?.visibility?.unit === 'MILES' ? visibilityDistance * 1.60934 : visibilityDistance
  const visibility = unit === 'F' ? visibilityInKm * 0.621371 : visibilityInKm
  const visibilityUnit = unit === 'F' ? 'mi' : 'km'
  const sunriseTime = todayForecast?.sunEvents?.sunriseTime
  const sunsetTime = todayForecast?.sunEvents?.sunsetTime
  const uvIndex = todayForecast?.daytimeForecast?.uvIndex

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="WeatherCheck home">
          <span className="brand-mark"><CloudSun size={25} /></span>
          <span>WeatherCheck<span className="brand-dot">.</span></span>
        </a>
        <nav className={mobileNav ? 'main-nav open' : 'main-nav'}>
          <a className="active" href="#overview" onClick={() => setMobileNav(false)}>Overview</a>
          <a href="#forecast" onClick={() => setMobileNav(false)}>Forecast</a>
          <a href="#details" onClick={() => setMobileNav(false)}>Details</a>
        </nav>
        <div className="topbar-actions">
          <div className="unit-switch" aria-label="Temperature unit">
            <button className={unit === 'C' ? 'selected' : ''} onClick={() => setUnit('C')}>°C</button>
            <button className={unit === 'F' ? 'selected' : ''} onClick={() => setUnit('F')}>°F</button>
          </div>
          <button className="icon-button menu-button" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation">
            {mobileNav ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="overview">
          <div className="hero-copy">
            <p className="eyebrow"><span className="pulse-dot" /> Live conditions</p>
            <h1>{greeting()}<span>.</span></h1>
            <p className="hero-date">{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} <span>•</span> {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Updating now'}</p>
          </div>
          <form className="search-wrap" onSubmit={searchLocations}>
            <Search size={19} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a city..." aria-label="Search a city" />
            {query && <button type="button" className="clear-search" onClick={() => { setQuery(''); setSuggestions([]) }}><X size={15} /></button>}
            <button type="submit" className="search-submit" aria-label="Search">{searching ? '...' : <Search size={17} />}</button>
            {suggestions.length > 0 && <div className="suggestions">{suggestions.map((item) => <button type="button" key={`${item.id}-${item.latitude}`} onClick={() => pickLocation(item)}><MapPin size={15} /><span>{item.name}<small>{[item.admin1, item.country].filter(Boolean).join(', ')}</small></span></button>)}</div>}
          </form>
        </section>

        {error && <div className="error-banner">{error}</div>}
        <section className="location-row">
          <div className="location-name"><MapPin size={17} /><strong>{location?.name || 'Detecting location'}</strong><span>{location?.admin1 || (location?.name === 'Current location' ? 'Current location' : 'Waiting for location')}</span></div>
          <button className="location-button" onClick={useCurrentLocation}><LocateFixed size={16} /> Use my location</button>
        </section>

        <section className="overview-grid">
          <article className="current-card panel-accent">
            <div className="current-top"><span>Now</span><span className="condition-icon">{weatherIcon(conditionCode(current?.weatherCondition), 48)}</span></div>
            <div className="current-temperature">{loading ? '--' : celsius(currentTemperature, unit)}<sup>°</sup></div>
            <div className="condition-title">{currentLabel}</div>
            <div className="feels">Feels like {loading ? '--' : celsius(apparentTemperature, unit)}°</div>
            <div className="hi-low"><span><ArrowUp size={14} /> {loading ? '--' : celsius(valueOf(todayForecast?.maxTemperature), unit)}°</span><span><ArrowDown size={14} /> {loading ? '--' : celsius(valueOf(todayForecast?.minTemperature), unit)}°</span></div>
          </article>
          <article className="metric-panel">
            <div className="metric-card"><span className="metric-icon coral"><Droplets size={18} /></span><div><small>Humidity</small><strong>{loading ? '--' : current?.relativeHumidity}%</strong><em>{current?.relativeHumidity > 70 ? 'High' : 'Comfortable'}</em></div></div>
            <div className="metric-card"><span className="metric-icon blue"><Wind size={18} /></span><div><small>Wind speed</small><strong>{loading ? '--' : windValue(currentWind, unit)} <b>{windUnit(unit)}</b></strong><em>{loading ? '' : `${Math.round(currentDirection)}° direction`}</em></div></div>
            <div className="metric-card"><span className="metric-icon gold"><Umbrella size={18} /></span><div><small>Chance of rain</small><strong>{loading ? '--' : todayForecast?.daytimeForecast?.precipitationProbability?.percent || 0}%</strong><em>{(todayForecast?.daytimeForecast?.precipitationProbability?.percent || 0) > 50 ? 'Bring an umbrella' : 'Very unlikely'}</em></div></div>
            <div className="metric-card"><span className="metric-icon violet"><Gauge size={18} /></span><div><small>Pressure</small><strong>{loading ? '--' : Math.round(current?.airPressure?.meanSeaLevelMillibars || 0)} <b>hPa</b></strong><em>Steady conditions</em></div></div>
          </article>
        </section>

        <section className="content-grid">
          <article className="forecast-panel panel" id="forecast">
            <div className="panel-heading"><div><p className="eyebrow">Next 24 hours</p><h2>Hourly forecast</h2></div><div className="chart-switch"><button className={chartMode === 'temperature' ? 'active' : ''} onClick={() => setChartMode('temperature')}><Thermometer size={14} /> Temperature</button><button className={chartMode === 'wind' ? 'active' : ''} onClick={() => setChartMode('wind')}><Wind size={14} /> Wind</button><button className={chartMode === 'precipitation' ? 'active' : ''} onClick={() => setChartMode('precipitation')}><BarChart3 size={14} /> Rain</button></div></div>
            <div className="chart-area">{loading ? <div className="loading-state">Loading forecast...</div> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 16, right: 6, left: -14, bottom: 0 }}><defs><linearGradient id="temperatureFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff765f" stopOpacity={0.28} /><stop offset="100%" stopColor="#ff765f" stopOpacity={0.02} /></linearGradient><linearGradient id="windFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#327ec1" stopOpacity={0.22} /><stop offset="100%" stopColor="#327ec1" stopOpacity={0.02} /></linearGradient><linearGradient id="rainFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#55a4c9" stopOpacity={0.3} /><stop offset="100%" stopColor="#55a4c9" stopOpacity={0.03} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#dfe7ee" strokeDasharray="4 5" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#8292a4', fontSize: 11 }} interval={2} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8292a4', fontSize: 11 }} unit={chartUnit} width={45} domain={chartMode === 'precipitation' ? [0, 100] : ['auto', 'auto']} /><Tooltip content={<ChartTooltip unit={chartUnit} />} /><Area type="monotone" dataKey={chartKey} stroke={chartMode === 'temperature' ? '#ef6d5a' : chartMode === 'wind' ? '#337cbd' : '#55a4c9'} strokeWidth={2.5} fill={chartMode === 'temperature' ? 'url(#temperatureFill)' : chartMode === 'wind' ? 'url(#windFill)' : 'url(#rainFill)'} dot={{ r: 3, fill: chartMode === 'temperature' ? '#ef6d5a' : chartMode === 'wind' ? '#337cbd' : '#55a4c9', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} /></AreaChart></ResponsiveContainer>}</div>
            <div className="hour-strip">{hourly.map((hour) => <div className="hour-item" key={hour.time}><span>{hour.label}</span><span className="hour-icon">{weatherIcon(hour.code, 22)}</span><strong>{chartMode === 'temperature' ? `${hour.temperature}°` : chartMode === 'wind' ? `${hour.wind} ${windUnit(unit)}` : `${hour.rain}%`}</strong></div>)}</div>
          </article>
          <article className="sun-panel panel" id="details"><div className="panel-heading"><div><p className="eyebrow">Daylight</p><h2>Sunrise & sunset</h2></div><Sunrise size={22} className="heading-icon" /></div><div className="sun-times"><div><span className="sun-icon sunrise"><Sunrise size={22} /></span><small>Sunrise</small><strong>{timeLabel(sunriseTime)}</strong></div><div className="sun-line"><span /><i /><span /></div><div className="sun-times-right"><span className="sun-icon sunset"><Sunset size={22} /></span><small>Sunset</small><strong>{timeLabel(sunsetTime)}</strong></div></div><div className="daylight-bar"><span style={{ width: '68%' }} /></div><div className="daylight-meta"><span>Daylight <b>Local time</b></span><span>UV Index <b>{uvIndex ?? '--'} <em>Moderate</em></b></span></div><div className="compass"><Compass size={27} /><div><small>Wind direction</small><strong>{loading ? '--' : `${Math.round(currentDirection)}°`} <span>{directionLabel(currentDirection)}</span></strong></div><Navigation size={17} style={{ transform: `rotate(${currentDirection}deg)` }} /></div></article>
        </section>

        <section className="details-section" aria-label="Weather details">
          <div className="section-heading"><div><p className="eyebrow">At a glance</p><h2>Weather details</h2></div><span className="updated">More local conditions</span></div>
          <div className="detail-grid">
            <div className="detail-item"><span className="metric-icon coral"><Thermometer size={18} /></span><div><small>Feels like</small><strong>{loading ? '--' : celsius(apparentTemperature, unit)}°</strong><em>Apparent temperature</em></div></div>
            <div className="detail-item"><span className="metric-icon blue"><CloudSun size={18} /></span><div><small>Visibility</small><strong>{loading ? '--' : visibility.toFixed(1)} <b>{visibilityUnit}</b></strong><em>Clear viewing range</em></div></div>
            <div className="detail-item"><span className="metric-icon gold"><Droplets size={18} /></span><div><small>Dew point</small><strong>{loading ? '--' : celsius(valueOf(current?.dewPoint), unit)}°</strong><em>Moisture in the air</em></div></div>
            <div className="detail-item"><span className="metric-icon violet"><Sunrise size={18} /></span><div><small>UV index</small><strong>{loading ? '--' : uvIndex ?? '--'}</strong><em>Peak level today</em></div></div>
          </div>
        </section>

        <section className="weekly-section"><div className="section-heading"><div><p className="eyebrow">The week ahead</p><h2>7-day forecast</h2></div><span className="updated"><span className="pulse-dot" /> Live WeatherCheck data</span></div><div className="weekly-grid">{today?.slice(0, 7).map((day, index) => { const key = dateKey(day.displayDate); const forecast = day.daytimeForecast || {}; return <article className={`day-card ${selectedDay === key ? 'expanded' : ''}`} key={key} onClick={() => setSelectedDay(selectedDay === key ? null : key)}><div className="day-card-header"><span className="day-name">{formatDay(day.displayDate, index)}</span><ChevronDown size={15} /></div><span className="day-date">{new Date(day.displayDate.year, day.displayDate.month - 1, day.displayDate.day).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span><div className="day-icon">{weatherIcon(conditionCode(forecast.weatherCondition), 35)}</div><strong className="day-condition">{conditionLabel(forecast.weatherCondition)}</strong><div className="day-temps"><strong>{celsius(valueOf(day.maxTemperature), unit)}°</strong><span>{celsius(valueOf(day.minTemperature), unit)}°</span></div><div className="rain-chance"><Droplets size={12} /> {forecast.precipitationProbability?.percent || 0}%</div>{selectedDay === key && <div className="day-details"><span>Feels like <b>{celsius(valueOf(day.feelsLikeTemperature), unit)}°</b></span><span>Wind <b>{windValue(valueOf(forecast.wind?.speed), unit)} {windUnit(unit)}</b></span><span>UV index <b>{forecast.uvIndex ?? day.maxUvIndex ?? '--'}</b></span><span>Sunrise <b>{timeLabel(day.sunEvents?.sunriseTime || day.sunriseTime)}</b></span><span>Sunset <b>{timeLabel(day.sunEvents?.sunsetTime || day.sunsetTime)}</b></span></div>}</article> })}</div></section>
      </main>
      <footer><span>WeatherCheck<span className="brand-dot">.</span></span><span>This is Demo Weather Website Project. Developed by Nikhil Patil. For Contact Visit: <a href="https://developwithnikhil.com/" target="_blank" rel="noreferrer">developwithnikhil.com</a></span><span>© {new Date().getFullYear()} developwithnikhil.com by Nikhil Patil</span></footer>
    </div>
  )
}

function directionLabel(degrees = 0) { return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(degrees / 45) % 8] }
function ChartTooltip({ active, payload, label, unit }) { if (!active || !payload?.length) return null; return <div className="chart-tooltip"><span>{label}</span><strong>{payload[0].value} {unit}</strong></div> }

export default App
