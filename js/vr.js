"use strict";

var vrEffect, vrDisplay;

if (window.opener) {
  var sceneJSONString = window.opener.sceneJSONString;
  initVR();
} else {
  window.alert("This page should only be accessed through the VR Editor.");
}

function initVR() {
  var vrButton = document.getElementById("vr-switch");
  vrButton.addEventListener("click", function() {
    console.log("requesting present");
    console.log("before");
    console.log(window.innerWidth);
    console.log(window.innerHeight);
    hud.scale.set(4, 2, 1);
    hud.position.set(3, 4, 1);
    vrDisplay.requestPresent([{source: renderer.domElement}]);
    console.log("after");
    console.log(window.innerWidth);
    console.log(window.innerHeight);
  });

  var renderer = new THREE.WebGLRenderer();

  var hasBackground;

  var scene, vrControls;
  var dummy, camera;

  var cameraCube, sceneCube, equirectMaterial;

  var cameraOrtho, sceneOrtho, hud;

  var physicsWorld;

  var rigidBodies = [];

  var margin = 0.01;

  var clock = new THREE.Clock();
  var transformAux1 = new Ammo.btTransform();

  var idToObject = {};
  var idToPhysicsBody = {};
  var id = -1;

  init();

  function init() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x32383f);
    renderer.autoClear = false;
    //renderer.shadowMap.enabled = true;
    //renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    var rendererWidth = renderer.domElement.clientWidth;
    var rendererHeight = renderer.domElement.clientHeight;

    cameraCube = new THREE.PerspectiveCamera(70, rendererWidth / rendererHeight, 0.01, 10000);

    cameraOrtho = new THREE.OrthographicCamera(-rendererWidth / 2, rendererWidth / 2, rendererHeight / 2, -rendererHeight / 2, 1, 10);
    cameraOrtho.position.z = 10;

    scene = new THREE.Scene();

    sceneCube = new THREE.Scene();

    sceneOrtho = new THREE.Scene();

    vrEffect = new THREE.VREffect(renderer);
    vrEffect.setSize(window.innerWidth, window.innerHeight);
    vrEffect.autoSubmitFrame = false;

    var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    var directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight1.position.set(2, 8, 1).normalize();
    scene.add(directionalLight1);

    var directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.2);
    directionalLight2.position.set(-2, -8, -1).normalize();
    scene.add(directionalLight2);

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

    var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    var broadphase = new Ammo.btDbvtBroadphase();
    var solver = new Ammo.btSequentialImpulseConstraintSolver();
    physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);

    var equirectShader = THREE.ShaderLib["equirect"];

    equirectMaterial = new THREE.ShaderMaterial({fragmentShader: getFrag(), vertexShader: equirectShader.vertexShader, uniforms: equirectShader.uniforms, depthWrite: false, side: THREE.BackSide});

    var backgroundMesh = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), equirectMaterial);
    sceneCube.add(backgroundMesh);

    var hudTexture = new THREE.Texture(getHUD());//, createHUD);
    hudTexture.needsUpdate = true;

    createHUD(hudTexture);

    function createHUD(texture) {
      var hudMaterial = new THREE.SpriteMaterial({map: hudTexture});
      hud = new THREE.Sprite(hudMaterial);
      var hudWidth = hudMaterial.map.image.width;
      var hudHeight = hudMaterial.map.image.height;
      hud.scale.set(rendererWidth / 10, rendererHeight / 10, 1);
      //hud.position.set((rendererWidth - hudWidth / 2) / 2 - 400, (rendererHeight - hudHeight / 2) / 2 - 200, 1);
      hud.position.set(0, 0, 1);
      sceneOrtho.add(hud);
    }

    importScene(JSON.parse(sceneJSONString));

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

  function getHUD() {
    var canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 150;
    var ctx = canvas.getContext("2d");
    ctx.font = "32pt BlinkMacSystemFont";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineWidth = 4;
    ctx.lineTo(0, canvas.height);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(canvas.width, 0);
    ctx.lineTo(0, 0);
    ctx.strokeStyle="white";
    ctx.stroke();
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(2, 2, canvas.width - 4, canvas.height - 4);
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("HUD DISPLAY", canvas.width / 2, canvas.height / 2);
    return canvas;
    /*
    canvas.style.width = "400px";
    canvas.style.height = "400px";
    canvas.width = 800;
    canvas.height = 800;
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "24px sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("Hello World", canvas.width / 2, canvas.height / 2);
    //ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.scale(2, 2);
    return canvas;
    */
  }

  function getFrag() {
    return [
      "uniform sampler2D tEquirect;",
      "varying vec3 vWorldPosition;",
      "#include <common>",
      "void main() {",
        "vec3 direction = normalize( vWorldPosition );",
        "vec2 sampleUV;",
        "sampleUV.y = asin( direction.y ) * 0.3183098861 + 0.5;",
        "sampleUV.x = atan( direction.z, direction.x ) * 0.1591549430 + 0.5;",
        "gl_FragColor = texture2D( tEquirect, sampleUV );",
      "}"
    ].join("\n");
  }

  function createRigidBody(object, physicsShape, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz, id) {
    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(object.position.x, object.position.y, object.position.z));
    transform.setRotation(new Ammo.btQuaternion(object.quaternion.x, object.quaternion.y, object.quaternion.z, object.quaternion.w));
    var motionState = new Ammo.btDefaultMotionState(transform);
    var localInertia = new Ammo.btVector3(0, 0, 0);
    physicsShape.calculateLocalInertia(mass, localInertia);
    var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
    var body = new Ammo.btRigidBody(rbInfo);
    body.setLinearVelocity(new Ammo.btVector3(linearvelocityx, linearvelocityy, linearvelocityz));
    body.setAngularVelocity(new Ammo.btVector3(angularvelocityx, angularvelocityy, angularvelocityz));
    object.userData.physicsBody = body;
    scene.add(object);
    if (mass > 0) {
      rigidBodies.push(object);
      body.setActivationState(4);
    }
    physicsWorld.addRigidBody(body);
    idToPhysicsBody[id] = body;
  }

  function importScene(sceneJSON) {
    var worldJSON = sceneJSON[0];
    physicsWorld.setGravity(new Ammo.btVector3(worldJSON.gravityx, worldJSON.gravityy, worldJSON.gravityz));
    dummy = new THREE.Camera();
    dummy.position.set(worldJSON.camerax, worldJSON.cameray, worldJSON.cameraz);
    dummy.lookAt(new THREE.Vector3(0, 0, 0));
    scene.add(dummy);
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 10000);
    camera.position.set(0, 0, 0);
    dummy.add(camera);
    vrControls = new THREE.VRControls(camera);
    if (worldJSON.background !== "") {
      var equirectTexture = new THREE.TextureLoader().load(worldJSON.background);
      equirectTexture.mapping = THREE.EquirectangularReflectionMapping;
      equirectMaterial.uniforms["tEquirect"].value = equirectTexture;
      hasBackground = false;
    } else {
      hasBackground = true;
    }
    for (var i = 1; i < sceneJSON.length; i++) {
      var objectJSON = sceneJSON[i];
      var objectGeometry;
      switch (objectJSON.type) {
        case "BoxBufferGeometry":
          objectGeometry = new THREE.BoxGeometry(objectJSON.boxwidth, objectJSON.boxheight, objectJSON.boxdepth);
          break;
        case "ConeBufferGeometry":
          objectGeometry = new THREE.ConeGeometry(objectJSON.coneradius, objectJSON.coneheight, objectJSON.coneradialsegments);
          break;
        case "CylinderBufferGeometry":
          objectGeometry = new THREE.CylinderGeometry(objectJSON.cylinderradiustop, objectJSON.cylinderradiusbottom, objectJSON.cylinderheight, objectJSON.cylinderradialsegments);
          break;
        case "DodecahedronBufferGeometry":
          objectGeometry = new THREE.DodecahedronGeometry(objectJSON.dodecahedronradius);
          break;
        case "IcosahedronBufferGeometry":
          objectGeometry = new THREE.IcosahedronGeometry(objectJSON.icosahedronradius);
          break;
        case "OctahedronBufferGeometry":
          objectGeometry = new THREE.OctahedronGeometry(objectJSON.octahedronradius);
          break;
        case "SphereBufferGeometry":
          objectGeometry = new THREE.SphereGeometry(objectJSON.sphereradius, objectJSON.spherewidthsegments, objectJSON.sphereheightsegments);
          break;
        case "TetrahedronBufferGeometry":
          objectGeometry = new THREE.TetrahedronGeometry(objectJSON.tetrahedronradius);
          break;
        default:
          break;
      }
      processObject(objectGeometry, objectJSON.positionx, objectJSON.positiony, objectJSON.positionz, objectJSON.rotationx, objectJSON.rotationy, objectJSON.rotationz, objectJSON.scalex, objectJSON.scaley, objectJSON.scalez, objectJSON.color, objectJSON.textureURL, objectJSON.mass, objectJSON.linearvelocityx, objectJSON.linearvelocityy, objectJSON.linearvelocityz, objectJSON.angularvelocityx, objectJSON.angularvelocityy, objectJSON.angularvelocityz);
    }
  }

  function onWindowResize() {
    console.log("resizing");
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    cameraCube.aspect = window.innerWidth / window.innerHeight;
    cameraCube.updateProjectionMatrix();

    cameraOrtho.left = -window.innerWidth / 2;
    cameraOrtho.right = window.innerWidth / 2;
    cameraOrtho.top = window.innerHeight / 2;
    cameraOrtho.bottom = -window.innerHeight / 2;
    cameraOrtho.updateProjectionMatrix();

    //hud.scale.set(window.innerWidth / 10, window.innerHeight / 10, 1);
    //hud.position.set((window.innerWidth - hud.material.map.image.width / 2) / 2, (window.innerHeight - hud.material.map.image.height / 2) / 2, 1);

    vrEffect.setSize(window.innerWidth, window.innerHeight);
  }

  function render() {
    vrDisplay.requestAnimationFrame(render);
    var deltaTime = clock.getDelta();
    updatePhysics(deltaTime);
    vrControls.update();
    Reticulum.update();
    renderer.clear();
    cameraCube.rotation.copy(camera.rotation);
    vrEffect.render(sceneCube, cameraCube);
    if (hasBackground) {
      renderer.clear();
    }
    vrEffect.render(scene, camera);
    vrEffect.render(sceneOrtho, cameraOrtho);
    vrEffect.submitFrame();
  }

  function updatePhysics(deltaTime) {
    physicsWorld.stepSimulation(deltaTime, 10);
    for (var i = 0; i < rigidBodies.length; i++) {
      var ms = rigidBodies[i].userData.physicsBody.getMotionState();
      if (ms) {
        ms.getWorldTransform(transformAux1);
        var p = transformAux1.getOrigin();
        var q = transformAux1.getRotation();
        rigidBodies[i].position.set(p.x(),p.y(),p.z());
        rigidBodies[i].quaternion.set(q.x(), q.y(), q.z(), q.w());
      }
    }
  }

  function processObject(objectGeometry, positionx, positiony, positionz, rotationx, rotationy, rotationz, scalex, scaley, scalez, color, textureURL, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz) {
    objectGeometry.vertices.forEach(function(v) {
      v.x = v.x * scalex;
      v.y = v.y * scaley;
      v.z = v.z * scalez;
    });
    var objectMaterial;
    if (textureURL === "") {
      objectMaterial = new THREE.MeshPhongMaterial({color: color, shading: THREE.FlatShading, side: THREE.DoubleSide});
    } else {
      var texture = new THREE.TextureLoader().load(textureURL);
      objectMaterial = new THREE.MeshPhongMaterial({color: color, map: texture, shading: THREE.FlatShading, side: THREE.DoubleSide});
    }
    var object = new THREE.Mesh(objectGeometry, objectMaterial);
    var objectShape = new Ammo.btConvexHullShape();
    for (var i = 0; i < objectGeometry.vertices.length; i++) {
      objectShape.addPoint(new Ammo.btVector3(objectGeometry.vertices[i].x, objectGeometry.vertices[i].y, objectGeometry.vertices[i].z));
    }
    object.position.set(positionx, positiony, positionz);
    object.rotation.set(rotationx, rotationy, rotationz);
    objectShape.setMargin(margin);
    id++;
    createRigidBody(object, objectShape, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz, id);
    idToObject[id] = object;
    return id;
  }

  addBox = function addBox({positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x7f7f00, textureURL = "", mass = 10, width = 4, height = 4, depth = 4, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0} = {}) {
    var boxGeometry = new THREE.BoxGeometry(width, height, depth);
    return processObject(boxGeometry, positionx, positiony, positionz, rotationx, rotationy, rotationz, scalex, scaley, scalez, color, textureURL, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz);
  }

  addCone = function addCone({positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x7f007f, textureURL = "", mass = 10, radius = 2, height = 4, radialSegments = 16, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0} = {}) {
    var coneGeometry = new THREE.ConeGeometry(radius, height, radialSegments);
    return processObject(coneGeometry, positionx, positiony, positionz, rotationx, rotationy, rotationz, scalex, scaley, scalez, color, textureURL, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz);
  }

  addCylinder = function addCylinder({positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x007f7f, textureURL = "", mass = 10, radiusTop = 2, radiusBottom = 2, height = 4, radialSegments = 16, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0} = {}) {
    var cylinderGeometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
    return processObject(cylinderGeometry, positionx, positiony, positionz, rotationx, rotationy, rotationz, scalex, scaley, scalez, color, textureURL, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz);
  }

  addDodecahedron = function addDodecahedron({positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x7f7fff, textureURL = "", mass = 10, radius = 2, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0} = {}) {
    var dodecahedronGeometry = new THREE.DodecahedronGeometry(radius);
    return processObject(dodecahedronGeometry, positionx, positiony, positionz, rotationx, rotationy, rotationz, scalex, scaley, scalez, color, textureURL, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz);
  }

  addIcosahedron = function addIcosahedron({positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x7fff7f, textureURL = "", mass = 10, radius = 2, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0} = {}) {
    var icosahedronGeometry = new THREE.IcosahedronGeometry(radius);
    return processObject(icosahedronGeometry, positionx, positiony, positionz, rotationx, rotationy, rotationz, scalex, scaley, scalez, color, textureURL, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz);
  }

  addOctahedron = function addOctahedron({positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0xff7f7f, textureURL = "", mass = 10, radius = 2, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0} = {}) {
    var octahedronGeometry = new THREE.OctahedronGeometry(radius);
    return processObject(octahedronGeometry, positionx, positiony, positionz, rotationx, rotationy, rotationz, scalex, scaley, scalez, color, textureURL, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz);
  }

  addSphere = function addSphere({positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0xffff7f, textureURL = "", mass = 10, radius = 2, widthSegments = 16, heightSegments = 16, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0} = {}) {
    var sphereGeometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    return processObject(sphereGeometry, positionx, positiony, positionz, rotationx, rotationy, rotationz, scalex, scaley, scalez, color, textureURL, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz);
  }

  addTetrahedron = function addTetrahedron({positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0xff7fff, textureURL = "", mass = 10, radius = 2, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0} = {}) {
    var tetrahedronGeometry = new THREE.TetrahedronGeometry(radius);
    return processObject(tetrahedronGeometry, positionx, positiony, positionz, rotationx, rotationy, rotationz, scalex, scaley, scalez, color, textureURL, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz);
  }

  removeObject = function removeObject(id) {
    if (idToObject.hasOwnProperty(id)) {
      rigidBodies.splice(rigidBodies.indexOf(idToObject[id]), 1);
      scene.remove(idToObject[id]);
      physicsWorld.removeRigidBody(idToPhysicsBody[id]);
      delete idToObject[id];
      delete idToPhysicsBody[id];
    } else {
      return "invalid id";
    }
  }

  getObjectCount = function getObjectCount() {
    return rigidBodies.length;
  }

  getObjectPositionX = function getObjectPositionX(id) {
    if (idToObject.hasOwnProperty(id)) {
      return idToObject[id].position.x;
    } else {
      return "invalid id";
    }
  }

  getObjectPositionY = function getObjectPositionY(id) {
    if (idToObject.hasOwnProperty(id)) {
      return idToObject[id].position.y;
    } else {
      return "invalid id";
    }
  }

  getObjectPositionZ = function getObjectPositionZ(id) {
    if (idToObject.hasOwnProperty(id)) {
      return idToObject[id].position.z;
    } else {
      return "invalid id";
    }
  }

  getObjectRotationX = function getObjectRotationX(id) {
    if (idToObject.hasOwnProperty(id)) {
      return idToObject[id].rotation.x;
    } else {
      return "invalid id";
    }
  }

  getObjectRotationY = function getObjectRotationY(id) {
    if (idToObject.hasOwnProperty(id)) {
      return idToObject[id].rotation.y;
    } else {
      return "invalid id";
    }
  }

  getObjectRotationZ = function getObjectRotationZ(id) {
    if (idToObject.hasOwnProperty(id)) {
      return idToObject[id].rotation.z;
    } else {
      return "invalid id";
    }
  }

  getObjectScaleX = function getObjectScaleX(id) {
    if (idToObject.hasOwnProperty(id)) {
      return idToObject[id].scale.x;
    } else {
      return "invalid id";
    }
  }

  getObjectScaleY = function getObjectScaleY(id) {
    if (idToObject.hasOwnProperty(id)) {
      return idToObject[id].scale.y;
    } else {
      return "invalid id";
    }
  }

  getObjectScaleZ = function getObjectScaleZ(id) {
    if (idToObject.hasOwnProperty(id)) {
      return idToObject[id].scale.z;
    } else {
      return "invalid id";
    }
  }

  getObjectColor = function getObjectColor(id) {
    if (idToObject.hasOwnProperty(id)) {
      return idToObject[id].material.color.getHex();
    } else {
      return "invalid id";
    }
  }

  getObjectLinearVelocityX = function getObjectLinearVelocityX(id) {
    if (idToObject.hasOwnProperty(id)) {
      return idToPhysicsBody[id].getLinearVelocity().x();
    } else {
      return "invalid id";
    }
  }

  getObjectLinearVelocityY = function getObjectLinearVelocityY(id) {
    if (idToObject.hasOwnProperty(id)) {
      return idToPhysicsBody[id].getLinearVelocity().y();
    } else {
      return "invalid id";
    }
  }

  getObjectLinearVelocityZ = function getObjectLinearVelocityZ(id) {
    if (idToObject.hasOwnProperty(id)) {
      return idToPhysicsBody[id].getLinearVelocity().z();
    } else {
      return "invalid id";
    }
  }

  getObjectAngularVelocityX = function getObjectAngularVelocityX(id) {
    if (idToObject.hasOwnProperty(id)) {
      return idToPhysicsBody[id].getAngularVelocity().x();
    } else {
      return "invalid id";
    }
  }

  getObjectAngularVelocityY = function getObjectAngularVelocityY(id) {
    if (idToObject.hasOwnProperty(id)) {
      return idToPhysicsBody[id].getAngularVelocity().y();
    } else {
      return "invalid id";
    }
  }

  getObjectAngularVelocityZ = function getObjectAngularVelocityZ(id) {
    if (idToObject.hasOwnProperty(id)) {
      return idToPhysicsBody[id].getAngularVelocity().z();
    } else {
      return "invalid id";
    }
  }

  getCameraX = function getCameraX() {
    return dummy.position.x;
  }

  getCameraY = function getCameraY() {
    return dummy.position.y;
  }

  getCameraZ = function getCameraZ() {
    return dummy.position.z;
  }

