var scene, vrControls, vrEffect, renderer;
var camera, vrDisplay;

init();

function init() {
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setPixelRatio(window.devicePixelRatio);
  //renderer.shadowMap.enabled = true;
  //renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 10000);

  vrControls = new THREE.VRControls(camera);
  vrEffect = new THREE.VREffect(renderer);
  vrEffect.setSize(window.innerWidth, window.innerHeight);

  Physijs.scripts.worker = "js/physijs_worker.js";
  Physijs.scripts.ammo = "ammo.js";

  scene = new Physijs.Scene();
  scene.setGravity(new THREE.Vector3(0, -10, 0));
  scene.add(camera);

  var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  var directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
  directionalLight1.position.set(0, 1, 0).normalize();
  //directionalLight1.castShadow = true;
  scene.add(directionalLight1);

/*
  directionalLight1.shadow.mapSize.width = 1024;
  directionalLight1.shadow.mapSize.height = 1024;
  directionalLight1.shadow.camera.left = -25;
  directionalLight1.shadow.camera.right = 25;
  directionalLight1.shadow.camera.top = 25;
  directionalLight1.shadow.camera.bottom = -25;
  directionalLight1.shadow.camera.near = 0.5;
  directionalLight1.shadow.camera.far = 500;
*/

  var geometry = new THREE.DodecahedronGeometry(0.5);
  var material = new THREE.MeshPhongMaterial({color: 0x7f7fff, shading: THREE.FlatShading});
  var cube = new Physijs.ConvexMesh(geometry, material);
  //cube.castShadow = true;
  //cube.receiveShadow = true;
  cube.position.z = -1;
  scene.add(cube);

  var geometryG = new THREE.BoxGeometry(50, 1, 50);
  var materialG = new THREE.MeshPhongMaterial({color: 0x7fff7f, shading: THREE.FlatShading});
  var ground = new Physijs.BoxMesh(geometryG, materialG, 0);
  //ground.castShadow = true;
  //ground.receiveShadow = true;
  ground.position.y = -3;
  ground.rotation.x = -0.5;
  scene.add(ground);

  Reticulum.init(camera, {
      proximity: false,
      clickevents: true,
      near: null,
      far: null,
      reticle: {
          visible: true,
          restPoint: 0.1,
          color: 0xcc0000,
          innerRadius: 0.0001,
          outerRadius: 0.003,
          hover: {
              color: 0xcc0000,
              innerRadius: 0.02,
              outerRadius: 0.024,
              speed: 5,
              vibrate: 50
          }
      },
      fuse: {
          visible: false,
          duration: 2.5,
          color: 0x00fff6,
          innerRadius: 0.045,
          outerRadius: 0.06,
          vibrate: 100,
          clickCancelFuse: false
      }
  });

  navigator.getVRDisplays().then(function(displays) {
    if (displays.length > 0) {
      vrDisplay = displays[0];
      vrDisplay.requestAnimationFrame(render);
    }
  });

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("vrdisplaypresentchange", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  vrEffect.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  vrDisplay.requestAnimationFrame(render);
  vrControls.update();
  scene.simulate();
  Reticulum.update();
  vrEffect.render(scene, camera);
}
