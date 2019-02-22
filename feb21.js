const canvasSketch = require('canvas-sketch');
const random = require('canvas-sketch-util').random;
const palettes = require('nice-color-palettes')

// Ensure ThreeJS is in global scope for the 'examples/'
global.THREE = require('three');

// Include any additional ThreeJS examples below
require('three/examples/js/controls/OrbitControls');

const settings = {
  // Make the loop animated
  animate: true,
  // Get a WebGL canvas rather than 2D
  context: 'webgl',
  // Turn on MSAA
  attributes: { antialias: true }
};

const sketch = ({ context }) => {
  // Setup your scene
  const scene = new THREE.Scene();

  // Create a renderer
  const renderer = new THREE.WebGLRenderer({
    context
  });

  // WebGL background color
  renderer.setClearColor('#333', 1);

  // Setup a camera (degrees, aspect ratio, near value, far value)
  const camera = new THREE.PerspectiveCamera(
    60,
    context.drawingBufferWidth / context.drawingBufferHeight,
    1,
    1000
  );

  // Setup controls
  const controls = new THREE.OrbitControls(camera, context.canvas);
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.25;
  controls.screenSpacePanning = false;
  controls.minDistance = 100;
  controls.maxDistance = 100;
  controls.minPolarAngle = Math.PI / 2;
  controls.maxPolarAngle = Math.PI / 2;

  const palette = random.pick(palettes);

  const makeRing = () => {
    const cylinder = new THREE.CylinderBufferGeometry(50, 50, 20, 80, 1, true);
    const material = new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      color: "#007BAC",
    });

    const mesh = new THREE.Mesh(
      cylinder,
      new THREE.MeshBasicMaterial({
        color: '#111111',
        side: THREE.BackSide,
      })
    );

    return mesh;
  }

  const particles = [];

  const makeParticle = () => {
    var particle = new THREE.Object3D();
    var geometry = new THREE.TetrahedronGeometry(1, 0);

    var material = new THREE.MeshPhongMaterial({
      color: random.pick(palette),
      shading: THREE.FlatShading
    });

    for (var i = 0; i < Math.random() * 300; i++) {
      var mesh = new THREE.Mesh(geometry, material);
      mesh.position
        .set(250+ Math.random() - 500, Math.random() - 500, Math.random() - 500)
        .normalize();
      let meshScale = Math.random() * 1;
      mesh.scale.set(meshScale, meshScale, meshScale);
      mesh.position.multiplyScalar(10 + Math.random() * 100);
      mesh.rotation.set(
        Math.random() * 2,
        Math.random() * 2,
        Math.random() * 2
      );
      mesh.castShadow = true;
      particle.add(mesh);
      particles.push(mesh);
    }
    scene.add(particle);
  };

  const makeTrail = () => {
    const thetaSegments = 32;
    const phiSegments = 1;
    const inner = 40;
    const outer = 50;
    const geometry = new THREE.RingGeometry( inner, outer, thetaSegments, phiSegments, 0, Math.PI/2 );

    const material = new THREE.MeshBasicMaterial({
      map: THREE.ImageUtils.loadTexture("images/uv.png"),
      transparent: true,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh( geometry, material );
    return mesh;
  }

  const makeWheel = () => {
    const geometry = new THREE.CylinderBufferGeometry( 5, 5, 0.5, 32 );
    const material = new THREE.MeshBasicMaterial( {color: '#FFB300'} );
    const cylinder = new THREE.Mesh( geometry, material );
    return cylinder;
  }

  const makeSpinner = () => {
    const offset = new THREE.Group();
    const trail = makeTrail();
    const wheel = makeWheel();
    wheel.rotation.x = Math.PI/2;
    wheel.position.x = 45;
    offset.add(wheel);
    offset.add(trail);
    return offset;
  }

  const spinners = [];

  for (var i = 0; i < 2; i++) {
    let spinner = makeSpinner();
    spinner.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    spinners.push(spinner);
    scene.add(spinner);
  }

  const ring = makeRing();
  ring.rotation.x = Math.PI/2;

  const makeSky = () => {
    var geometry = new THREE.CylinderBufferGeometry(300, 300, (context.drawingBufferWidth / context.drawingBufferHeight) * 800, 32, 1, true);
    var material = new THREE.ShaderMaterial({
      uniforms: {
        color1: {
          value: new THREE.Color("#510076")
        },
        color2: {
          value: new THREE.Color("#00BFFF")
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

  makeSky();

  scene.add(new THREE.AmbientLight('#cfcfcf'))
  const light = new THREE.DirectionalLight('#fff', 1);
  light.position.set(-10, 0, 40)
  scene.add(light)

  // draw each frame
  return {
    // Handle resize events here
    resize ({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight);
      camera.updateProjectionMatrix();
    },
    // Update & render your scene here
    render ({ time }) {
      controls.update();
        spinners.forEach(spinner => {
        spinner.rotation.x -= 0.01;
        spinner.rotation.y -= 0.02;
        spinner.rotation.z -= 0.15;
      });

      renderer.render(scene, camera);
    },
    // Dispose of events & renderer for cleaner hot-reloading
    unload () {
      renderer.dispose();
    }
  };
};

canvasSketch(sketch, settings);
