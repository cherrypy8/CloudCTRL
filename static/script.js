// --- Impact Tab Logic ---
document.addEventListener("DOMContentLoaded", function () {
  const impactTabBtn = document.querySelector('.tab-btn[data-tab="impact"]');
  const impactTabContent = document.getElementById("tab-impact");
  if (!impactTabBtn || !impactTabContent) return;

  async function fetchImpact() {
    impactTabContent.innerHTML =
      "<div class='desc'><i class='fa-solid fa-spinner fa-spin'></i> Calculating climate impact...</div>";
    let weather = null;
    // Try to get user's geolocation weather
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const res = await fetch(`/weather/geo?lat=${lat}&lon=${lon}`);
        weather = await res.json();
      } catch (e) {}
    }
    if (!weather || weather.error) {
      // fallback: try /weather/geo with dummy coords
      try {
        const res = await fetch(`/weather/geo?lat=0&lon=0`);
        weather = await res.json();
      } catch (e) {}
    }
    if (!weather || weather.error) {
      impactTabContent.innerHTML = `<div class='error-msg'><i class='fa-solid fa-triangle-exclamation'></i> Could not get weather data.</div>`;
      return;
    }
    // Call /impact endpoint
    try {
      const res = await fetch("/impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weather }),
      });
      const data = await res.json();
      if (data.impact1 && data.impact2) {
        impactTabContent.innerHTML = `
          <div class='impact-result'><i class='fa-solid fa-bolt'></i> ${data.impact1}</div>
          <div class='impact-result'><i class='fa-solid fa-bolt'></i> ${data.impact2}</div>
        `;
      } else if (data.impact) {
        impactTabContent.innerHTML = `<div class='impact-result'><i class='fa-solid fa-bolt'></i> ${data.impact}</div>`;
      } else {
        impactTabContent.innerHTML = `<div class='error-msg'><i class='fa-solid fa-triangle-exclamation'></i> ${
          data.error || "Could not get impact."
        }</div>`;
      }
    } catch (e) {
      impactTabContent.innerHTML = `<div class='error-msg'><i class='fa-solid fa-triangle-exclamation'></i> Error contacting server.</div>`;
    }
  }

  impactTabBtn.addEventListener("click", function () {
    // Only fetch if not already active
    if (!impactTabContent.classList.contains("active")) {
      fetchImpact();
    }
  });
});
// --- Impact Tab Logic ---
document.addEventListener("DOMContentLoaded", function () {
  const impactTabBtn = document.querySelector('.tab-btn[data-tab="impact"]');
  const impactTabContent = document.getElementById("tab-impact");
  if (!impactTabBtn || !impactTabContent) return;

  async function fetchImpact() {
    impactTabContent.innerHTML =
      "<div class='desc'><i class='fa-solid fa-spinner fa-spin'></i> Calculating climate impact...</div>";
    // Try to get user's geolocation weather
    let weather = null;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const res = await fetch(`/weather/geo?lat=${lat}&lon=${lon}`);
        weather = await res.json();
      } catch {}
    }
    if (!weather || weather.error) {
      // fallback: try /weather/geo with dummy coords
      try {
        const res = await fetch(`/weather/geo?lat=0&lon=0`);
        weather = await res.json();
      } catch {}
    }
    if (!weather || weather.error) {
      impactTabContent.innerHTML = `<div class='error-msg'><i class='fa-solid fa-triangle-exclamation'></i> Could not get weather data.</div>`;
      return;
    }
    // Call /impact endpoint
    try {
      const res = await fetch("/impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weather }),
      });
      const data = await res.json();
      if (data.impact) {
        impactTabContent.innerHTML = `<div class='impact-result'><i class='fa-solid fa-bolt'></i> ${data.impact}</div>`;
      } else {
        impactTabContent.innerHTML = `<div class='error-msg'><i class='fa-solid fa-triangle-exclamation'></i> ${
          data.error || "Could not get impact."
        }</div>`;
      }
    } catch (e) {
      impactTabContent.innerHTML = `<div class='error-msg'><i class='fa-solid fa-triangle-exclamation'></i> Error contacting server.</div>`;
    }
  }

  impactTabBtn.addEventListener("click", function () {
    // Show and fetch only if not already active
    if (!impactTabContent.classList.contains("active")) {
      fetchImpact();
    }
  });
});
// --- Chat Mode Logic ---
const chatTabBtn = document.querySelector('.tab-btn[data-tab="chat"]');
const chatTabContent = document.getElementById("tab-chat");
let currentWeather = null;