/*
  getObjectColorR = function getObjectColorR(id) {
    if (idToObject.hasOwnProperty(id)) {
      return idToObject[id].material.color.r;
    } else {
      return "invalid id";
    }
  }

  getObjectColorG = function getObjectColorG(id) {
    if (idToObject.hasOwnProperty(id)) {
      return idToObject[id].material.color.g;
    } else {
      return "invalid id";
    }
  }

  getObjectColorB = function getObjectColorB(id) {
    if (idToObject.hasOwnProperty(id)) {
      return idToObject[id].material.color.b;
    } else {
      return "invalid id";
    }
  }
*/

  setObjectColor = function setObjectColor(id, hex) {
    if (idToObject.hasOwnProperty(id)) {
      idToObject[id].material.color = new THREE.Color(hex);
    } else {
      return "invalid id";
    }
  }

  setObjectLinearVelocity = function setObjectLinearVelocity(id, x, y, z) {
    if (idToObject.hasOwnProperty(id)) {
      idToPhysicsBody[id].setLinearVelocity(new Ammo.btVector3(x, y, z));
    } else {
      return "invalid id";
    }
  }

  setObjectAngularVelocity = function setObjectAngularVelocity(id, x, y, z) {
    if (idToObject.hasOwnProperty(id)) {
      idToPhysicsBody[id].setAngularVelocity(new Ammo.btVector3(x, y, z));
    } else {
      return "invalid id";
    }
  }

  setGravity = function setGravity(x, y, z) {
    physicsWorld.setGravity(new Ammo.btVector3(x, y, z));
  }

  setCamera = function setCamera(x, y, z) {
    dummy.position.set(x, y, z);
  }

  setBackground = function setBackground(background) {
    if (background !== "") {
      var equirectTexture = new THREE.TextureLoader().load(background);
      equirectTexture.mapping = THREE.EquirectangularReflectionMapping;
      equirectMaterial.uniforms["tEquirect"].value = equirectTexture;
      renderer.autoClear = false;
    } else {
      renderer.autoClear = true;
    }
  }
}

var addBox;
var addCone;
var addCylinder;
var addDodecahedron;
var addIcosahedron;
var addOctahedron;
var addSphere;
var addTetrahedron;
var removeObject;

var getObjectCount;

var getObjectPositionX;
var getObjectPositionY;
var getObjectPositionZ;
var getObjectRotationX;
var getObjectRotationY;
var getObjectRotationZ;
var getObjectScaleX;
var getObjectScaleY;
var getObjectScaleZ;
var getObjectColor;

var getObjectLinearVelocityX;
var getObjectLinearVelocityY;
var getObjectLinearVelocityZ;
var getObjectAngularVelocityX;
var getObjectAngularVelocityY;
var getObjectAngularVelocityZ;

var getCameraX;
var getCameraY;
var getCameraZ;

var setObjectColor;

var setObjectLinearVelocity;
var setObjectAngularVelocity;

var setGravity;
var setCamera;
var setBackground;
