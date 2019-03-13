const canvasSketch = require('canvas-sketch');

global.THREE = require('three');
global.WEBVR = require('./js/WebVR.js');

require('three/examples/js/controls/OrbitControls');
require('three/examples/js/geometries/BoxLineGeometry');

const settings = {
  context: 'webgl',
  attributes: { antialias: true }
};

const sketch = ({ context }) => {
  let activeCamera;

  const resetCameraPosition = () => {
    controls.target.set(0, 1, 0);
    camera.position.set(1.5, 1.8, 1.5);
  }

  const render = (time) => {
    isPresentingVr = renderer.vr.getDevice() && renderer.vr.isPresenting();
    if (isPresentingVr) {
      activeCamera = vrCamera;
    } else {
      activeCamera = camera;
      controls.update();
    }
    mesh.rotation.y += 0.01;
    renderer.render(scene, activeCamera);
  }

  const onVrPresentChange = (e) => {
    if (e.display.isPresenting) {
      // toggle vr as to not conflict with OrbitControls.
      renderer.vr.enabled = true;
    } else {
      // toggle vr as to not conflict with OrbitControls.
      renderer.vr.enabled = false;
      resetCameraPosition();
    }
  }

  const renderer = new THREE.WebGLRenderer(context);
  renderer.setClearColor('#082337', 1);
  // Use three.js renderer to drive render loop.
  renderer.setAnimationLoop(render);

  // Adds Enter VR button
  document.body.appendChild(WEBVR.createButton(renderer));

  const scene = new THREE.Scene();

  // setup standard camera and use 2D mouse and touch OrbitControls.
  const camera = activeCamera = new THREE.PerspectiveCamera(70, 1, 0.1, 1000);
  const controls = new THREE.OrbitControls(camera, context.canvas);
  controls.maxPolarAngle = Math.PI / 2;

  // setup a specific VR camera and put it on dolly so we can move it around.
  const vrDolly = new THREE.Group();
  const vrCamera = new THREE.PerspectiveCamera();
  vrDolly.add(vrCamera);
  vrDolly.position.set(0, 0, 2);
  scene.add(vrDolly)

  // lights
  scene.add(new THREE.AmbientLight('#cfcfcf'));
  const light = new THREE.DirectionalLight('#fff', 1);
  light.position.set(-10, 10, 10);
  scene.add(light);

  // scene
  const room = new THREE.LineSegments(
    new THREE.BoxLineGeometry(5, 5, 5, 10, 10, 10),
    new THREE.LineBasicMaterial({ color: '#134D79' }));
  room.geometry.translate(0, 2.5, 0);
  scene.add(room);

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshPhysicalMaterial({
      color: '#FF0044',
      roughness: 0.80,
      flatShading: true
    }));
  mesh.position.set(0, 1, 0);
  scene.add(mesh);

  resetCameraPosition();

  window.addEventListener('vrdisplaypresentchange', onVrPresentChange);

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