// Clothing and Q&A dataset (very specific, based on temp, humidity, desc)
const clothingAdvice = [
  {
    min: -50,
    max: 5,
    advice: "Wear a heavy coat, gloves, and a warm hat. It's freezing!",
  },
  {
    min: 5,
    max: 15,
    advice: "A jacket or sweater is recommended. It's chilly.",
  },
  {
    min: 15,
    max: 22,
    advice: "A light jacket or long sleeves should be enough.",
  },
  {
    min: 22,
    max: 28,
    advice: "T-shirt and jeans/shorts are fine. Stay hydrated!",
  },
  {
    min: 28,
    max: 100,
    advice: "It's hot! Wear light, breathable clothes and use sunscreen.",
  },
];
const humidityAdvice = [
  {
    min: 0,
    max: 40,
    advice: "Low humidity. Moisturize your skin and drink water.",
  },
  {
    min: 40,
    max: 70,
    advice: "Comfortable humidity. No special precautions needed.",
  },
  {
    min: 70,
    max: 100,
    advice: "High humidity. Wear loose, breathable clothes and stay cool.",
  },
];
const descAdvice = [
  { desc: /rain|shower/i, advice: "Carry an umbrella or raincoat." },
  {
    desc: /snow/i,
    advice: "Wear boots and a warm coat. Roads may be slippery.",
  },
  { desc: /sun|clear/i, advice: "Wear sunglasses and sunscreen if going out." },
  { desc: /cloud/i, advice: "A light jacket may be useful." },
  {
    desc: /storm|thunder/i,
    advice: "Stay indoors if possible. Avoid open areas.",
  },
];

// Call backend /gemini endpoint for chat answers
async function getGeminiResponse(userInput, weather) {
  try {
    const res = await fetch("/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_message: userInput, weather }),
    });
    const data = await res.json();
    if (data.answer) return data.answer.trim();
    if (data.error) return "Sorry, " + data.error;
    return "Sorry, I couldn't get a response from Gemini.";
  } catch (e) {
    return "Sorry, there was an error contacting Gemini.";
  }
}

function isDaytime() {
  // Use local time to determine day/night (simple version)
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18;
}

function getClothingAdvice(w) {
  let temp = parseFloat(w.temperature);
  let hum = parseFloat(w.humidity);
  let tempAdv =
    clothingAdvice.find((a) => temp >= a.min && temp < a.max)?.advice ||
    "Dress comfortably.";
  let humAdv =
    humidityAdvice.find((a) => hum >= a.min && hum < a.max)?.advice || "";
  let descAdv =
    descAdvice.find((a) => w.description.match(a.desc))?.advice || "";
  return [tempAdv, humAdv, descAdv].filter(Boolean).join(" ");
}
function suggestActivity(w) {
  if (/rain|storm|thunder/i.test(w.description))
    return "Maybe enjoy a book or movie indoors.";
  if (/sun|clear/i.test(w.description) && parseFloat(w.temperature) > 20)
    return "Great time for a walk or outdoor activity!";
  if (/cloud/i.test(w.description))
    return "A nice day for a coffee or a stroll.";
  return "Stay comfortable and enjoy your day!";
}

async function fetchCurrentWeatherForChat() {
  // Use backend endpoint for current location (geo)
  try {
    const res = await fetch("/weather/geo");
    const data = await res.json();
    if (!data.error) currentWeather = data;
  } catch {}
}

