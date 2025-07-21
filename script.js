let earth, galaxy, scene, camera, renderer, controls;
let isZooming = false; 

const countryCoords = {
  india : [78.9629 , 20.5937],
  us : [-95.7129 , 37.0902],
  uk : [-30.436 , 55.3781],
  canada : [-106.3468 , 56.1304],
  russia : [40.3188 , 60.524],
  china : [60.1954 , 35.8617],
  japan : [ 30.2529 , 36.2048],
  southkorea : [40.7669 , 35.9078],
  australia : [30.7751 , -25.2744],
  nigeria : [130.0936 , 7.1881],
  southafrica : [22.9375,-30.4161],
  brazil : [-151.9253 , -14.235],
  germany : [140.4515 , 51.1657],
  france : [160.2137 , 46.2276],
  italy : [140.5674 , 41.8719],
  mexico : [-102.5528 , 23.6345],
  argentina : [-63.6167 , -38.4161],
};
const apiCountryNames = {
  us: "united states",
  uk: "united kingdom",
  southkorea: "south korea"
};

init();
animate();

function init(){
const canvas = document.getElementById("webgl");
renderer = new THREE.WebGLRenderer({canvas , antialias: true});
renderer.setSize(window.innerWidth , window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio); // renderign looks sharp
renderer.outputEncoding = THREE.sRGBEncoding; // for better color accuracy.
renderer.toneMapping = THREE.ACRSFilmicToneMapping;
renderer.toneMappingExposure = 1.2; //  brigtness control 
scene = new THREE.Scene();

camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth/window.innerHeight,
  0.1,
  1000
); 
 camera.position.set(0,3,6);

controls = new THREE.OrbitControls(camera,renderer.domElement);
controls.enableDamping = true;   // make motion smooth
controls.target.set(0,0,0);     // earth center orbit
controls.update()

scene.add(new THREE.AmbientLight(0xffffff , 2.5));
const directional = new THREE.DirectionalLight(0xffffff , 3); //sunlight effect
directional.position.set(6,2,2);
scene.add(directional);

