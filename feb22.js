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
    70,
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
        size: 50,
        height: 10,
        curveSegments: 10
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
          value: new THREE.Color("#BFFF00")
        },
        color2: {
          value: new THREE.Color("#15382A")
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
    const randomRot = () => {
      return between(-Math.PI, Math.PI) * 1.5;
    }

    const between = (min, max) => {
      return Math.floor(Math.random()*(max-min+1)+min);
    }
    const startAnimate = () => {
      meshes.forEach((mesh, i) => {

        const randomR = { x: randomRot(), y: randomRot(), z: randomRot() };
        const randomP = { x: between(-300, 300) }

        const startPositionTween = new TWEEN.Tween(mesh.position)
          .to({ x: randomP.x , y: -200, z: 300}, 0);
        const startRotationTween = new TWEEN.Tween(mesh.rotation)
          .to(randomR, 0);

        const enterPositionTween = new TWEEN.Tween(mesh.position)
          .delay(1000 * i)
          .to({ x: 0, y: 0, z: 0 }, 1500)
          .easing(TWEEN.Easing.Cubic.Out)
        const enterRotationTween = new TWEEN.Tween(mesh.rotation)
          .delay(1000 * i)
          .to({ x: 0, y: 0, z: 0 }, 1500)
          .easing(TWEEN.Easing.Cubic.Out)

        const exitPositionTween = new TWEEN.Tween(mesh.position)
          .to({ x: -randomP.x, y: 400, z: -300}, 1500)
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

  const background = new THREE.Group();
  const gridX = 16;
  const gridY = 16;
  const gridYheight = 90;

  const makeBackground = () => {
    const geometry = new THREE.BoxGeometry( 40, 40, 40 );
    const material = new THREE.MeshBasicMaterial( { color: '#053B00' } );
    const meshes = [];

    const rad = 300;
    const step = (2 * Math.PI) / gridX;
    let angle = 0;

    for (let j = 0; j < gridY; j++) {
      for (let i = 0; i < gridX; i++) {
        let x = rad * Math.sin(angle);
        let z = rad * Math.cos(angle);
        let y = (j * gridYheight) + (gridYheight / gridX);
        var rot = (i*(360/gridX)) * (Math.PI/180.0);

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.rotation.y = rot;
        background.add(mesh);

        angle += step;
      }
    }
    // center grid vertically
    background.position.y = -(gridYheight * gridY) / 2;

    scene.add(background);
  }

  // main
  makeSky();
  makeBackground();

  Promise
    .all([textMesh('3'), textMesh('2'), textMesh('1')])
    .then(meshes => {
      meshes.forEach((mesh, i) => {
        mesh.geometry.translate(-25, -25, 0);
        scene.add(mesh);
      });

      makeAnimate(meshes);
    });

  scene.add(new THREE.AmbientLight('#cfcfcf'))
  const light = new THREE.DirectionalLight('#fff', 1);
  light.position.set(-10, -10, 40)
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
      background.rotation.y += 0.003  ;
      background.position.y += 1;

      // ugly: reset grid
      if (background.position.y > -(gridYheight * 3)) background.position.y = -(gridYheight * gridY) / 2;

      renderer.render(scene, camera);
    },
    // Dispose of events & renderer for cleaner hot-reloading
    unload () {
      renderer.dispose();
    }
  };
};

canvasSketch(sketch, settings);