function addChatMsg(msg, who = "bot") {
  const chatHistory = document.getElementById("chat-history");
  if (!chatHistory) return;
  const div = document.createElement("div");
  div.className = "chat-msg " + who;
  div.innerText = msg;
  chatHistory.appendChild(div);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Chat form submit logic for free-text chat
document.addEventListener("submit", async function (e) {
  if (e.target && e.target.id === "chat-form") {
    e.preventDefault();
    const input = document.getElementById("chat-input");
    if (!input || !input.value.trim()) return;
    const userMsg = input.value.trim();
    addChatMsg(userMsg, "user");
    input.value = "";
    addChatMsg("...thinking...", "bot");
    // Always fetch latest weather for each question
    let weather = null;
    try {
      const res = await fetch("/weather/geo");
      const data = await res.json();
      if (!data.error) weather = data;
    } catch {}
    if (!weather) {
      const chatHistory = document.getElementById("chat-history");
      const thinkingMsg = chatHistory
        ? chatHistory.querySelector(".chat-msg.bot:last-child")
        : null;
      if (thinkingMsg)
        thinkingMsg.innerText = "Sorry, couldn't fetch the weather.";
      return;
    }
    const chatHistory = document.getElementById("chat-history");
    const thinkingMsg = chatHistory
      ? chatHistory.querySelector(".chat-msg.bot:last-child")
      : null;
    const answer = await getGeminiResponse(userMsg, weather);
    if (thinkingMsg) thinkingMsg.innerText = answer;
  }
});

// Activate chat mode: clear chat on open
if (chatTabBtn) {
  chatTabBtn.addEventListener("click", function () {
    setTimeout(() => {
      const chatHistory = document.getElementById("chat-history");
      if (chatHistory) chatHistory.innerHTML = "";
      addChatMsg("Hi! Ask me about the weather, what to wear, or activities.");
    }, 0);
  });
}
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("weatherForm");
  const cityInput = document.getElementById("city");
  const resultDiv = document.getElementById("result");
  const btn = document.getElementById("getWeatherBtn");
  const loader = document.getElementById("loader");
  const btnText = btn.querySelector(".btn-text");

  // Try to get user's location on load
  if ("geolocation" in navigator) {
    btn.disabled = true;
    loader.style.visibility = "visible";
    btnText.style.opacity = "0.5";
    resultDiv.innerHTML =
      "<div class='desc'><i class='fa-solid fa-location-crosshairs'></i> Detecting your location...</div>";
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          const response = await fetch(`/weather/geo?lat=${lat}&lon=${lon}`);
          const data = await response.json();
          if (data.error) {
            showError(data.error);
          } else {
            showWeather(data);
          }
        } catch (err) {
          showError("Could not fetch weather for your location.");
        } finally {
          btn.disabled = false;
          loader.style.visibility = "hidden";
          btnText.style.opacity = "1";
        }
      },
      () => {
        // If user denies or error, just enable UI
        btn.disabled = false;
        loader.style.visibility = "hidden";
        btnText.style.opacity = "1";
        resultDiv.innerHTML = "";
      }
    );
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (!city) return;

    // UI: Show loader
    btn.disabled = true;
    loader.style.visibility = "visible";
    btnText.style.opacity = "0.5";
    resultDiv.innerHTML = "";

    try {
      const response = await fetch(`/weather/${encodeURIComponent(city)}`);
      const data = await response.json();

      if (data.error) {
        showError(data.error);
      } else {
        showWeather(data);
      }
    } catch (err) {
      showError("Could not fetch weather. Please try again.");
    } finally {
      btn.disabled = false;
      loader.style.visibility = "hidden";
      btnText.style.opacity = "1";
    }
  });

  // Unified Tabs logic for all tabs (including story)
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      const tabId = "tab-" + btn.dataset.tab;
      const content = document.getElementById(tabId);
      if (content) content.classList.add("active");
      // Special logic: render stories if story tab is activated
      if (btn.dataset.tab === "story") {
        if (typeof showStoriesWhatsAppStyle === "function") {
          showStoriesWhatsAppStyle();
        }
      }
    });
  });

  // Full Day Weather Section
  const cityFulldayInput = document.getElementById("city-fullday");
  const getFulldayBtn = document.getElementById("getFulldayBtn");
  const loaderFullday = document.getElementById("loader-fullday");
  const fulldayResult = document.getElementById("fullday-result");

  // Helper: Map desc/hour to OpenWeatherMap icon code
  function getIconForDesc(desc, hour) {
    const isDay = hour >= 6 && hour < 18;
    desc = desc.toLowerCase();
    if (desc.includes("sunny") || desc.includes("clear")) {
      return isDay ? "01d" : "01n";
    }
    if (desc.includes("partly")) {
      return isDay ? "02d" : "02n";
    }
    if (desc.includes("cloud")) {
      return isDay ? "03d" : "03n";
    }
    if (desc.includes("overcast")) {
      return isDay ? "04d" : "04n";
    }
    if (desc.includes("rain")) {
      return isDay ? "10d" : "10n";
    }
    if (desc.includes("storm") || desc.includes("thunder")) {
      return isDay ? "11d" : "11n";
    }
    if (desc.includes("snow")) {
      return isDay ? "13d" : "13n";
    }
    if (desc.includes("mist") || desc.includes("fog")) {
      return isDay ? "50d" : "50n";
    }
    // Default to clouds
    return isDay ? "03d" : "03n";
  }

  if (getFulldayBtn) {
    getFulldayBtn.addEventListener("click", async function (e) {
      e.preventDefault();
      const city = cityFulldayInput.value.trim();
      if (!city) return;
      getFulldayBtn.disabled = true;
      loaderFullday.style.visibility = "visible";
      fulldayResult.innerHTML = "";
      try {
        // Fetch current weather as base
        const response = await fetch(`/weather/${encodeURIComponent(city)}`);
        const data = await response.json();
        if (data.error) {
          fulldayResult.innerHTML = `<div class="error-msg"><i class="fa-solid fa-triangle-exclamation"></i> ${data.error}</div>`;
        } else {
          // Generate 24 hours of data with random variations
          const baseTemp = parseFloat(data.temperature);
          const tweaks = ["slightly", "mostly", "partly", "barely", "heavily"];
          let fullday = [];
          for (let h = 0; h < 24; h++) {
            let temp = baseTemp + (Math.random() * 10 - 5);
            let humidity = Math.floor(40 + Math.random() * 50);

            // Set desc based on hour
            let desc = "";
            if (h >= 6 && h < 11) {
              desc = "clear sky";
            } else if (h >= 11 && h < 17) {
              desc = "sunny";
            } else if (h >= 17 && h < 20) {
              desc = "partly cloudy";
            } else {
              desc = "cloudy";
              document.addEventListener("DOMContentLoaded", function () {
                // Voice tab elements
                const voiceTabBtn = document.querySelector(
                  '.tab-btn[data-tab="voice"]'
                );
                const voiceTabContent = document.getElementById("tab-voice");
                const recordBtn = document.getElementById("voice-record-btn");
                const stopBtn = document.getElementById("voice-stop-btn");
                // Upload and text input removed for streamlined UI
                const statusDiv = document.getElementById("voice-status");
                const chatHistory =
                  document.getElementById("voice-chat-history");
                const audioPlayer =
                  document.getElementById("voice-audio-player");
                let mediaRecorder = null;
                let audioChunks = [];
                let lastWeather = null;

                // Helper: fetch current weather (geo)
                async function fetchWeatherForVoice() {
                  try {
                    const res = await fetch("/weather/geo?lat=0&lon=0"); // fallback if no geolocation
                    const data = await res.json();
                    if (!data.error) return data;
                  } catch {}
                  return null;
                }

                // Helper: get user's real geolocation
                function getGeoWeather() {
                  return new Promise((resolve) => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                          const lat = pos.coords.latitude;
                          const lon = pos.coords.longitude;
                          try {
                            const res = await fetch(
                              `/weather/geo?lat=${lat}&lon=${lon}`
                            );
                            const data = await res.json();
                            if (!data.error) return resolve(data);
                          } catch {}
                          resolve(null);
                        },
                        () => resolve(null)
                      );
                    } else {
                      resolve(null);
                    }
                  });
                }

                // Helper: add message to chat history
                function addVoiceMsg(msg, who = "bot") {
                  if (!chatHistory) return;
                  const div = document.createElement("div");
                  div.className = "chat-msg " + who;
                  div.innerText = msg;
                  chatHistory.appendChild(div);
                  chatHistory.scrollTop = chatHistory.scrollHeight;
                }

                // Helper: play base64 audio
                function playAudio(b64) {
                  if (!audioPlayer) return;
                  audioPlayer.src = "data:audio/wav;base64," + b64;
                  audioPlayer.style.display = "block";
                  audioPlayer.play();
                }

                // Send audio or text to /indra-voice
                async function sendVoiceRequest({
                  audioBlob = null,
                  text = null,
                }) {
                  statusDiv.innerHTML =
                    "<i class='fa-solid fa-spinner fa-spin'></i> Thinking...";
                  let weather = lastWeather;
                  if (!weather) weather = await getGeoWeather();
                  if (!weather) weather = await fetchWeatherForVoice();
                  if (!weather) {
                    statusDiv.innerHTML =
                      "<span style='color:red'>Could not get weather data.</span>";
                    return;
                  }
                  lastWeather = weather;
                  let formData = new FormData();
                  if (audioBlob) {
                    formData.append("audio", audioBlob, "audio.wav");
                  }
                  if (text) {
                    formData.append("user_text", text);
                  }
                  formData.append("weather", JSON.stringify(weather));
                  try {
                    const res = await fetch("/indra-voice", {
                      method: "POST",
                      body: formData,
                    });
                    const data = await res.json();
                    statusDiv.innerHTML = "";
                    if (data.error) {
                      addVoiceMsg("Error: " + data.error, "bot");
                      return;
                    }
                    if (data.answer) addVoiceMsg(data.answer, "bot");
                    if (data.audio_b64) playAudio(data.audio_b64);
                  } catch (e) {
                    statusDiv.innerHTML =
                      "<span style='color:red'>Error contacting server.</span>";
                  }
                }

                // Recording logic
                if (recordBtn && stopBtn) {
                  let stream = null;
                  recordBtn.addEventListener("click", async function () {
                    if (!navigator.mediaDevices || !window.MediaRecorder) {
                      statusDiv.innerHTML =
                        "<span style='color:red'>Audio recording not supported in this browser.</span>";
                      return;
                    }
                    stream = await navigator.mediaDevices.getUserMedia({
                      audio: true,
                    });
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];
                    mediaRecorder.ondataavailable = (e) => {
                      if (e.data.size > 0) audioChunks.push(e.data);
                    };
                    mediaRecorder.onstop = async () => {
                      const audioBlob = new Blob(audioChunks, {
                        type: "audio/wav",
                      });
                      addVoiceMsg("[Voice message sent]", "user");
                      await sendVoiceRequest({ audioBlob });
                      stream.getTracks().forEach((t) => t.stop());
                    };
                    mediaRecorder.start();
                    recordBtn.style.display = "none";
                    stopBtn.style.display = "inline-block";
                    statusDiv.innerHTML =
                      "<i class='fa-solid fa-microphone'></i> Recording...";
                  });
                  stopBtn.addEventListener("click", function () {
                    if (mediaRecorder && mediaRecorder.state === "recording") {
                      mediaRecorder.stop();
                    }
                    recordBtn.style.display = "inline-block";
                    stopBtn.style.display = "none";
                    statusDiv.innerHTML = "";
                  });
                }

                // Upload and text input logic removed

                // Clear chat/audio on tab open
                if (voiceTabBtn) {
                  voiceTabBtn.addEventListener("click", function () {
                    if (chatHistory) chatHistory.innerHTML = "";
                    if (audioPlayer) {
                      audioPlayer.src = "";
                      audioPlayer.style.display = "none";
                    }
                    if (statusDiv) statusDiv.innerHTML = "";
                  });
                }
              });
            }

            // Optionally, randomly tweak the description
            if (Math.random() < 0.2) {
              desc = `${
                tweaks[Math.floor(Math.random() * tweaks.length)]
              } ${desc}`;
            }

            // Get icon code for this desc/hour
            const iconCode = getIconForDesc(desc, h);
            const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

            fullday.push({
              time: h.toString().padStart(2, "0") + ":00",
              temp_c: temp.toFixed(1),
              humidity: humidity,
              icon: iconUrl,
              condition: desc,
            });
          }
          renderFullday(fullday, city);
        }
      } catch (err) {
        fulldayResult.innerHTML = `<div class="error-msg"><i class="fa-solid fa-triangle-exclamation"></i> Could not fetch full day weather.</div>`;
      } finally {
        getFulldayBtn.disabled = false;
        loaderFullday.style.visibility = "hidden";
      }
    });
  }

  function renderFullday(fullday, city) {
    if (!fullday || !fullday.length) {
      fulldayResult.innerHTML = `<div class="error-msg"><i class="fa-solid fa-triangle-exclamation"></i> No full day data available.</div>`;
      return;
    }
    let html = `<div class="desc" style="margin-bottom:0.7rem;display:none;"><b><i class="fa-solid fa-location-dot"></i> ${city}</b> - Full Day Weather</div>`;
    html += `<div class="fullday-scroll">`;
    fullday.forEach((h) => {
      html += `
      <div class="fullday-card">
        <div class="hour"><i class="fa-solid fa-clock"></i> ${h.time}</div>
        <img src="${h.icon}" alt="${h.condition}" />
        <div class="temp"><i class="fa-solid fa-temperature-half"></i> ${parseFloat(
          h.temp_c
        ).toFixed(1)}°C</div>
        <div class="desc">${h.condition}</div>
        <div class="humidity"><i class="fa-solid fa-droplet"></i> ${
          h.humidity
        }%</div>
      </div>
    `;
    });
    html += `</div>`;
    fulldayResult.innerHTML = html;
  }

  function showWeather(data) {
    // Use OpenWeatherMap icon if available
    let iconUrl = data.icon
      ? `https://openweathermap.org/img/wn/${data.icon}@4x.png`
      : "";

    // Use "Current Location" if city is missing, empty, or generic
    let cityName =
      data.city && data.city.toLowerCase() !== "geo" && data.city.trim() !== ""
        ? data.city
        : "Current Location";

    resultDiv.innerHTML = `
      <div class="weather-card">
        <h2><i class="fa-solid fa-location-dot"></i> ${cityName}</h2>
        ${iconUrl ? `<img src="${iconUrl}" alt="${data.description}" />` : ""}
        <div class="temp"><i class="fa-solid fa-temperature-half"></i> ${parseFloat(
          data.temperature
        ).toFixed(1)}°C</div>
        <div class="desc">${data.description}</div>
      </div>
    `;
  }

  function showError(msg) {
    resultDiv.innerHTML = `<div class="error-msg"><i class="fa-solid fa-triangle-exclamation"></i> ${msg}</div>`;
  }

  // --- Simple Stories Render ---
  const ALL_STORIES = [
    {
      name: "Aarav",
      quote: "Bright days, brighter smiles!",
      img: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=400&q=80", // sunny sky
      time: "Today, 8:00 AM",
    },
    {
      name: "Priya",
      quote: "Rainy mood, cozy vibes.",
      img: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=400&q=80", // rain
      time: "Today, 9:15 AM",
    },
    {
      name: "Rohan",
      quote: "Clouds above, peace within.",
      img: "https://images.unsplash.com/photo-1465378552210-88481e0b7c33?auto=format&fit=crop&w=400&q=80", // clouds
      time: "Today, 10:30 AM",
    },
    {
      name: "Meera",
      quote: "Sunset chaser.",
      img: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=400&q=80", // sunset
      time: "Today, 11:45 AM",
    },
    {
      name: "Kabir",
      quote: "Let’s weather the storm together.",
      img: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80", // storm
      time: "Today, 12:30 PM",
    },
    {
      name: "Saanvi",
      quote: "After rain, comes the rainbow.",
      img: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=400&q=80", // rainbow
      time: "Today, 1:20 PM",
    },
    {
      name: "Dev",
      quote: "Let’s dance in the rain!",
      img: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80", // rain
      time: "Today, 2:10 PM",
    },
    {
      name: "Ishaan",
      quote: "Feeling the rain, loving the moment.",
      img: "https://images.unsplash.com/photo-1464013778555-8e723c2f01f8?auto=format&fit=crop&w=400&q=80", // rain
      time: "Today, 3:00 PM",
    },
    {
      name: "Anaya",
      quote: "Golden hour, golden memories.",
      img: "https://images.unsplash.com/photo-1465156799763-2c087c332922?auto=format&fit=crop&w=400&q=80", // golden hour
      time: "Today, 4:00 PM",
    },
    {
      name: "Yash",
      quote: "Let it rain, let it flow.",
      img: "https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=400&q=80", // rain
      time: "Today, 5:00 PM",
    },
  ];

  function getRandomStories(arr, n) {
    const shuffled = arr.slice().sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
  }

  // WhatsApp-style Story Viewer Logic
  let storyState = {
    stories: [],
    current: 0,
    timer: null,
    duration: 5000,
    running: false,
  };

  function renderStoryViewer() {
    const viewer = document.getElementById("story-viewer");
    if (!viewer) return;
    const { stories, current } = storyState;
    if (!stories.length) {
      viewer.innerHTML = `<div class="story-placeholder" style="padding:2.5em 1em;text-align:center;font-size:1.1em;color:#888;">
        <i class='fa-solid fa-person-digging' style='font-size:2em;display:block;margin-bottom:0.5em;'></i>
        Work in progress...<br>Thanks for your patience!
      </div>`;
      return;
    }
    const story = stories[current];
    // Progress bars
    let progressHtml = '<div class="story-progress">';
    for (let i = 0; i < stories.length; i++) {
      progressHtml += `<div class="story-progress-bar"><div class="story-progress-bar-inner" id="progress-bar-${i}"></div></div>`;
    }
    progressHtml += "</div>";
    // Main story UI
    viewer.innerHTML = `
      <img src="${story.img}" class="story-bg" alt="${story.name}" />
      <div class="story-overlay">
        ${progressHtml}
        <div class="story-header">
          <div class="story-header-name">${story.name}</div>
        </div>
        <div class="story-desc">${story.quote}</div>
      </div>
      <div class="story-nav-area story-nav-left"></div>
      <div class="story-nav-area story-nav-right"></div>
    `;
    // Animate progress
    for (let i = 0; i < stories.length; i++) {
      const bar = document.getElementById(`progress-bar-${i}`);
      if (bar) {
        if (i < current) bar.style.width = "100%";
        else if (i === current) bar.style.width = "0%";
        else bar.style.width = "0%";
      }
    }
    setTimeout(() => animateProgress(current), 50);
    // Navigation
    const left = viewer.querySelector(".story-nav-left");
    const right = viewer.querySelector(".story-nav-right");
    if (left)
      left.onclick = () => {
        stopStoryTimer();
        prevStory();
      };
    if (right)
      right.onclick = () => {
        stopStoryTimer();
        nextStory();
      };
  }

  function animateProgress(idx) {
    const bar = document.getElementById(`progress-bar-${idx}`);
    if (!bar) return;
    bar.style.transition = `width ${storyState.duration}ms linear`;
    bar.style.width = "100%";
  }

  function startStoryTimer() {
    stopStoryTimer();
    storyState.running = true;
    storyState.timer = setTimeout(() => {
      nextStory();
    }, storyState.duration);
  }

  function stopStoryTimer() {
    if (storyState.timer) clearTimeout(storyState.timer);
    storyState.timer = null;
    storyState.running = false;
  }

  function nextStory() {
    if (!storyState.stories.length) return;
    storyState.current = (storyState.current + 1) % storyState.stories.length;
    renderStoryViewer();
    startStoryTimer();
  }

  function prevStory() {
    if (!storyState.stories.length) return;
    storyState.current =
      (storyState.current - 1 + storyState.stories.length) %
      storyState.stories.length;
    renderStoryViewer();
    startStoryTimer();
  }

  function showStoriesWhatsAppStyle() {
    storyState.stories = getRandomStories(ALL_STORIES, 5);
    storyState.current = 0;
    renderStoryViewer();
    startStoryTimer();
  }

  // On page load, if story tab is active, render stories
  const storyTabContent = document.getElementById("tab-story");
  if (storyTabContent && storyTabContent.classList.contains("active")) {
    if (typeof showStoriesWhatsAppStyle === "function") {
      showStoriesWhatsAppStyle();
    }
  }
});
