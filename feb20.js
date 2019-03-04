const canvasSketch = require("canvas-sketch");
const random = require("canvas-sketch-util").random;
const palettes = require("nice-color-palettes");
const THREE = require("three");

const settings = {
  // Make the loop animated
  animate: true,
  // Get a WebGL canvas rather than 2D
  context: "webgl",
  // Turn on MSAA
  attributes: { antialias: true }
};

const sketch = ({ context }) => {
  // Create a renderer
  const renderer = new THREE.WebGLRenderer({
    context
  });

  const camera = new THREE.PerspectiveCamera(
    50,
    context.drawingBufferWidth / context.drawingBufferHeight,
    0.01,
    100
  );
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8d0a55);
  scene.fog = new THREE.FogExp2(0x8d0a55, 0.1);

  const palette = random.pick(palettes);
  const startDepth = 30;
  const endDepth = -5;
  const meshes = [];
  const particles = [];
  let lastTime;

  scene.add(new THREE.AmbientLight("#cfcfcf"));
  const light = new THREE.DirectionalLight("#fff", 1.6);
  light.position.set(-1, 0, -4);
  light.castShadow = true;

  scene.add(light);

  const cylinder = new THREE.CylinderBufferGeometry(1, 1, 0.3, 7, 1, true);
  const material = new THREE.MeshLambertMaterial({
    side: THREE.DoubleSide,
    color: "#FBD600",
  });

  const makeRing = (offsetX, offsetY) => {
    const mesh = new THREE.Mesh(cylinder, material);
    mesh.rotation.set(90, 0, 0);
    mesh.position.set(offsetX, offsetY, startDepth);
    mesh.receiveShadow = true;
    scene.add(mesh);
    meshes.push(mesh);
  };

  const makeParticle = () => {
    var particle = new THREE.Object3D();
    var geometry = new THREE.TetrahedronGeometry(1, 0);

    var material = new THREE.MeshPhongMaterial({
      color: random.pick(palette),
      flatShading:true
    });

    for (var i = 0; i < Math.random() * 20; i++) {
      var mesh = new THREE.Mesh(geometry, material);
      mesh.position
        .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() + 5)
        .normalize();
      let meshScale = Math.random() * 0.1;
      mesh.scale.set(meshScale, meshScale, meshScale);
      mesh.position.multiplyScalar(10 + Math.random() * 10);
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

  makeParticle();

  const makeSky = () => {
    var geometry = new THREE.CylinderBufferGeometry(30, 30, (context.drawingBufferWidth / context.drawingBufferHeight) * 70, 32, 1, true);
    var material = new THREE.ShaderMaterial({
      uniforms: {
        color1: {
          value: new THREE.Color("#003A76")
        },
        color2: {
          value: new THREE.Color("#E60078")
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

  // draw each frame
  return {
    // Handle resize events here
    resize({ pixelRatio, viewportWidth, viewportHeight }) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(viewportWidth, viewportHeight);

      camera.position.set(0, 0, -5);
      camera.lookAt(0, 0, -1);
    },
    // Update & render your scene here
    render({ time }) {
      for (let i = 0; i < meshes.length; i++) {
        const mesh = meshes[i];
        mesh.position.z += -0.05;
        if (mesh.position.z <= endDepth) {
          meshes.splice(i, 1);
          scene.remove(mesh);
        }
      }

      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        particle.position.z += -0.02;
        particle.rotation.x += 0.01;
        particle.rotation.y += 0.02;
        if (particle.position.z < endDepth) {
          particles.splice(i, 1);
          scene.remove(particle);
        }
      }

      if (!lastTime) {
        lastTime = time;
      }

      if (time - lastTime > 0.8) {
        makeRing(Math.sin(time) * 0.3, Math.sin(time) * 0.3);
        makeParticle();
        lastTime = time;
      }

      camera.rotation.z += 0.001;
      renderer.render(scene, camera);
    },
    // Dispose of events & renderer for cleaner hot-reloading
    unload() {
      renderer.dispose();
    }
  };
};

canvasSketch(sketch, settings);
