const canvasSketch = require('canvas-sketch');
const random = require('canvas-sketch-util').random;
const palettes = require('nice-color-palettes')

global.TWEEN = require('@tweenjs/tween.js');
global.THREE = require('three');
global.WEBVR = require('./js/WebVR.js');

require('three/examples/js/utils/GeometryUtils.js');
require('three/examples/js/controls/OrbitControls');


const settings = {
  context: 'webgl',
  attributes: { antialias: true }
};

const sketch = ({ context }) => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 1, 5000);

  // Setup controls
  const controls = new THREE.OrbitControls(camera, context.canvas);
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.25;
  controls.screenSpacePanning = false;
  controls.minDistance = 70;
  controls.maxDistance = 200;
  controls.minPolarAngle = Math.PI / 4;
  controls.maxPolarAngle = Math.PI / 2;

  const setDefaultCameraPosition = () => {
    camera.position.set(-80, 20, -70);
  }

  setDefaultCameraPosition();

  const palette = random.pick(palettes);

  const makeSky = () => {
    var geometry = new THREE.SphereBufferGeometry( 900, 32, 32 );
    var material = new THREE.ShaderMaterial({
      uniforms: {
        color1: {
          value: new THREE.Color("#181F4B")
        },
        color2: {
          value: new THREE.Color("#000000")
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
      side: THREE.DoubleSide,
      wireframe: false
    });
    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
  };

  const jetBlast = [];

  const makeShip = () => {
    const shipGroup = new THREE.Group();
    const Syx = 0, Szx = 0, Sxy = 0, Szy = 0.2, Sxz = 0, Syz = 0;
    const skewMat = new THREE.Matrix4();
    skewMat.set(  1,   Syx,  Szx,  0,
                Sxy,     1,  Szy,  0,
                Sxz,   Syz,   1,   0,
                  0,     0,   0,   1);

    makeBoosters = () => {
      const geometry = new THREE.CylinderGeometry(2, 2, 10, 8);
      const material = new THREE.MeshPhongMaterial({
        flatShading: true,
        color: '#690078',
        polygonOffset: true,
        polygonOffsetFactor: 1, // positive value pushes polygon further away
        polygonOffsetUnits: 1});
      const mesh = new THREE.Mesh( geometry, material );

      const geo = new THREE.EdgesGeometry( mesh.geometry ); // or WireframeGeometry
      const mat = new THREE.LineBasicMaterial( { color: '#FF00B3', linewidth: 1 } );
      const wireframe = new THREE.LineSegments( geo, mat );
      wireframe.geometry.applyMatrix(skewMat);
      mesh.add( wireframe );

      const mesh2 = mesh.clone();
      mesh2.position.x = -5;
      mesh2.position.y = 2;
      mesh2.position.z = 11;
      mesh2.rotation.x = Math.PI / 2;

      mesh.position.x = 5;
      mesh.position.y = 2;
      mesh.position.z = 11;
      mesh.rotation.x = Math.PI / 2;

      mesh.geometry.applyMatrix(skewMat);

      shipGroup.add(mesh);
      shipGroup.add(mesh2);
    }

    makeJetblast = () => {
      const geometry = new THREE.OctahedronGeometry(2);
      const material = new THREE.MeshBasicMaterial({
        color: '#FBE89A',
        polygonOffset: true,
        // opacity: 1,
        // transparent: true,
        polygonOffsetFactor: 1, // positive value pushes polygon further away
        polygonOffsetUnits: 1});
      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.z = 16;
      mesh.scale.z = 2;

      for (let i = 0; i < 10; i++) {
        const blast = mesh.clone();
        blast.position.z += Math.exp(i * 0.8);
        blast.scale.z += Math.exp(i * 0.4);
        jetBlast.push(blast);
        shipGroup.add(blast);
      }
    }

    makeBody = () => {
      const geometry = new THREE.ConeGeometry(15, 25, 3);
      const material = new THREE.MeshPhongMaterial({
        flatShading: true,
        color: '#0DA9FF',
        polygonOffset: true,
        polygonOffsetFactor: 1, // positive value pushes polygon further away
        polygonOffsetUnits: 1});
      const mesh = new THREE.Mesh(geometry, material);

      const geo = new THREE.EdgesGeometry(mesh.geometry); // or WireframeGeometry
      const mat = new THREE.LineBasicMaterial({ color: '#00D7FF', linewidth: 1 });
      const wireframe = new THREE.LineSegments(geo, mat);
      wireframe.geometry.applyMatrix(skewMat);
      mesh.scale.z = 0.2;
      mesh.rotation.x = Math.PI / 2;
      mesh.rotation.z = Math.PI;
      mesh.geometry.applyMatrix(skewMat);
      mesh.add(wireframe);

      shipGroup.add(mesh);
    }

    makeCanopy = () => {
      const geometry = new THREE.OctahedronGeometry(5);
      const material = new THREE.MeshBasicMaterial({
        color: '#393939',
        polygonOffset: true,
        polygonOffsetFactor: 1, // positive value pushes polygon further away
        polygonOffsetUnits: 1});
      const mesh = new THREE.Mesh( geometry, material );

      const geo = new THREE.EdgesGeometry( mesh.geometry ); // or WireframeGeometry
      const mat = new THREE.LineBasicMaterial( { color: '#00D7FF', linewidth: 1 } );
      const wireframe = new THREE.LineSegments( geo, mat );
      mesh.scale.z = 0.3;
      mesh.scale.x = 0.5;
      mesh.position.z = -1;
      mesh.position.y = 0.69;
      mesh.rotation.x = -0.06;

      mesh.rotation.x += Math.PI / 2;
      mesh.add( wireframe );

      shipGroup.add(mesh);
    }

    makeJetblast();
    makeBoosters();
    makeBody();
    makeCanopy();

    return shipGroup;
  }

  const between = (min, max) => {
    return Math.floor(Math.random()*(max-min+1)+min);
  }

  const stars = [];
  const makeStars = (num) => {
    let lowBound = -600;
    let highBound = -300;
    if (!num) {
      num = 100; // initial
      lowBound = -600;
      highBound = 600;
    }
    var geometry = new THREE.BoxBufferGeometry( 0.01, 0.01, 90 );
    var material = new THREE.MeshBasicMaterial( {color: 0xffffff, wireframe: true} );
    var cube = new THREE.Mesh(geometry, material);

    for (let i = 0; i < num; i++) {
      const star = cube.clone();
      star.position.set(between(-300, 300), between(-300, 300), between(lowBound, highBound));
      stars.push(star);
      scene.add(star);
    }
  }

  // main
  makeSky();
  const ships = [];
  const numShips = 5;
  const shipSpacing = 30;
  const shipLead = 15;
  const fleetWidth = numShips * shipSpacing;
  for (let i = 0; i < numShips; i++) {
    let ship = makeShip();
    ship.position.x = i * (fleetWidth / numShips) - (fleetWidth / 2);
    ship.position.z = -i * shipLead;
    if (i > (numShips / 2)) {
      ship.position.z = (numShips - i) * -shipLead;
    }
    ship.position.y = between(-18, 18);
    ships.push(ship)
    scene.add(ship);
  }

  makeStars();

  const render = (time) => {
    isPresentingVr = renderer.vr.getDevice() && renderer.vr.isPresenting();
    if (isPresentingVr && !wasPresentingVr) { // entering vr
      // enable VR only after we enter, otherwise it conflicts with OrbitControls
      renderer.vr.enabled = true;
      wasPresentingVr = true;
    }

    if (!isPresentingVr && wasPresentingVr) { // exiting vr
      // explicitly call exitPresent on device so we get proper canvas resizing.
      renderer.vr.getDevice().exitPresent();
      wasPresentingVr = false;
    }

    if (!isPresentingVr) {
      controls.update();
    }

    ships.forEach((ship, index) => {
      const i = index + 1;
      ship.position.x += Math.sin(time * 2 * i) / 25;
      ship.position.z += Math.sin(time * i) / 14;
      ship.rotation.z += Math.sin(time * 2 * i) / 1500;
    });

    stars.forEach((star, i) => {
      star.position.z += 30;
      if (star.position.z > 600) {
        //console.log(i);
        stars.splice(i, 1);
        scene.remove(star);
        makeStars(1);
      }
    });

    jetBlast.forEach((blast) => {
      blast.position.x = Math.random();
      blast.position.y = Math.random();
    });

    renderer.render(scene, camera);
  }

  scene.add(new THREE.AmbientLight('#cfcfcf'));
  const light = new THREE.DirectionalLight('#fff', 1);
  light.position.set(-100, 100, 40);
  scene.add(light);

  const renderer = new THREE.WebGLRenderer(context);
  // we use three.js renderer to drive render loop.
  renderer.setAnimationLoop(render);

  document.body.appendChild(WEBVR.createButton(renderer));

  let isPresentingVr = false;
  let wasPresentingVr = false;

  window.addEventListener('vrdisplaypresentchange', (e) => {
    // disable vr after exit present due to conflicting with orbit controls.
    if (!e.display.isPresenting) {
      renderer.vr.enabled = false;
      setDefaultCameraPosition();
    }
  });

  // draw each frame
  return {
    resize ({ pixelRatio, viewportWidth, viewportHeight }) {
      console.log('resizing');
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight);
      camera.aspect = viewportWidth / viewportHeight;
      camera.updateProjectionMatrix();
    },

    // Dispose of events & renderer for cleaner hot-reloading
    unload () {
      renderer.dispose();
    }
  };
};

canvasSketch(sketch, settings);
