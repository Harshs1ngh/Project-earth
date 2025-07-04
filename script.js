let scene, camera, renderer, controls, earth, galaxy;
let isZooming = false;

const countryCoords = {
  india: [78.9629, 20.5937],
  us: [-95.7129, 37.0902],
  russia: [40.3188, 60.5240],
  uk: [-30.4360, 55.3781],
  canada: [-106.3468, 56.1304],
  australia: [30.7751, -25.2744],
  africa: [130.0936, 7.1881],
  china: [60.1954, 35.8617],
  brazil: [-151.9253, -14.2350],
  germany: [140.4515, 51.1657],
  france: [160.2137, 46.2276],
  japan: [30.2529, 36.2048],
  southkorea: [40.7669, 35.9078],
  italy: [140.5674, 41.8719],
  mexico: [-102.5528, 23.6345],
  argentina: [-63.6167, -38.4161],
  southafrica: [22.9375, -30.5595],
};

init();
animate();

function init() {
  const canvas = document.getElementById("webgl");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 2.2;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 3, 6);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);
  controls.update();

  const ambient = new THREE.AmbientLight(0xffffff, 2.5);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 3);
  directional.position.set(5, 2, 5);
  scene.add(directional);

  const loader = new THREE.GLTFLoader();

  // Load Earth
  loader.load("earth.glb", function (gltf) {
    earth = gltf.scene;
    earth.scale.set(2.2, 2.2, 2.4);
    earth.rotation.y = 0;
    scene.add(earth);

    // Glow effect
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        "c": { type: "f", value: 2.8 },
        "p": { type: "f", value: 2.5 },
        glowColor: { type: "c", value: new THREE.Color(0x00bfff) },
        viewVector: { type: "v3", value: camera.position }
      },
      vertexShader: `
        uniform vec3 viewVector;
        uniform float c;
        uniform float p;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormView = normalize(normalMatrix * viewVector - modelViewMatrix * vec4(position, 1.0)).xyz;
          intensity = pow(c - dot(vNormal, vNormView), p);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          gl_FragColor = vec4(glowColor * intensity, 1.0);
        }`,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });

    const glowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(3.0, 50, 50),
      glowMaterial
    );
    scene.add(glowMesh);
  });

  // Load Galaxy background
  loader.load("galaxy.glb", function (gltf) {
    galaxy = gltf.scene;
    galaxy.scale.set(100, 100, 100); // Size up to surround Earth
    galaxy.rotation.y = 0;

    // Dim galaxy brightness
    galaxy.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.color.multiplyScalar(0.2); // darker
        if (child.material.emissive) {
          child.material.emissive.multiplyScalar(0.1); // dim glow
        }
      }
    });

    scene.add(galaxy);
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function animate() {
  requestAnimationFrame(animate);
  if (!isZooming) {
    if (earth) earth.rotation.y += 0.002;
    if (galaxy) galaxy.rotation.y += 0.002;
  }
  controls.update();
  renderer.render(scene, camera);
}

const apiCountryNames = {
  us: "united states",
  uk: "united kingdom",
  africa: "nigeria", // or pick a country in Africa
  china: "china",
  southkorea: "south korea",
  india: "india",
  russia: "russia",
  canada: "canada",
  australia: "australia",
  brazil: "brazil",
  germany: "germany",
  france: "france",
  japan: "japan",
  italy: "italy",
  mexico: "mexico",
  argentina: "argentina",
  southafrica: "south africa"
};

async function zoomToCountry() {
  const country = document.getElementById("countrySelect").value.toLowerCase();
  if (!country || !countryCoords[country] || !earth) return;

  // 🌍 Smooth camera zoom
  const [lng, lat] = countryCoords[country];
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 215) * Math.PI / 180;
  const radius = 4.2;
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const currentRotation = earth.rotation.y;
  const cosR = Math.cos(currentRotation);
  const sinR = Math.sin(currentRotation);
  const rotatedX = x * cosR + z * sinR;
  const rotatedZ = -x * sinR + z * cosR;
  const target = new THREE.Vector3(rotatedX, y, rotatedZ);

  isZooming = true;
  let t = 0;
  const duration = 60;
  const startPos = camera.position.clone();

  function smoothZoom() {
    if (t < 1) {
      t += 1 / duration;
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(startPos, target, ease);
      camera.lookAt(new THREE.Vector3(0, 0, 0));
      requestAnimationFrame(smoothZoom);
    } else {
      isZooming = true;
    }
  }

  smoothZoom();

  // 📡 Fetch country + weather data
  try {
    const apiName = apiCountryNames[country] || country;
    const countryInfoRes = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(apiName)}?fullText=true`);

    const countryInfoData = await countryInfoRes.json();
    const countryInfo = countryInfoData[0];

    const capital = countryInfo.capital?.[0] || "N/A";
    const population = countryInfo.population?.toLocaleString() || "N/A";
    const timezone = countryInfo.timezones?.[0] || "N/A";
    const flag = countryInfo.flags?.png || "";
    const latlng = countryInfo.latlng;

    // 🌦️ Real-time weather using lat/lon of capital
    const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latlng[0]}&lon=${latlng[1]}&appid=df83d9ad8fb63535e2dece792e6ef6d3&units=metric`);
    const weatherData = await weatherRes.json();

    const temp = Math.round(weatherData.main.temp);
    const condition = weatherData.weather[0].main;
    const weather = `${temp}°C, ${condition}`;

    const data = {
      name: countryInfo.name.common,
      weather,
      capital,
      population,
      timezone,
      flag
    };

    showInfoCard(data);

  } catch (error) {
    console.error("Failed to fetch real data:", error);
    alert("Error fetching country or weather data.");
  }
}


function resetCamera() {
  hideCard();
  if (!camera) return;

  isZooming = true;
  let t = 0;
  const duration = 60;
  const startPos = camera.position.clone();
  const defaultPos = new THREE.Vector3(0, 3, 6);

  function smoothReset() {
    if (t < 1) {
      t += 1 / duration;
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(startPos, defaultPos, ease);
      camera.lookAt(new THREE.Vector3(0, 0, 0));
      requestAnimationFrame(smoothReset);
    } else {
      isZooming = false;
    }
  }

  smoothReset();
}
function showInfoCard(data) {
  document.getElementById('country-name').textContent = data.name;
  document.getElementById('weather-info').textContent = `🌡 Weather: ${data.weather}`;
  document.getElementById('capital-info').textContent = `🌆 Capital: ${data.capital}`;
  document.getElementById('population-info').textContent = `🧑‍🤝‍🧑 Population: ${data.population}`;
  document.getElementById('timezone-info').textContent = `🌍 Timezone: ${data.timezone}`;
  document.getElementById('flag-img').src = data.flag;
  document.getElementById('info-card').classList.remove('hidden');
}

function hideCard() {
  document.getElementById('info-card').classList.add('hidden');
}
