const canvasSketch = require('canvas-sketch');
const random = require('canvas-sketch-util').random;

global.THREE = require('three');
global.WEBVR = require('./js/WebVR.js');

require('three/examples/js/controls/OrbitControls');

const settings = {
  context: 'webgl',
  attributes: { antialias: true }
};

const sketch = ({ context }) => {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 2000);

  const controls = new THREE.OrbitControls(camera, context.canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.screenSpacePanning = false;
  controls.minDistance = 10;
  controls.maxDistance = 20;
  controls.minPolarAngle = Math.PI / 4;
  controls.maxPolarAngle = Math.PI / 2;

  scene.add(new THREE.AmbientLight('#cfcfcf'));
  const light = new THREE.DirectionalLight('#fff', 1);
  light.position.set(-100, 100, 40);
  scene.add(light);

  let isPresentingVr = false;
  let wasPresentingVr = false;

  // skew matrix
  const Syx = 0, Szx = 0, Sxy = 0, Szy = 0.2, Sxz = 0, Syz = 0;
  const skewMat = new THREE.Matrix4();
  skewMat.set(  1,   Syx,  Szx,  0,
              Sxy,     1,  Szy,  0,
              Sxz,   Syz,   1,   0,
                0,     0,   0,   1);

  // stars
  const starLength = 40;
  const starSpeed = 30;
  const stars = [];
  const starBounds = new THREE.Vector3(200, 200, 1000);
  const startOffset = new THREE.Vector3(0, 0, 1000);
  const starGeo = new THREE.Geometry();
  starGeo.vertices.push(new THREE.Vector3(0, 0, starLength));
  starGeo.vertices.push(new THREE.Vector3(0, 0, -starLength));
  const starMat = new THREE.LineBasicMaterial({
    color: '#ffffff',
    linewidth: 1 });

  // ships
  const ships = [];
  const shipBlast = [];
  const numShips = 5;
  const shipXspacing = 3;
  const shipZspacing = 1.5;
  const shipYspacing = 1.8;
  const fleetWidth = numShips * shipXspacing;

  // ship body
  const shipGeo = new THREE.ConeGeometry(15, 25, 3);
  const shipMat = new THREE.MeshPhongMaterial({
    flatShading: true,
    color: '#0DA9FF' });
  const shipMesh = new THREE.Mesh(shipGeo, shipMat);
  const shipLineGeo = new THREE.EdgesGeometry(shipMesh.geometry);
  const shipLineMat = new THREE.LineBasicMaterial({
    color: '#00D7FF',
    linewidth: 1 });
  const shipLines = new THREE.LineSegments(shipLineGeo, shipLineMat);
  shipLines.geometry.applyMatrix(skewMat);
  shipMesh.scale.z = 0.2;
  shipMesh.rotation.x = Math.PI / 2;
  shipMesh.rotation.z = Math.PI;
  shipMesh.geometry.applyMatrix(skewMat);
  shipMesh.add(shipLines);

  // ship canopy
  const canopyGeo = new THREE.OctahedronGeometry(5);
  const canopyMat = new THREE.MeshBasicMaterial({ color: '#393939' });
  const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
  const canopyLineGeo = new THREE.EdgesGeometry(canopyMesh.geometry);
  const canopyLineMat = new THREE.LineBasicMaterial({
    color: '#00D7FF',
    linewidth: 1 });
  const canopyLines = new THREE.LineSegments(canopyLineGeo, canopyLineMat);
  canopyMesh.add(canopyLines);
  canopyMesh.scale.z = 0.3;
  canopyMesh.scale.x = 0.5;
  canopyMesh.position.z = -1;
  canopyMesh.position.y = 0.69;
  canopyMesh.rotation.x = -0.06;
  canopyMesh.rotation.x += Math.PI / 2;

  // ship boosters
  const boosterGeo = new THREE.CylinderGeometry(2, 2, 10, 8);
  const boosterMat = new THREE.MeshPhongMaterial({
    flatShading: true,
    color: '#690078' });
  const boosterMesh = new THREE.Mesh(boosterGeo, boosterMat);
  const boosterLineGeo = new THREE.EdgesGeometry(boosterMesh.geometry);
  const boosterLineMat = new THREE.LineBasicMaterial({
    color: '#FF00B3',
    linewidth: 1 });
  const boosterLines = new THREE.LineSegments(boosterLineGeo, boosterLineMat);
  boosterLines.geometry.applyMatrix(skewMat);
  boosterMesh.geometry.applyMatrix(skewMat);
  boosterMesh.add(boosterLines);
  boosterMesh.position.y = 2;
  boosterMesh.position.z = 11;
  boosterMesh.rotation.x = Math.PI / 2;
  const boosterSpacing = 4;

  // ship jet blast
  const blastGeo = new THREE.OctahedronGeometry(2);
  const blastMat = new THREE.MeshBasicMaterial({ color: '#FBE89A' });
  const blastMesh = new THREE.Mesh(blastGeo, blastMat);
  blastMesh.position.z = 16;
  blastMesh.scale.z = 2;
  blastCount = 10;

  const setCameraPosition = () => {
    camera.position.set(-8, 2, -7);
  }

  const makeSky = () => {
    const gradientMat = new THREE.ShaderMaterial({
      uniforms: {
        color1: {
          value: new THREE.Color('#181F4B')
        },
        color2: {
          value: new THREE.Color('#000000')
        }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vUv;
        void main() {
          gl_FragColor = vec4(mix(color1, color2, vUv.y), 1.0);
        }
      `,
      side: THREE.BackSide,
      wireframe: false
    });
    scene.add(new THREE.Mesh(
      new THREE.SphereBufferGeometry(1000, 32, 32),
      gradientMat));
  };

  const makeShip = () => {
    const shipGroup = new THREE.Group();

    // make ship boosters
    const boosterMesh1 = boosterMesh.clone();
    const boosterMesh2 = boosterMesh.clone();
    boosterMesh1.position.x = boosterSpacing;
    boosterMesh2.position.x = -boosterSpacing;
    shipGroup.add(boosterMesh1);
    shipGroup.add(boosterMesh2);

    // make ship blast
    for (let i = 0; i < blastCount; i++) {
      const blast = blastMesh.clone();
      blast.position.z += Math.exp(i * 0.8);
      blast.scale.z += Math.exp(i * 0.4);
      shipBlast.push(blast);
      shipGroup.add(blast);
    }

    // ship body and canopy
    shipGroup.add(shipMesh.clone());
    shipGroup.add(canopyMesh.clone());
    shipGroup.scale.set(0.1, 0.1, 0.1);
    return shipGroup;
  }

  const makeStars = (range, start, amount) => {
    for (let i = 0; i < amount; i++) {
      const star = new THREE.Line(starGeo, starMat);
      star.position.set(
        random.range(-range.x, range.x),
        random.range(-range.y, range.y),
        random.range(-range.z-start.z, range.z+start.z));
      stars.push(star);
      scene.add(star);
    }
  }

  const render = (time) => {
    isPresentingVr = renderer.vr.getDevice() && renderer.vr.isPresenting();
    if (isPresentingVr && !wasPresentingVr) { // entering vr
      // enable VR only after entering, otherwise it conflicts with OrbitControls
      renderer.vr.enabled = true;
      wasPresentingVr = true;
    }

    if (!isPresentingVr && wasPresentingVr) { // exiting vr
      // explicitly call exitPresent on device so we get proper canvas resizing
      renderer.vr.getDevice().exitPresent();
      wasPresentingVr = false;
    }

    if (!isPresentingVr) {
      controls.update();
    }

    // jiggle ships
    ships.forEach((ship, index) => {
      const i = index + 1;
      ship.position.x += Math.sin(time * i / 1000) / 250;
      ship.position.y += Math.sin(time * i / 1000) / 200;
      ship.position.z += Math.sin(time * i / 1000) / 200;
      ship.rotation.z += Math.sin(time * i / 1000) / 1500;
    });

    // move stars
    stars.forEach((star, i) => {
      star.position.z += starSpeed;
      if (star.position.z > starBounds.z) {
        stars.splice(i, 1);
        scene.remove(star);
        makeStars(starBounds, startOffset, 1);
      }
    });

    // jiggle ship blast
    shipBlast.forEach((blast) => {
      blast.position.x = Math.random();
      blast.position.y = Math.random();
    });

    renderer.render(scene, camera);
  }

  // main
  const renderer = new THREE.WebGLRenderer(context);
  renderer.setAnimationLoop(render); // Use three.js renderer to drive render loop.
  document.body.appendChild(WEBVR.createButton(renderer));

  setCameraPosition();

  makeStars(starBounds, new THREE.Vector3(0, 0, 0), 100);

  makeSky();

  // make ships
  for (let i = 0; i < numShips; i++) {
    let ship = makeShip();
    ship.position.x = i * (fleetWidth / numShips) - (fleetWidth / 2);
    ship.position.z = -i * shipZspacing;
    if (i > (numShips / 2)) {
      ship.position.z = (numShips - i) * -shipZspacing;
    }
    ship.position.y = random.range(-shipYspacing, shipYspacing);
    ships.push(ship);
    scene.add(ship);
  }

  window.addEventListener('vrdisplaypresentchange', (e) => {
    if (!e.display.isPresenting) {
      // disable vr after VR presentation ends as to not conflict with OrbitControls.
      renderer.vr.enabled = false;
      setCameraPosition();
    }
  });

  return {
    resize ({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight);
      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
    },

    unload () {
      renderer.dispose();
    }
  };
};

canvasSketch(sketch, settings);
