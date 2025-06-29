let scene, camera, renderer, controls, earth;
let isZooming = false;

const countryCoords = {
  india: [78.9629, 20.5937],
  us: [-95.7129, 37.0902],
  russia: [105.3188, 61.5240],
  uk: [-3.4360, 55.3781],
  canada: [-106.3468, 56.1304],
  australia: [133.7751, -25.2744],
  africa: [21.0936, 7.1881],
  china: [104.1954, 35.8617],
  brazil: [-51.9253, -14.2350],
  germany: [10.4515, 51.1657],
  france: [2.2137, 46.2276],
  japan: [138.2529, 36.2048],
  southkorea: [127.7669, 35.9078],
  italy: [12.5674, 41.8719],
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
  loader.load("earth.glb", function (gltf) {
    earth = gltf.scene;
    earth.scale.set(2.2, 2.2, 2.4);
    scene.add(earth);

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
        }
      `,
      fragmentShader: `
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

    const glowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(3.0, 50, 50),
      glowMaterial
    );
    scene.add(glowMesh);
  });

  const textureLoader = new THREE.TextureLoader();
  textureLoader.load("starfield.jpg", function (texture) {
    const skyGeo = new THREE.SphereGeometry(500, 60, 60);
    const skyMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function animate() {
  requestAnimationFrame(animate);
  if (!isZooming && earth) {
    earth.rotation.y += 0.002;
  }
  controls.update();
  renderer.render(scene, camera);
}

function zoomToCountry() {
  const country = document.getElementById("countrySelect").value.toLowerCase();
  if (!country || !countryCoords[country] || !earth) return;

  const [lng, lat] = countryCoords[country];

  // OFFSET FIX
  const lngOffset = -100; // try adjusting this if it still feels off
  const latOffset = 0;     // usually 0, but adjust if Earth is tilted

  const correctedLng = lng + lngOffset;
  const correctedLat = lat + latOffset;

  const phi = (90 - correctedLat) * (Math.PI / 180);
  const theta = (correctedLng) * (Math.PI / 180);

  const radius = 4.2;
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  isZooming = true;

  let t = 0;
  const duration = 60;
  const startPos = camera.position.clone();
  const target = new THREE.Vector3(x, y, z);

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
}


function resetCamera() {
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
      isZooming = false; // allow Earth to spin again
    }
  }

  smoothReset();
}
