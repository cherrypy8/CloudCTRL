// --- Impact Tab Logic ---
document.addEventListener("DOMContentLoaded", function () {
  // Impact tab
  const impactTabBtn = document.querySelector('.tab-btn[data-tab="impact"]');
  const impactTabContent = document.getElementById("tab-impact");
  if (impactTabBtn && impactTabContent) {
    async function fetchImpact() {
      impactTabContent.innerHTML =
        "<div class='desc'><i class='fa-solid fa-spinner fa-spin'></i> Calculating climate impact...</div>";
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
        try {
          const res = await fetch(`/weather/geo?lat=0&lon=0`);
          weather = await res.json();
        } catch {}
      }
      if (!weather || weather.error) {
        impactTabContent.innerHTML = `<div class='error-msg'><i class='fa-solid fa-triangle-exclamation'></i> Could not get weather data.</div>`;
        return;
      }
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
      if (!impactTabContent.classList.contains("active")) {
        fetchImpact();
      }
    });
  } // Chat tab logic

  const chatTabBtn = document.querySelector('.tab-btn[data-tab="chat"]');
  const chatTabContent = document.getElementById("tab-chat");
  let currentWeather = null;

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
    {
      desc: /sun|clear/i,
      advice: "Wear sunglasses and sunscreen if going out.",
    },
    { desc: /cloud/i, advice: "A light jacket may be useful." },
    {
      desc: /storm|thunder/i,
      advice: "Stay indoors if possible. Avoid open areas.",
    },
  ];

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

  function addChatMsg(msg, who = "bot") {
    const chatHistory = document.getElementById("chat-history");
    if (!chatHistory) return;
    const div = document.createElement("div");
    div.className = "chat-msg " + who;
    div.innerText = msg;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  document.addEventListener("submit", async function (e) {
    if (e.target && e.target.id === "chat-form") {
      e.preventDefault();
      const input = document.getElementById("chat-input");
      if (!input || !input.value.trim()) return;
      const userMsg = input.value.trim();
      addChatMsg(userMsg, "user");
      input.value = "";
      addChatMsg("...thinking...", "bot");
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

  if (chatTabBtn) {
    chatTabBtn.addEventListener("click", function () {
      setTimeout(() => {
        const chatHistory = document.getElementById("chat-history");
        if (chatHistory) chatHistory.innerHTML = "";
        addChatMsg(
          "Hi! Ask me about the weather, what to wear, or activities."
        );
      }, 0);
    });
  } // Weather fetch on page load

  const form = document.getElementById("weatherForm");
  const cityInput = document.getElementById("city");
  const resultDiv = document.getElementById("result");
  const btn = document.getElementById("getWeatherBtn");
  const loader = document.getElementById("loader");
  const btnText = btn ? btn.querySelector(".btn-text") : null; // Try to get user's location on load

  if ("geolocation" in navigator && btn && loader && btnText && resultDiv) {
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
          if (data.error) showError(data.error);
          else showWeather(data);
        } catch {
          showError("Could not fetch weather for your location.");
        } finally {
          btn.disabled = false;
          loader.style.visibility = "hidden";
          btnText.style.opacity = "1";
        }
      },
      () => {
        btn.disabled = false;
        loader.style.visibility = "hidden";
        btnText.style.opacity = "1";
        resultDiv.innerHTML = "";
      }
    );
  }

  if (form && cityInput && btn && loader && btnText && resultDiv) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const city = cityInput.value.trim();
      if (!city) return;
      btn.disabled = true;
      loader.style.visibility = "visible";
      btnText.style.opacity = "0.5";
      resultDiv.innerHTML = "";
      try {
        const response = await fetch(`/weather/${encodeURIComponent(city)}`);
        const data = await response.json();
        if (data.error) showError(data.error);
        else showWeather(data);
      } catch {
        showError("Could not fetch weather. Please try again.");
      } finally {
        btn.disabled = false;
        loader.style.visibility = "hidden";
        btnText.style.opacity = "1";
      }
    });
  } // Full Day Weather Section

  const cityFulldayInput = document.getElementById("city-fullday");
  const getFulldayBtn = document.getElementById("getFulldayBtn");
  const loaderFullday = document.getElementById("loader-fullday");
  const fulldayResult = document.getElementById("fullday-result");

  function getIconForDesc(desc, hour) {
    const isDay = hour >= 6 && hour < 18;
    desc = desc.toLowerCase();
    if (desc.includes("sunny") || desc.includes("clear"))
      return isDay ? "01d" : "01n";
    if (desc.includes("partly")) return isDay ? "02d" : "02n";
    if (desc.includes("cloud")) return isDay ? "03d" : "03n";
    if (desc.includes("overcast")) return isDay ? "04d" : "04n";
    if (desc.includes("rain")) return isDay ? "10d" : "10n";
    if (desc.includes("storm") || desc.includes("thunder"))
      return isDay ? "11d" : "11n";
    if (desc.includes("snow")) return isDay ? "13d" : "13n";
    if (desc.includes("mist") || desc.includes("fog"))
      return isDay ? "50d" : "50n";
    return isDay ? "03d" : "03n";
  }

  if (getFulldayBtn && cityFulldayInput && loaderFullday && fulldayResult) {
    getFulldayBtn.addEventListener("click", async function (e) {
      e.preventDefault();
      const city = cityFulldayInput.value.trim();
      if (!city) return;
      getFulldayBtn.disabled = true;
      loaderFullday.style.visibility = "visible";
      fulldayResult.innerHTML = "";
      try {
        const response = await fetch(`/weather/${encodeURIComponent(city)}`);
        const data = await response.json();
        if (data.error) {
          fulldayResult.innerHTML = `<div class="error-msg"><i class="fa-solid fa-triangle-exclamation"></i> ${data.error}</div>`;
        } else {
          const baseTemp = parseFloat(data.temperature);
          const tweaks = ["slightly", "mostly", "partly", "barely", "heavily"];
          let fullday = [];
          for (let h = 0; h < 24; h++) {
            let temp = baseTemp + (Math.random() * 10 - 5);
            let humidity = Math.floor(40 + Math.random() * 50);
            let desc = "";
            if (h >= 6 && h < 11) desc = "clear sky";
            else if (h >= 11 && h < 17) desc = "sunny";
            else if (h >= 17 && h < 20) desc = "partly cloudy";
            else desc = "cloudy";
            if (Math.random() < 0.2) {
              desc = `${
                tweaks[Math.floor(Math.random() * tweaks.length)]
              } ${desc}`;
            }
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
      } catch {
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
    let iconUrl = data.icon
      ? `https://openweathermap.org/img/wn/${data.icon}@4x.png`
      : "";
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
  } // Unified Tabs logic for all tabs

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
    });
  });
});
