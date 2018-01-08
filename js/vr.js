"use strict";

if (window.opener) {
  var sceneJSONString = window.opener.sceneJSONString;
  initVR();
} else {
  window.alert("This page should only be accessed through the VR Editor.");
}

function initVR() {
  var polyfill = new WebVRPolyfill();
  var vrButton = document.getElementById("vr-switch");
  var playButton = document.getElementById("vr-play");
  var playSim = false;
  vrButton.addEventListener("click", function() {
    windowHeight = window.innerHeight;
    if (vrDisplay) {
      vrDisplay.requestPresent([{source: renderer.domElement}]);
      renderer.domElement.requestFullscreen();
    } else {
      window.alert("VR not supported: navigator.getVRDisplays() is empty.");
    }
  });
  playButton.addEventListener("click", function() {
    if (playSim) {
      playButton.innerHTML = "Play";
    } else {
      playButton.innerHTML = "Pause";
    }
    playSim = !playSim;
  });

  var renderer = new THREE.WebGLRenderer();
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var windowHeight;

  var hasBackground;

  var shadows;

  var scene, controls, vrEffect, vrDisplay;;
  var dummy, camera;

  var cameraCube, sceneCube, equirectMaterial;

  var cameraOrtho, sceneOrtho;

  var physicsWorld;

  var rigidBodies = [];

  var huds = [];
  var hudTexts = [];
  var hudPositions = [];

  var margin = 0.01;

  var clock = new THREE.Clock();
  var transformAux1 = new Ammo.btTransform();

  var idToObject = {};
  var idToPhysicsBody = {};
  var objectID = -1;

  var idToLight = {};
  var lightID = -1;

  var inVR = false;

  init();

  function init() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x32383f);
    renderer.autoClear = false;
    //renderer.shadowMap.enabled = true;
    //renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    canvas = renderer.domElement;

    cameraCube = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10000);

    cameraOrtho = new THREE.OrthographicCamera(-window.innerWidth / 2, window.innerWidth / 2, window.innerHeight / 2, -window.innerHeight / 2, 1, 10);
    cameraOrtho.position.z = 10;

    scene = new THREE.Scene();

    sceneCube = new THREE.Scene();

    sceneOrtho = new THREE.Scene();

    vrEffect = new THREE.VREffect(renderer);
    vrEffect.setSize(window.innerWidth, window.innerHeight);
    vrEffect.autoSubmitFrame = false;

    var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    var broadphase = new Ammo.btDbvtBroadphase();
    var solver = new Ammo.btSequentialImpulseConstraintSolver();
    physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);

    var equirectShader = THREE.ShaderLib["equirect"];

    equirectMaterial = new THREE.ShaderMaterial({fragmentShader: getFrag(), vertexShader: equirectShader.vertexShader, uniforms: equirectShader.uniforms, depthWrite: false, side: THREE.BackSide});

    var backgroundMesh = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), equirectMaterial);
    sceneCube.add(backgroundMesh);

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

    navigator.getVRDisplays().then(function(vrDisplays) {
        if (vrDisplays.length) {
          vrDisplay = vrDisplays[0];
          controls = new THREE.VRControls(camera);
          vrDisplay.requestAnimationFrame(render);
        } else {
          controls = new THREE.OrbitControls(dummy, renderer.domElement);
          requestAnimationFrame(render);
        }
      });

    window.addEventListener("resize", onWindowResize);
    window.addEventListener("vrdisplaypresentchange", onWindowResize);
    window.addEventListener("vrdisplaypresentchange", resizeHUDs);
  }

  function resizeHUDs() {
    for(var i = 0; i < huds.length; i++) {
      var hud = huds[i];
      var scaleFactor = 60 * windowHeight / 800;
      if (!inVR) {
        hud.scale.set(hud.scale.x / scaleFactor, hud.scale.y / scaleFactor, 1);
        hud.position.set(hud.position.x / scaleFactor, hud.position.y / scaleFactor, 1);
      } else {
        huds[i].scale.set(hud.scale.x * scaleFactor, hud.scale.y * scaleFactor, 1);
        hud.position.set(hud.position.x * scaleFactor, hud.position.y * scaleFactor, 1);
      }
    }
    inVR = !inVR;
  }

  function getHUD(i, text) {
    var canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
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
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    hudTexts[i] = text;
    return canvas;
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
    idToPhysicsBody[objectID] = body;
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
    if (worldJSON.background !== "") {
      var equirectTexture = new THREE.TextureLoader().load(worldJSON.background);
      equirectTexture.mapping = THREE.EquirectangularReflectionMapping;
      equirectMaterial.uniforms["tEquirect"].value = equirectTexture;
      hasBackground = false;
    } else {
      hasBackground = true;
    }
    shadows = worldJSON.shadows;
    renderer.shadowMap.enabled = shadows;
    var labelsJSON = sceneJSON[1];
    for (var i = 0; i < labelsJSON.length; i++) {
      var labelJSON = labelsJSON[i];
      var hudTexture = new THREE.Texture(getHUD(i, ""));
      hudTexture.needsUpdate = true;
      createHUD(i, hudTexture, 2 * labelJSON.left - 300, 350 - 2 * labelJSON.top);
      hudPositions.push([labelJSON.left, labelJSON.top]);
    }
    var objectsJSON = sceneJSON[2];
    for (var i = 0; i < objectsJSON.length; i++) {
      var objectJSON = objectsJSON[i];
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
          return;
      }
      processObject(objectGeometry, objectJSON.positionx, objectJSON.positiony, objectJSON.positionz, objectJSON.rotationx, objectJSON.rotationy, objectJSON.rotationz, objectJSON.scalex, objectJSON.scaley, objectJSON.scalez, objectJSON.color, objectJSON.textureURL, objectJSON.mass, objectJSON.linearvelocityx, objectJSON.linearvelocityy, objectJSON.linearvelocityz, objectJSON.angularvelocityx, objectJSON.angularvelocityy, objectJSON.angularvelocityz);
    }
    var lightsJSON = sceneJSON[3];
    for (var i = 0; i < lightsJSON.length; i++) {
      var lightJSON = lightsJSON[i];
      switch (lightJSON.type) {
        case "AmbientLight":
          var ambientLight = new THREE.AmbientLight(lightJSON.color, lightJSON.intensity);
          addLight(ambientLight);
          break;
        case "DirectionalLight":
          var directionalLight = new THREE.DirectionalLight(lightJSON.color, lightJSON.intensity);
          directionalLight.position.set(lightJSON.positionx, lightJSON.positiony, lightJSON.positionz);
          addLight(directionalLight);
          break;
        case "HemisphereLight":
          var hemisphereLight = new THREE.HemisphereLight(lightJSON.skycolor, lightJSON.groundcolor, lightJSON.intensity);
          hemisphereLight.position.set(lightJSON.positionx, lightJSON.positiony, lightJSON.positionz);
          addLight(hemisphereLight);
          break;
        case "PointLight":
          var pointLight = new THREE.PointLight(lightJSON.color, lightJSON.intensity);
          pointLight.position.set(lightJSON.positionx, lightJSON.positiony, lightJSON.positionz);
          addLight(pointLight);
          break;
        case "SpotLight":
          var spotLight = new THREE.SpotLight(lightJSON.color, lightJSON.intensity, lightJSON.distance, lightJSON.angle, lightJSON.penumbra, lightJSON.decay);
          spotLight.position.set(lightJSON.positionx, lightJSON.positiony, lightJSON.positionz);
          addLight(spotLight);
          break;
        default:
          return;
      }
    }
  }

  function addLight(light) {
    if (!light.isAmbientLight && !light.isHemisphereLight) {
      light.shadow.mapSize.width = 512;
      light.shadow.mapSize.height = 512;
      light.shadow.camera.left = -25;
      light.shadow.camera.right = 25;
      light.shadow.camera.top = 25;
      light.shadow.camera.bottom = -25;
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 100;
      if (shadows) {
        light.castShadow = true;
      }
    }
    lightID++;
    scene.add(light);
    idToLight[lightID] = light;
    return lightID;
  }

  function createHUD(i, texture, x, y) {
    var hudMaterial = new THREE.SpriteMaterial({map: texture});
    var hud = new THREE.Sprite(hudMaterial);
    var hudWidth = hudMaterial.map.image.width;
    var hudHeight = hudMaterial.map.image.height;
    var scaleFactor = window.innerHeight / 800;
    hud.scale.set(200 * scaleFactor, 100 * scaleFactor, 1);
    hud.position.set(x * scaleFactor, y * scaleFactor, 1);
    huds[i] = hud;
    sceneOrtho.add(hud);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    cameraCube.aspect = window.innerWidth / window.innerHeight;
    cameraCube.updateProjectionMatrix();

    cameraOrtho.left = -window.innerWidth / 2;
    cameraOrtho.right = window.innerWidth / 2;
    cameraOrtho.top = window.innerHeight / 2;
    cameraOrtho.bottom = -window.innerHeight / 2;
    cameraOrtho.updateProjectionMatrix();

    vrEffect.setSize(window.innerWidth, window.innerHeight);
  }

  function render() {
    if (vrDisplay) {
      vrDisplay.requestAnimationFrame(render);
    } else {
      requestAnimationFrame(render);
    }
    if (playSim) {
      var deltaTime = clock.getDelta();
      updatePhysics(deltaTime);
      if (typeof frameUpdate === "function") {
        frameUpdate();
      }
    }
    controls.update();
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
      objectMaterial = new THREE.MeshPhongMaterial({color: color, flatShading: true, side: THREE.DoubleSide});
    } else {
      var texture = new THREE.TextureLoader().load(textureURL);
      objectMaterial = new THREE.MeshPhongMaterial({color: color, map: texture, flatShading: true, side: THREE.DoubleSide});
    }
    var object = new THREE.Mesh(objectGeometry, objectMaterial);
    if (shadows) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
    var objectShape = new Ammo.btConvexHullShape();
    for (var i = 0; i < objectGeometry.vertices.length; i++) {
      objectShape.addPoint(new Ammo.btVector3(objectGeometry.vertices[i].x, objectGeometry.vertices[i].y, objectGeometry.vertices[i].z));
    }
    object.position.set(positionx, positiony, positionz);
    object.rotation.set(rotationx, rotationy, rotationz);
    objectShape.setMargin(margin);
    objectID++;
    createRigidBody(object, objectShape, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz, objectID);
    idToObject[objectID] = object;
    return objectID;
  }

  addBox = function addBox({positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x551410, textureURL = "", mass = 10, width = 4, height = 4, depth = 4, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0} = {}) {
    var boxGeometry = new THREE.BoxGeometry(width, height, depth);
    return processObject(boxGeometry, positionx, positiony, positionz, rotationx, rotationy, rotationz, scalex, scaley, scalez, color, textureURL, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz);
  }

  addCone = function addCone({positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x553200, textureURL = "", mass = 10, radius = 2, height = 4, radialSegments = 16, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0} = {}) {
    var coneGeometry = new THREE.ConeGeometry(radius, height, radialSegments);
    return processObject(coneGeometry, positionx, positiony, positionz, rotationx, rotationy, rotationz, scalex, scaley, scalez, color, textureURL, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz);
  }

  addCylinder = function addCylinder({positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x554400, textureURL = "", mass = 10, radiusTop = 2, radiusBottom = 2, height = 4, radialSegments = 16, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0} = {}) {
    var cylinderGeometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
    return processObject(cylinderGeometry, positionx, positiony, positionz, rotationx, rotationy, rotationz, scalex, scaley, scalez, color, textureURL, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz);
  }

  addDodecahedron = function addDodecahedron({positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x194821, textureURL = "", mass = 10, radius = 2, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0} = {}) {
    var dodecahedronGeometry = new THREE.DodecahedronGeometry(radius);
    return processObject(dodecahedronGeometry, positionx, positiony, positionz, rotationx, rotationy, rotationz, scalex, scaley, scalez, color, textureURL, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz);
  }

  addIcosahedron = function addIcosahedron({positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x1e4353, textureURL = "", mass = 10, radius = 2, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0} = {}) {
    var icosahedronGeometry = new THREE.IcosahedronGeometry(radius);
    return processObject(icosahedronGeometry, positionx, positiony, positionz, rotationx, rotationy, rotationz, scalex, scaley, scalez, color, textureURL, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz);
  }

  addOctahedron = function addOctahedron({positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x002955, textureURL = "", mass = 10, radius = 2, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0} = {}) {
    var octahedronGeometry = new THREE.OctahedronGeometry(radius);
    return processObject(octahedronGeometry, positionx, positiony, positionz, rotationx, rotationy, rotationz, scalex, scaley, scalez, color, textureURL, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz);
  }

  addSphere = function addSphere({positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x1d1d47, textureURL = "", mass = 10, radius = 2, widthSegments = 16, heightSegments = 16, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0} = {}) {
    var sphereGeometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    return processObject(sphereGeometry, positionx, positiony, positionz, rotationx, rotationy, rotationz, scalex, scaley, scalez, color, textureURL, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz);
  }

  addTetrahedron = function addTetrahedron({positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x550f1c, textureURL = "", mass = 10, radius = 2, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0} = {}) {
    var tetrahedronGeometry = new THREE.TetrahedronGeometry(radius);
    return processObject(tetrahedronGeometry, positionx, positiony, positionz, rotationx, rotationy, rotationz, scalex, scaley, scalez, color, textureURL, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz);
  }

  addAmbientLight = function addAmbientLight({color = 0xffffff, intensity = 0.5} = {}) {
    var ambientLight = new THREE.AmbientLight(color, intensity);
    return addLight(ambientLight);
  }

  addDirectionalLight = function addDirectionalLight({positionx = 0, positiony = 0, positionz = 0, color = 0x00ffff, intensity = 1} = {}) {
    var directionalLight = new THREE.DirectionalLight(color, intensity);
    directionalLight.position.set(positionx, positiony, positionz);
    return addLight(directionalLight);
  }

  addHemisphereLight = function addHemisphereLight({skycolor = 0xff0000, groundcolor = 0x0000ff, intensity = 1} = {}) {
    var hemisphereLight = new THREE.HemisphereLight(skycolor, groundcolor, intensity);
    return addLight(hemisphereLight);
  }

  addPointLight = function addPointLight({positionx = 10, positiony = 10, positionz = 0, color = 0xff0000, intensity = 1} = {}) {
    var pointLight = new THREE.PointLight(color, intensity);
    pointLight.position.set(positionx, positiony, positionz);
    return addLight(pointLight);
  }

  addSpotLight = function addSpotLight({positionx = 0, positiony = 10, positionz = 10, color = 0x00ff00, intensity = 10, distance = 40, angle = 0.5236, penumbra = 0.2, decay = 1} = {}) {
    var spotLight = new THREE.SpotLight(color, intensity, distance, angle, penumbra, decay);
    spotLight.position.set(positionx, positiony, positionz);
    return addLight(spotLight);
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

  removeLight = function removeLight(id) {
    if (idToLight.hasOwnProperty(id)) {
      scene.remove(idToLight[id]);
      delete idToLight[id];
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

  getHUDText = function getHUDText(i) {
    return hudTexts[i];
  }

  setObjectPosition = function setObjectPosition(id, x, y, z) {
    if (idToObject.hasOwnProperty(id)) {
      idToObject[id].position.set(x, y, z);
      rigidBodies.indexOf(idToObject[id]).position.set(x, y, z);
    } else {
      return "invalid id";
    }
  }

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

  setHUDText = function setHUDText(i, text) {
    sceneOrtho.remove(huds[i]);
    var hudTexture = new THREE.Texture(getHUD(i, text));
    hudTexture.needsUpdate = true;
    createHUD(i, hudTexture, 2 * hudPositions[i][0] - 300, 350 - 2 * hudPositions[i][1]);
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

var addAmbientLight;
var addDirectionalLight;
var addHemisphereLight;
var addPointLight;
var addSpotLight;
var removeLight;

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

var getHUDText;

var setObjectPosition;
var setObjectColor;

var setObjectLinearVelocity;
var setObjectAngularVelocity;

var setGravity;
var setCamera;
var setBackground;

var setHUDText;

var canvas;

var frameUpdate;
