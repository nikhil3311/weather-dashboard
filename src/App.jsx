import { useEffect, useMemo, useRef, useState } from 'react'
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

const hasExplicitTimeZone = (value) => /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
const dateAtLocation = (value, timeZone) => {
  if (value instanceof Date) return value
  if (!value || hasExplicitTimeZone(value) || !timeZone) return new Date(value)
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!match) return new Date(value)
  const [, year, month, day, hour, minute, second = '0'] = match
  const desiredUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
  let timestamp = desiredUtc
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]))
    const locationUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second))
    const correction = desiredUtc - locationUtc
    timestamp += correction
    if (correction === 0) break
  }
  return new Date(timestamp)
}
const formatClock = (value, timeZone, options) => {
  if (value == null) return '--'
  if (typeof value === 'string' && !hasExplicitTimeZone(value)) {
    const match = value.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/)
    if (match) {
      const [, hour, minute, second = '0'] = match
      return new Intl.DateTimeFormat([], { ...options, timeZone: 'UTC' }).format(new Date(Date.UTC(2000, 0, 1, Number(hour), Number(minute), Number(second))))
    }
  }
  return dateAtLocation(value, timeZone).toLocaleTimeString([], { ...options, ...(timeZone ? { timeZone } : {}) })
}
const formatHour = (iso, timeZone) => formatClock(iso, timeZone, { hour: 'numeric' })
const formatDay = (date, index) => index === 0 ? 'Today' : new Date(date.year, date.month - 1, date.day).toLocaleDateString([], { weekday: 'short' })
const celsius = (value, unit) => value == null ? null : unit === 'F' ? Math.round((value * 9) / 5 + 32) : Math.round(value)
const windUnit = (unit) => unit === 'F' ? 'mph' : 'km/h'
const windValue = (value, unit) => value == null ? null : unit === 'F' ? Math.round(value * 0.621371) : Math.round(value)
const greeting = () => { const hour = new Date().getHours(); return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night' }
const dateKey = (date) => `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
const valueOf = (value) => value?.degrees ?? value?.value ?? null
const conditionCode = (condition) => condition?.type || condition?.textCode || 'CLOUDY'
const conditionLabel = (condition) => condition?.description?.text || weatherMeta[conditionCode(condition)]?.[0] || 'Unknown conditions'
const timeLabel = (value, timeZone) => formatClock(value, timeZone, { hour: 'numeric', minute: '2-digit' })
const precipitationPercent = (forecast) => forecast?.precipitation?.probability?.percent ?? forecast?.precipitationProbability?.percent
const precipitationAmount = (forecast) => forecast?.precipitation?.qpf?.quantity ?? forecast?.precipitationAmount
const uvRiskLabel = (value) => value == null ? 'Unavailable' : value < 3 ? 'Low' : value < 6 ? 'Moderate' : value < 8 ? 'High' : value < 11 ? 'Very high' : 'Extreme'
const daylightInfo = (sunrise, sunset, timeZone) => {
  const sunriseMs = dateAtLocation(sunrise, timeZone).getTime()
  const sunsetMs = dateAtLocation(sunset, timeZone).getTime()
  if (!Number.isFinite(sunriseMs) || !Number.isFinite(sunsetMs) || sunsetMs <= sunriseMs) return { duration: '--', progress: 0 }
  const durationMs = sunsetMs - sunriseMs
  const durationMinutes = Math.round(durationMs / 60000)
  return {
    duration: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
    progress: Math.max(0, Math.min(100, ((Date.now() - sunriseMs) / durationMs) * 100)),
  }
}
const openMeteoCondition = (code) => ({ 0: 'CLEAR', 1: 'MOSTLY_CLEAR', 2: 'PARTLY_CLOUDY', 3: 'CLOUDY', 45: 'FOG', 48: 'FOG', 51: 'LIGHT_RAIN', 53: 'LIGHT_RAIN', 55: 'RAIN', 61: 'LIGHT_RAIN', 63: 'RAIN', 65: 'HEAVY_RAIN', 71: 'LIGHT_SNOW', 73: 'SNOW', 75: 'HEAVY_SNOW', 80: 'LIGHT_RAIN_SHOWERS', 81: 'RAIN_SHOWERS', 82: 'HEAVY_RAIN_SHOWERS', 95: 'THUNDERSTORM', 96: 'THUNDERSTORM', 99: 'THUNDERSTORM' })[code] || 'CLOUDY'
const toDisplayDate = (date) => { const [year, month, day] = date.split('-').map(Number); return { year, month, day } }
const immediate24Hours = (hours, timeZone) => {
  const firstStart = hours[0]?.interval?.startTime || ''
  let firstIndex
  if (timeZone && firstStart && !hasExplicitTimeZone(firstStart)) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((part) => [part.type, part.value]))
    const currentHour = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}`
    firstIndex = hours.findIndex((hour) => hour.interval?.startTime?.slice(0, 13) >= currentHour)
  } else {
    const currentHour = new Date()
    currentHour.setMinutes(0, 0, 0)
    firstIndex = hours.findIndex((hour) => new Date(hour.interval?.startTime).getTime() >= currentHour.getTime())
  }
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
  const [searchError, setSearchError] = useState('')
  const [error, setError] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [activeSection, setActiveSection] = useState(() => window.location.hash.slice(1) || 'overview')
  const [lastUpdated, setLastUpdated] = useState(null)
  const locationRequestRef = useRef(0)

  useEffect(() => {
    const updateSection = () => setActiveSection(window.location.hash.slice(1) || 'overview')
    window.addEventListener('hashchange', updateSection)
    return () => window.removeEventListener('hashchange', updateSection)
  }, [])

  useEffect(() => {
    const searchTerm = query.trim()
    if (searchTerm.length < 3) {
      setSuggestions([])
      setSearching(false)
      setSearchError('')
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setSearching(true)
      setSearchError('')
      try {
        const response = await fetch(`${GEO_API}?name=${encodeURIComponent(searchTerm)}&count=6&language=en&format=json`, { signal: controller.signal })
        if (!response.ok) throw new Error('City search is temporarily unavailable.')
        const data = await response.json()
        setSuggestions(data.results || [])
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setSuggestions([])
          setSearchError('Could not search cities. Please try again.')
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  useEffect(() => {
    const requestId = ++locationRequestRef.current
    if (!navigator.geolocation) {
      setError('Location is not supported by this browser. Search for a city to begin.')
      setLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      if (requestId !== locationRequestRef.current) return
      try {
        const response = await fetch(`${REVERSE_GEO_API}?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`)
        const data = await response.json()
        if (requestId !== locationRequestRef.current) return
        setLocation({ name: data.city || data.locality || data.principalSubdivision || 'Current location', admin1: data.principalSubdivision, latitude: coords.latitude, longitude: coords.longitude })
      } catch {
        if (requestId !== locationRequestRef.current) return
        setLocation({ name: 'Current location', latitude: coords.latitude, longitude: coords.longitude })
      }
    }, () => {
      if (requestId !== locationRequestRef.current) return
      setError('Allow location access or search for a city to see local weather.')
      setLoading(false)
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 })
  }, [])

  useEffect(() => {
    if (!location) return
    let active = true
    const loadWeather = async () => {
      setLoading(true)
      setError('')
      try {
        const locationParams = `location.latitude=${location.latitude}&location.longitude=${location.longitude}&unitsSystem=METRIC&key=${GOOGLE_WEATHER_KEY}`
        const googleResponses = GOOGLE_WEATHER_KEY ? await Promise.all([
          fetch(`${CURRENT_API}?${locationParams}`).catch(() => null),
          fetch(`${HOURLY_API}?${locationParams}&hours=24`).catch(() => null),
          fetch(`${DAILY_API}?${locationParams}&days=7`).catch(() => null),
        ]) : []
        let currentData
        let hourlyData
        let dailyData
        let dataSource = 'google'
        let dataTimeZone
        if (googleResponses.length === 3 && googleResponses.every((response) => response?.ok)) {
          ;[currentData, hourlyData, dailyData] = await Promise.all(googleResponses.map((response) => response.json()))
          dataTimeZone = currentData.timeZone?.id || hourlyData.timeZone?.id || dailyData.timeZone?.id
        } else {
          dataSource = 'open-meteo'
          const fallbackParams = new URLSearchParams({ latitude: location.latitude, longitude: location.longitude, timezone: 'auto', current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,visibility,dew_point_2m,cloud_cover,uv_index,precipitation', hourly: 'temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m', daily: 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max,precipitation_sum,relative_humidity_2m_mean,uv_index_max,sunrise,sunset,wind_speed_10m_max,wind_gusts_10m_max' })
          const fallbackResponse = await fetch(`${EXTENDED_DAILY_API}?${fallbackParams}&forecast_days=7`)
          if (!fallbackResponse.ok) throw new Error('Weather service is temporarily unavailable. Please try again shortly.')
          const fallback = await fallbackResponse.json()
          dataTimeZone = fallback.timezone
          currentData = { temperature: { degrees: fallback.current.temperature_2m }, feelsLikeTemperature: { degrees: fallback.current.apparent_temperature }, relativeHumidity: fallback.current.relative_humidity_2m, uvIndex: fallback.current.uv_index, cloudCover: fallback.current.cloud_cover, precipitation: { qpf: { quantity: fallback.current.precipitation, unit: 'MILLIMETERS' } }, weatherCondition: { type: openMeteoCondition(fallback.current.weather_code) }, wind: { speed: { value: fallback.current.wind_speed_10m }, gust: { value: fallback.current.wind_gusts_10m }, direction: { degrees: fallback.current.wind_direction_10m } }, airPressure: { meanSeaLevelMillibars: fallback.current.pressure_msl }, visibility: { distance: fallback.current.visibility / 1000, unit: 'KILOMETERS' }, dewPoint: { degrees: fallback.current.dew_point_2m } }
          hourlyData = { forecastHours: fallback.hourly.time.map((time, index) => ({ interval: { startTime: time }, temperature: { degrees: fallback.hourly.temperature_2m[index] }, feelsLikeTemperature: { degrees: fallback.hourly.apparent_temperature[index] }, precipitation: { probability: { percent: fallback.hourly.precipitation_probability[index] ?? null } }, weatherCondition: { type: openMeteoCondition(fallback.hourly.weather_code[index]) }, wind: { speed: { value: fallback.hourly.wind_speed_10m[index] } } })) }
          dailyData = { forecastDays: [] }
          fallback.daily.time.forEach((date, index) => dailyData.forecastDays.push({ displayDate: toDisplayDate(date), maxTemperature: { degrees: fallback.daily.temperature_2m_max[index] }, minTemperature: { degrees: fallback.daily.temperature_2m_min[index] }, feelsLikeMaxTemperature: { degrees: fallback.daily.apparent_temperature_max[index] }, maxUvIndex: fallback.daily.uv_index_max[index], sunEvents: { sunriseTime: fallback.daily.sunrise[index], sunsetTime: fallback.daily.sunset[index] }, daytimeForecast: { weatherCondition: { type: openMeteoCondition(fallback.daily.weather_code[index]) }, relativeHumidity: fallback.daily.relative_humidity_2m_mean[index], precipitationProbability: { percent: fallback.daily.precipitation_probability_max[index] ?? null }, precipitation: { qpf: { quantity: fallback.daily.precipitation_sum[index], unit: 'MILLIMETERS' } }, wind: { speed: { value: fallback.daily.wind_speed_10m_max[index] }, gust: { value: fallback.daily.wind_gusts_10m_max[index] } } } }))
        }
        let forecastDays = dailyData.forecastDays || []
        if (forecastDays.length < 7) {
          const extendedParams = new URLSearchParams({ latitude: location.latitude, longitude: location.longitude, timezone: 'auto', forecast_days: 7, daily: 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max,precipitation_sum,relative_humidity_2m_mean,uv_index_max,sunrise,sunset,wind_speed_10m_max,wind_gusts_10m_max' })
          const extendedResponse = await fetch(`${EXTENDED_DAILY_API}?${extendedParams}`)
          if (extendedResponse.ok) {
            const extendedData = await extendedResponse.json()
            const existingDates = new Set(forecastDays.map((day) => dateKey(day.displayDate)))
            const additionalDays = extendedData.daily.time.map((date, index) => ({
              displayDate: toDisplayDate(date),
              maxTemperature: { degrees: extendedData.daily.temperature_2m_max[index] },
              minTemperature: { degrees: extendedData.daily.temperature_2m_min[index] },
              feelsLikeMaxTemperature: { degrees: extendedData.daily.apparent_temperature_max[index] },
              maxUvIndex: extendedData.daily.uv_index_max[index],
              sunriseTime: extendedData.daily.sunrise[index],
              sunsetTime: extendedData.daily.sunset[index],
              daytimeForecast: {
                weatherCondition: { type: openMeteoCondition(extendedData.daily.weather_code[index]) },
                relativeHumidity: extendedData.daily.relative_humidity_2m_mean[index],
                precipitationProbability: { percent: extendedData.daily.precipitation_probability_max[index] ?? null },
                precipitation: { qpf: { quantity: extendedData.daily.precipitation_sum[index], unit: 'MILLIMETERS' } },
                wind: { speed: { value: extendedData.daily.wind_speed_10m_max[index] }, gust: { value: extendedData.daily.wind_gusts_10m_max[index] } },
              },
            })).filter((day) => !existingDates.has(dateKey(day.displayDate)))
            forecastDays = [...forecastDays, ...additionalDays].sort((a, b) => dateKey(a.displayDate).localeCompare(dateKey(b.displayDate))).slice(0, 7)
          }
        }
        if (!active) return
        setWeather({ current: currentData, hourly: immediate24Hours(hourlyData.forecastHours || [], dataTimeZone), daily: forecastDays, source: dataSource, timeZone: dataTimeZone })
        setLastUpdated(new Date())
      } catch (requestError) {
        if (active) setError(requestError.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadWeather()
    const refresh = window.setInterval(loadWeather, 300000)
    return () => {
      active = false
      window.clearInterval(refresh)
    }
  }, [location])

  const searchLocations = (event) => {
    event.preventDefault()
    if (suggestions.length > 0) pickLocation(suggestions[0])
  }

  const pickLocation = (nextLocation) => {
    locationRequestRef.current += 1
    setLocation(nextLocation)
    setSelectedDay(null)
    setQuery('')
    setSuggestions([])
    setError('')
  }

  const useCurrentLocation = () => {
    const requestId = ++locationRequestRef.current
    if (!navigator.geolocation) return setError('Location is not supported by this browser.')
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      if (requestId !== locationRequestRef.current) return
      try {
        const response = await fetch(`${REVERSE_GEO_API}?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`)
        const data = await response.json()
        if (requestId !== locationRequestRef.current) return
        setSelectedDay(null)
        setLocation({ name: data.city || data.locality || data.principalSubdivision || 'Current location', admin1: data.principalSubdivision, latitude: coords.latitude, longitude: coords.longitude })
      } catch {
        if (requestId !== locationRequestRef.current) return
        setSelectedDay(null)
        setLocation({ name: 'Current location', latitude: coords.latitude, longitude: coords.longitude })
      }
    }, () => {
      if (requestId === locationRequestRef.current) setError('Allow location access to use your current position.')
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 })
  }

  const hourly = useMemo(() => {
    if (!weather) return []
    return weather.hourly.slice(0, 24).map((hour) => ({
      time: hour.interval?.startTime,
      label: formatHour(hour.interval?.startTime, weather.timeZone),
      temperature: celsius(valueOf(hour.temperature), unit),
      feels: celsius(valueOf(hour.feelsLikeTemperature), unit),
      wind: windValue(valueOf(hour.wind?.speed), unit),
      rain: hour.precipitation?.probability?.percent ?? null,
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
  const currentGust = valueOf(current?.wind?.gust?.speed ?? current?.wind?.gust)
  const currentDirection = current?.wind?.direction?.degrees
  const todayForecast = today?.[0]
  const visibilityDistance = current?.visibility?.distance ?? 0
  const visibilityInKm = current?.visibility?.unit === 'MILES' ? visibilityDistance * 1.60934 : visibilityDistance
  const visibility = current?.visibility?.distance == null ? null : unit === 'F' ? visibilityInKm * 0.621371 : visibilityInKm
  const visibilityUnit = unit === 'F' ? 'mi' : 'km'
  const sunriseTime = todayForecast?.sunEvents?.sunriseTime
  const sunsetTime = todayForecast?.sunEvents?.sunsetTime
  const uvIndex = current?.uvIndex ?? todayForecast?.daytimeForecast?.uvIndex ?? todayForecast?.maxUvIndex
  const daylight = daylightInfo(sunriseTime, sunsetTime, weather?.timeZone)
  const rainProbability = precipitationPercent(todayForecast?.daytimeForecast)
  const currentPrecipitation = precipitationAmount(current)
  const selectedForecast = today?.find((day) => dateKey(day.displayDate) === selectedDay) || today?.[0]
  const activeDay = selectedForecast && dateKey(selectedForecast.displayDate)
  const selectedDaytime = selectedForecast?.daytimeForecast || {}
  const selectedFeelsLike = selectedForecast?.feelsLikeMaxTemperature ?? selectedForecast?.feelsLikeTemperature
  const precipitationUnit = unit === 'F' ? 'in' : 'mm'
  const precipitationScale = unit === 'F' ? 0.0393701 : 1
  const precipitationDigits = unit === 'F' ? 2 : 1
  const dataSourceLabel = weather?.source === 'open-meteo' ? 'Open-Meteo' : weather?.source === 'google' ? 'Google Weather' : 'Weather data'

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="WeatherCheck home">
          <span className="brand-mark"><CloudSun size={25} /></span>
          <span>WeatherCheck<span className="brand-dot">.</span></span>
        </a>
        <nav id="primary-navigation" className={mobileNav ? 'main-nav open' : 'main-nav'}>
          <a className={activeSection === 'overview' ? 'active' : ''} href="#overview" onClick={() => setMobileNav(false)}>Overview</a>
          <a className={activeSection === 'forecast' ? 'active' : ''} href="#forecast" onClick={() => setMobileNav(false)}>7 day forecast</a>
          <a className={activeSection === 'details' ? 'active' : ''} href="#details" onClick={() => setMobileNav(false)}>Details</a>
        </nav>
        <div className="topbar-actions">
          <div className="unit-switch" aria-label="Temperature unit">
            <button className={unit === 'C' ? 'selected' : ''} onClick={() => setUnit('C')}>°C</button>
            <button className={unit === 'F' ? 'selected' : ''} onClick={() => setUnit('F')}>°F</button>
          </div>
          <button className="icon-button menu-button" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation" aria-expanded={mobileNav} aria-controls="primary-navigation">
            {mobileNav ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="overview">
          <div className="hero-copy">
            <p className="eyebrow"><span className="pulse-dot" /> Live conditions</p>
            <h1>{greeting()}<span>.</span></h1>
            <p className="hero-date">{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', ...(weather?.timeZone ? { timeZone: weather.timeZone } : {}) })} <span>•</span> {lastUpdated ? `Updated ${timeLabel(lastUpdated, weather?.timeZone)}` : 'Updating now'}</p>
          </div>
          <form className="search-wrap" onSubmit={searchLocations}>
            <Search size={19} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a city..." aria-label="Search a city" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={query.trim().length >= 3} aria-controls="city-suggestions" />
            {query && <button type="button" className="clear-search" onClick={() => { setQuery(''); setSuggestions([]) }}><X size={15} /></button>}
            <button type="submit" className="search-submit" aria-label="Search">{searching ? '...' : <Search size={17} />}</button>
            {query.trim().length >= 3 && <div className="suggestions" id="city-suggestions" role="listbox" aria-label="City suggestions">
              {searching && <p className="suggestion-message" role="status">Searching cities...</p>}
              {!searching && suggestions.map((item) => <button type="button" role="option" aria-selected="false" key={`${item.id}-${item.latitude}`} onClick={() => pickLocation(item)}><MapPin size={15} /><span>{item.name}<small>{[item.admin1, item.country].filter(Boolean).join(', ')}</small></span></button>)}
              {!searching && searchError && <p className="suggestion-message" role="status">{searchError}</p>}
              {!searching && !searchError && suggestions.length === 0 && <p className="suggestion-message" role="status">No cities found. Try another name.</p>}
            </div>}
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
            <div className="current-temperature">{loading || current?.temperature == null ? '--' : celsius(currentTemperature, unit)}<sup>°</sup></div>
            <div className="condition-title">{currentLabel}</div>
            <div className="feels">Feels like {loading || current?.feelsLikeTemperature == null ? '--' : `${celsius(apparentTemperature, unit)}°`}</div>
            <div className="hi-low"><span><ArrowUp size={14} /> {loading || valueOf(todayForecast?.maxTemperature) == null ? '--' : `${celsius(valueOf(todayForecast.maxTemperature), unit)}°`}</span><span><ArrowDown size={14} /> {loading || valueOf(todayForecast?.minTemperature) == null ? '--' : `${celsius(valueOf(todayForecast.minTemperature), unit)}°`}</span></div>
          </article>
          <article className="metric-panel">
            <div className="metric-card"><span className="metric-icon coral"><Droplets size={18} /></span><div><small>Humidity</small><strong>{loading || current?.relativeHumidity == null ? '--' : `${current.relativeHumidity}%`}</strong><em>{current?.relativeHumidity == null ? 'Relative humidity' : current.relativeHumidity > 70 ? 'High' : current.relativeHumidity < 30 ? 'Low' : 'Comfortable'}</em></div></div>
            <div className="metric-card"><span className="metric-icon blue"><Wind size={18} /></span><div><small>Wind speed</small><strong>{loading || currentWind == null ? '--' : windValue(currentWind, unit)} <b>{windUnit(unit)}</b></strong><em>{loading ? '' : currentDirection == null ? 'Direction unavailable' : `${Math.round(currentDirection)}° ${directionLabel(currentDirection)}`}</em></div></div>
            <div className="metric-card"><span className="metric-icon gold"><Umbrella size={18} /></span><div><small>Chance of rain</small><strong>{loading || rainProbability == null ? '--' : `${rainProbability}%`}</strong><em>{rainProbability == null ? 'Forecast unavailable' : rainProbability > 50 ? 'Rain likely' : rainProbability > 20 ? 'Possible showers' : 'Low chance'}</em></div></div>
            <div className="metric-card"><span className="metric-icon violet"><Gauge size={18} /></span><div><small>Sea-level pressure</small><strong>{loading || current?.airPressure?.meanSeaLevelMillibars == null ? '--' : Math.round(current.airPressure.meanSeaLevelMillibars)} <b>hPa</b></strong><em>Mean sea-level</em></div></div>
          </article>
        </section>

        <section className="content-grid">
          <article className="forecast-panel panel">
            <div className="panel-heading"><div><p className="eyebrow">Next 24 hours</p><h2>Hourly forecast</h2></div><div className="chart-switch"><button className={chartMode === 'temperature' ? 'active' : ''} onClick={() => setChartMode('temperature')}><Thermometer size={14} /> Temperature</button><button className={chartMode === 'wind' ? 'active' : ''} onClick={() => setChartMode('wind')}><Wind size={14} /> Wind</button><button className={chartMode === 'precipitation' ? 'active' : ''} onClick={() => setChartMode('precipitation')}><BarChart3 size={14} /> Rain</button></div></div>
            <div className="chart-area">{loading ? <div className="loading-state">Loading forecast...</div> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 16, right: 6, left: -14, bottom: 0 }}><defs><linearGradient id="temperatureFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff765f" stopOpacity={0.28} /><stop offset="100%" stopColor="#ff765f" stopOpacity={0.02} /></linearGradient><linearGradient id="windFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#327ec1" stopOpacity={0.22} /><stop offset="100%" stopColor="#327ec1" stopOpacity={0.02} /></linearGradient><linearGradient id="rainFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#55a4c9" stopOpacity={0.3} /><stop offset="100%" stopColor="#55a4c9" stopOpacity={0.03} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#dfe7ee" strokeDasharray="4 5" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#8292a4', fontSize: 11 }} interval={2} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8292a4', fontSize: 11 }} unit={chartUnit} width={45} domain={chartMode === 'precipitation' ? [0, 100] : ['auto', 'auto']} /><Tooltip content={<ChartTooltip unit={chartUnit} />} /><Area type="monotone" dataKey={chartKey} stroke={chartMode === 'temperature' ? '#ef6d5a' : chartMode === 'wind' ? '#337cbd' : '#55a4c9'} strokeWidth={2.5} fill={chartMode === 'temperature' ? 'url(#temperatureFill)' : chartMode === 'wind' ? 'url(#windFill)' : 'url(#rainFill)'} dot={{ r: 3, fill: chartMode === 'temperature' ? '#ef6d5a' : chartMode === 'wind' ? '#337cbd' : '#55a4c9', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} /></AreaChart></ResponsiveContainer>}</div>
            <div className="hour-strip">{hourly.map((hour) => <div className="hour-item" key={hour.time}><span>{hour.label}</span><span className="hour-icon">{weatherIcon(hour.code, 22)}</span><strong>{chartMode === 'temperature' ? hour.temperature == null ? '--' : `${hour.temperature}°` : chartMode === 'wind' ? hour.wind == null ? '--' : `${hour.wind} ${windUnit(unit)}` : hour.rain == null ? '--' : `${hour.rain}%`}</strong></div>)}</div>
          </article>
          <article className="sun-panel panel"><div className="panel-heading"><div><p className="eyebrow">Daylight</p><h2>Sunrise & sunset</h2></div><Sunrise size={22} className="heading-icon" /></div><div className="sun-times"><div><span className="sun-icon sunrise"><Sunrise size={22} /></span><small>Sunrise</small><strong>{timeLabel(sunriseTime, weather?.timeZone)}</strong></div><div className="sun-line"><span /><i /><span /></div><div className="sun-times-right"><span className="sun-icon sunset"><Sunset size={22} /></span><small>Sunset</small><strong>{timeLabel(sunsetTime, weather?.timeZone)}</strong></div></div><div className="daylight-bar"><span style={{ width: `${daylight.progress}%` }} /></div><div className="daylight-meta"><span>Daylight <b>{daylight.duration}</b></span><span>UV Index <b>{uvIndex ?? '--'} <em>{uvRiskLabel(uvIndex)}</em></b></span></div><div className="compass"><Compass size={27} /><div><small>Wind direction</small><strong>{loading || currentDirection == null ? '--' : `${Math.round(currentDirection)}°`} <span>{currentDirection == null ? '' : directionLabel(currentDirection)}</span></strong></div><Navigation size={17} style={{ transform: `rotate(${currentDirection ?? 0}deg)` }} /></div></article>
        </section>

        <section className="details-section" id="details" aria-label="Weather details">
          <div className="section-heading"><div><p className="eyebrow">At a glance</p><h2>Weather details</h2></div><span className="updated">More local conditions</span></div>
          <div className="detail-grid">
            <div className="detail-item"><span className="metric-icon coral"><Thermometer size={18} /></span><div><small>Feels like</small><strong>{loading || apparentTemperature == null ? '--' : `${celsius(apparentTemperature, unit)}°`}</strong><em>Apparent temperature</em></div></div>
            <div className="detail-item"><span className="metric-icon blue"><CloudSun size={18} /></span><div><small>Visibility</small><strong>{loading || visibility == null ? '--' : visibility.toFixed(1)} <b>{visibilityUnit}</b></strong><em>Observed range</em></div></div>
            <div className="detail-item"><span className="metric-icon gold"><Droplets size={18} /></span><div><small>Dew point</small><strong>{loading || valueOf(current?.dewPoint) == null ? '--' : `${celsius(valueOf(current.dewPoint), unit)}°`}</strong><em>Moisture in the air</em></div></div>
            <div className="detail-item"><span className="metric-icon violet"><Sunrise size={18} /></span><div><small>UV index</small><strong>{loading || uvIndex == null ? '--' : uvIndex}</strong><em>{uvRiskLabel(uvIndex)}</em></div></div>
            <div className="detail-item"><span className="metric-icon blue"><Wind size={18} /></span><div><small>Wind gusts</small><strong>{loading || currentGust == null ? '--' : windValue(currentGust, unit)} <b>{windUnit(unit)}</b></strong><em>Peak observed gust</em></div></div>
            <div className="detail-item"><span className="metric-icon gold"><Cloud size={18} /></span><div><small>Cloud cover</small><strong>{loading || current?.cloudCover == null ? '--' : `${current.cloudCover}%`}</strong><em>Current sky coverage</em></div></div>
            <div className="detail-item"><span className="metric-icon coral"><Umbrella size={18} /></span><div><small>Precipitation</small><strong>{loading || currentPrecipitation == null ? '--' : (currentPrecipitation * precipitationScale).toFixed(precipitationDigits)} <b>{precipitationUnit}</b></strong><em>Reported amount</em></div></div>
            <div className="detail-item"><span className="metric-icon violet"><Gauge size={18} /></span><div><small>Sea-level pressure</small><strong>{loading || current?.airPressure?.meanSeaLevelMillibars == null ? '--' : Math.round(current.airPressure.meanSeaLevelMillibars)} <b>hPa</b></strong><em>Mean sea-level</em></div></div>
          </div>
        </section>

        <section className="weekly-section" id="forecast">
          <div className="section-heading">
            <div><p className="eyebrow">The week ahead</p><h2>7-day forecast</h2></div>
            <span className="updated">{lastUpdated ? `Updated ${timeLabel(lastUpdated, weather?.timeZone)} · ${dataSourceLabel}` : 'Forecast updates with current conditions'}</span>
          </div>
          {today?.length ? <div className="weekly-grid">
            {today.slice(0, 7).map((day, index) => {
              const key = dateKey(day.displayDate)
              const forecast = day.daytimeForecast || {}
              const probability = precipitationPercent(forecast)
              const date = new Date(day.displayDate.year, day.displayDate.month - 1, day.displayDate.day)
              return <button type="button" className={`day-card ${activeDay === key ? 'selected' : ''}`} key={key} aria-pressed={activeDay === key} aria-controls={activeDay === key ? 'selected-day-details' : undefined} onClick={() => setSelectedDay(key)}>
                <span className="day-card-header"><span className="day-name">{formatDay(day.displayDate, index)}</span><ChevronDown size={15} /></span>
                <span className="day-date">{date.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                <span className="day-icon">{weatherIcon(conditionCode(forecast.weatherCondition), 35)}</span>
                <span className="day-condition">{conditionLabel(forecast.weatherCondition)}</span>
                <span className="day-temps"><strong>{valueOf(day.maxTemperature) == null ? '--' : `${celsius(valueOf(day.maxTemperature), unit)}°`}</strong><span>{valueOf(day.minTemperature) == null ? '--' : `${celsius(valueOf(day.minTemperature), unit)}°`}</span></span>
                <span className="rain-chance"><Droplets size={12} /> {probability == null ? '--' : `${probability}%`}</span>
              </button>
            })}
          </div> : <div className="forecast-empty">{loading ? 'Loading the 7-day forecast...' : 'A 7-day forecast is not available for this location right now.'}</div>}
          {selectedForecast && <article className="selected-day-panel" id="selected-day-details" aria-live="polite">
            <div className="selected-day-heading">
              <div><p className="eyebrow">Selected forecast</p><h3>{new Date(selectedForecast.displayDate.year, selectedForecast.displayDate.month - 1, selectedForecast.displayDate.day).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</h3></div>
              <strong>{conditionLabel(selectedDaytime.weatherCondition)}</strong>
            </div>
            <div className="day-details-grid">
              <div><small>Feels like high</small><strong>{valueOf(selectedFeelsLike) == null ? '--' : `${celsius(valueOf(selectedFeelsLike), unit)}°`}</strong></div>
              <div><small>Wind</small><strong>{valueOf(selectedDaytime.wind?.speed) == null ? '--' : `${windValue(valueOf(selectedDaytime.wind.speed), unit)} ${windUnit(unit)}`}</strong></div>
              <div><small>Wind gust</small><strong>{valueOf(selectedDaytime.wind?.gust) == null ? '--' : `${windValue(valueOf(selectedDaytime.wind.gust), unit)} ${windUnit(unit)}`}</strong></div>
              <div><small>Rain chance</small><strong>{precipitationPercent(selectedDaytime) == null ? '--' : `${precipitationPercent(selectedDaytime)}%`}</strong></div>
              <div><small>Rain forecast</small><strong>{precipitationAmount(selectedDaytime) == null ? '--' : `${(precipitationAmount(selectedDaytime) * precipitationScale).toFixed(precipitationDigits)} ${precipitationUnit}`}</strong></div>
              <div><small>Humidity</small><strong>{selectedDaytime.relativeHumidity == null ? '--' : `${selectedDaytime.relativeHumidity}%`}</strong></div>
              <div><small>UV index</small><strong>{selectedDaytime.uvIndex ?? selectedForecast.maxUvIndex ?? '--'} · {uvRiskLabel(selectedDaytime.uvIndex ?? selectedForecast.maxUvIndex)}</strong></div>
              <div><small>Sunrise</small><strong>{timeLabel(selectedForecast.sunEvents?.sunriseTime || selectedForecast.sunriseTime, weather?.timeZone)}</strong></div>
              <div><small>Sunset</small><strong>{timeLabel(selectedForecast.sunEvents?.sunsetTime || selectedForecast.sunsetTime, weather?.timeZone)}</strong></div>
            </div>
          </article>}
        </section>
      </main>
      <footer><span>WeatherCheck<span className="brand-dot">.</span></span><span>© 2026 Nikhil Patil - All Rights Reserved. | Designed &amp; Developed by Nikhil Patil. For Contact Visit: <a href="https://developwithnikhil.com/" target="_blank" rel="noreferrer">developwithnikhil.com</a></span>{weather?.source && <span className="weather-attribution">Weather data: <a href={weather.source === 'open-meteo' ? 'https://open-meteo.com/' : 'https://developers.google.com/maps/documentation/weather'} target="_blank" rel="noreferrer">{dataSourceLabel}</a></span>}</footer>
    </div>
  )
}

function directionLabel(degrees = 0) { return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(degrees / 45) % 8] }
function ChartTooltip({ active, payload, label, unit }) { if (!active || !payload?.length) return null; return <div className="chart-tooltip"><span>{label}</span><strong>{payload[0].value} {unit}</strong></div> }

export default App