const loader = new THREE.GLTFLoader();
loader.load("earth.glb",(gltf) => {
  earth = gltf.scene;
  earth.scale.set(2.2 , 2.2 , 2.4);
  scene.add(earth);

const glowMaterial = new THREE.ShaderMaterial({
  uniforms: {
    c: {value: 2.8 },    //intensity of the glow
    p: {value: 2.5 },
    glowColor: {value: new THREE.Color(0x00bfff)}, 
    viewVector: {value: camera.position}   //make glow visible depending on the camera angle
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
}
`,
fragmentShader:`
uniform vec3 glowColor;
varying float intensity;

void main() {
  gl_FragColor = vec4(glowColor * intensity, 1.0);
}
  `,
side: THREE.BackSide,
blending: THREE.AdditiveBlending,
transparent: true
});
const glowMech = new THREE.Mesh(
  new THREE.SphereGeometry(3.0 , 50 , 50),
  glowMaterial
);
scene.add(glowMesh);
});
loader.load("galaxy.glb",(gltf) => {
  galaxy = gltf.scene;
  galaxy.scale.set(100 , 100 , 100);

  galaxy.traverse((Child) => {
    if(Child.isMesh && Child.material) {
      Child.material = Child.material.clone();
      if(Child.material.color) Child.material.color.multiplyScalar(0.1); // dims the colour
      if(Child.material.emissive) Child.material.emissive.multiplyScalar(0.1); //dims the glow
    }
  });

  scene.add(galaxy);
});
  window.addEventListener("resize", () =>{   // to make 3D scene responsive
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// typing effect logic

const words = ["Earth","Search","Weather","Travel"];
const typingElement = document.getElementById("typing-effect");
let wordIndex = 0;
let charIndex = 0;
let typingSpeed = 170;
let erasingSpeed = 170;
let delayBetweenWords = 1800;

function type(){
  if(charIndex < words[wordIndex].length){
    typingElement.textContent += words[wordIndex].charAt(charIndex);
    charIndex++; //Increments the character index and schedules the next character after typingSpeed ms.
    setTimeout(type , typingSpeed);  //This creates the illusion of typing one letter at a time.
  } else {
    setTimeout(erase , delayBetweenWords);
  }
}

function erase(){
  if(charIndex > 0){
    typingElement.textContent = words[wordIndex].substring(0,charIndex - 1);
    charIndex--;  //decreases the index and schedules the next erase.
    setTimeout(erase , erasingSpeed);
  } else {
    wordIndex = (wordIndex + 1) % words.length; //increments the wordIndex, looping back to 0 when it reaches the end
    setTimeout(type,200); //starts typing the next word after a short delay
  }
}
// starting loop on load
document.addEventListener("DOMContentLoaded",function () { //waits for the DOM to fully load
  setTimeout(type , 500); //after 500ms, kicks off the typing loop by calling type()
});

function animate(){
  requestAnimationFrame(animate); //Creates a loop — animate() keeps calling itself
  if(! isZooming){
    if(earth) earth.rotation.y += 0.0008;
    if(galaxy) galaxy.rotation.y += 0.0008;
  }
  controls.update();
  renderer.render(scene , camera);
}

async function zoomToCountry(){
  const country = document.getElementById("countrySelect").value.toLowerCase();
  if(!country || !countryCoords[country] || !earth) return;

  const [ lng,lat]=  countryCoords[country];
  const phi = (90 - lat) * Math.PI / 180;  //Converts lat/lng to spherical coordinates
  const theta = (lng + 215) * Math.PI / 180;

  const radius = 4.2;
  const x = radius * Math.sin(phi) * Math.cos(theta);  
  const y = radius * Math.cos(phi);       //the camera should zoom as X,Y,Z
  const z = radius * Math.sin(phi) * Math.sin(theta);

  const currentRotation = earth.rotation.y;
  const cosR = Math.cos(currentRotation);
  const sinR = Math.sin(currentRotation);

  const rotatedX = x * cosR + z * sinR;
  const rotatedZ = -x * sinR + z * cosR;
  const target = new THREE.Vector3(rotatedX,y,rotatedZ);

  isZooming = true;
  let t =0;
  const duration = 60;
  const startPos = camera.position.clone();
  
  function smoothZoom(){
    if(t < 1){
      t += 1 / duration;
      const ease = 1 - Math.pow(1-t,3);
      camera.position.lerpVectors(startPos,target,ease);
      camera.lookAt(new THREE.Vector3(0 , 0 , 0));  //makes sure Earth stays centered.
      requestAnimationFrame(smoothZoom);
    }else {
      controls.target.set(0 , 0 , 0);
      controls.update();    //once finished, sets OrbitControls target to Earth's center
    }
  }
  smoothZoom();

  try {
    const apiName = apiCountryNames[country] || country;
    const res = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(apiName)}?fullText=true`);
    const [info] = await res.json();   // calls REST Countries API and extracts data.

    const capital = info.capital?.[0] || "N/A";  //Pulls out capital, population, and flag URL
    const population = info.population?.toLocaleString() || "N/A";
    const flag = info.flags?.png || "";
    const [lat1 , lon1] = info.latlng; //extracts lat/lon for weather lookup.
    const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat1}&lon=${lon1}&appid=df83d9ad8fb63535e2dece792e6ef6d3&units=metric`);
    const weatherData = await weatherRes.json(); // calls OpenWeatherMap API for real-time weather.
    const temp = Math.round(weatherData.main.temp);
    const condition = weatherData.weather[0].main;
    const weather = `${temp}°C, ${condition}`;

    let localTime = "N/A";
    try{
      const timeRes = await fetch(`https://timeapi.io/api/Time/current/coordinate?latitude=${lat1}&longitude=${lon1}`);
      const timeJson = await timeRes.json();
      if(timeJson.time){ //converts 24h time string into 12-hour format.
        const [hourStr,minuteStr] = timeJson.time.split(":");
        let hour = parseInt(hourStr);
        const minute = minuteStr;
        const ampm = hour >= 12 ? "PM" : "AM"; 
        hour = hour % 12;
        if(hour === 0) hour = 12;
        localTime = `${hour}:${minute} ${ampm}`;
      }else{
        localTime = "Unavailable";
      }
    }catch{
      localTime = "unavailable";
    }
    showInfoCard({ //calls a function that fills in the info card with all fetched values
      name: info.name.common,
      weather,
      capital,
      population,
      time: localTime,
      flag
    });
  }catch(error){
    console.error("Failed to fetch real data:", error);
    alert("Error fetching country or weather data.");
  }
}
function resetCamera(){
  hideCard();
  if(!camera) return;

  isZooming = true;
  let t =0;
  const duration = 60;
  const startPos = camera.position.clone();
  const defaultPos = new THREE.Vector3(0 , 3 , 6);

  function smoothReset(){
    if(t < 1){
      t+= 1/ duration;
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(startPos, defaultPos, ease);
      camera.lookAt(new THREE.Vector3(0 , 0 , 0));
      requestAnimationFrame(smoothReset);
    }else{
      isZooming = false;
      controls.target.set(0 , 0 , 0);
      controls.update();
    }
  }
  smoothReset();
}

function showInfoCard(data){
  document.getElementById('country-name').textContent = data.name;
  document.getElementById('weather-info').textContent = `🌡 Weather: ${data.weather}`;
  document.getElementById('capital-info').textContent = `🌆 Capital: ${data.capital}`;
  document.getElementById('timezone-info').textContent = `🕒 Current Time: ${data.time}`;
  document.getElementById('population-info').textContent = `🌐 Population: ${data.population}`;
  document.getElementById('flag-img').src = data.flag;
  document.getElementById('info-card').classList.remove('hidden');
}

function hideCard(){
  document.getElementById('info-card').classList.add('hidden');
}
