const canvasSketch = require('canvas-sketch');
const random = require('canvas-sketch-util').random;
const palettes = require('nice-color-palettes')

global.TWEEN = require('@tweenjs/tween.js');
global.THREE = require('three');

// Include any additional ThreeJS examples below
require('three/examples/js/utils/GeometryUtils.js');
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

  const textMesh = text => new Promise(resolve => {
    const loader = new THREE.FontLoader();
    loader.load('fonts/helvetiker_bold.typeface.json', font => {
      let textGeo = new THREE.TextGeometry(text, {
        font: font,
        size: 20,
        height: 10,
        curveSegments: 4
      });

      textGeo = new THREE.BufferGeometry().fromGeometry(textGeo);
      const mesh = new THREE.Mesh(textGeo, new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true }));

      resolve(mesh);
    });
  });

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

  const makeAnimate = (meshes) => {
    const randomPi = () => {
      const range = 3;
      const pi =  (Math.random() * -Math.PI) + Math.PI;
      return pi * (Math.random() * range);
    }
    const startAnimate = () => {
      meshes.forEach((mesh, i) => {

        const randomR = { x: randomPi(), y: randomPi(), z: randomPi() };

        const startPositionTween = new TWEEN.Tween(mesh.position)
          .to({ x: 0 , y: -100, z: 100}, 0);
        const startRotationTween = new TWEEN.Tween(mesh.rotation)
          .to(randomR, 0);

        const enterPositionTween = new TWEEN.Tween(mesh.position)
          .delay(1000 * i)
          .to({ x: 0, y: 0, z: 0 }, 1500)
          .easing(TWEEN.Easing.Quadratic.Out)
        const enterRotationTween = new TWEEN.Tween(mesh.rotation)
          .delay(1000 * i)
          .to({ x: 0, y: 0, z: 0 }, 1500)
          .easing(TWEEN.Easing.Quadratic.Out)

        const exitPositionTween = new TWEEN.Tween(mesh.position)
          .to({ x: 0, y: 100, z: -100}, 1500)
          .easing(TWEEN.Easing.Quadratic.In)
        const exitRotationTween = new TWEEN.Tween(mesh.rotation)
          .to({x: -randomR.x, y: -randomR.y, z: -randomR.z}, 1500)
          .easing(TWEEN.Easing.Quadratic.In)

        startPositionTween.chain(enterPositionTween);
        enterPositionTween.chain(exitPositionTween);
        startPositionTween.start();

        startRotationTween.chain(enterRotationTween);
        enterRotationTween.chain(exitRotationTween);
        startRotationTween.start();
      });
    }

    startAnimate();
    setInterval(startAnimate, 6000);
  }
  // main
  makeSky();

  var geometry = new THREE.BoxGeometry( 1, 1, 1 );
  var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
  var cube = new THREE.Mesh( geometry, material );
  scene.add( cube );

  Promise
    .all([textMesh('3'), textMesh('2'), textMesh('1')])
    .then(meshes => {
      meshes.forEach((mesh, i) => {
        mesh.geometry.translate(-10, 0, 0);
        scene.add(mesh);
      });

      makeAnimate(meshes);
    });


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
      TWEEN.update();
      renderer.render(scene, camera);
    },
    // Dispose of events & renderer for cleaner hot-reloading
    unload () {
      renderer.dispose();
    }
  };
};

canvasSketch(sketch, settings);
