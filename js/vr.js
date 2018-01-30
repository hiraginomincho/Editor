"use strict";

if (window.opener) {
  var sceneJSONString = window.opener.sceneJSONString;
  initVR();
} else {
  window.alert("This page should only be accessed through the VR Editor.");
}

function initVR() {
  var polyfill = new WebVRPolyfill();
  var fullscreenButton = document.getElementById("vr-fullscreen");
  var vrButton = document.getElementById("vr-switch");
  var playButton = document.getElementById("vr-play");
  var playSim = false;
  document.addEventListener("fullscreenchange", function() {
    console.log("fullscreenchange");
  });
  document.addEventListener("webkitfullscreenchange", function() {
    console.log("webkitfullscreenchange");
  });
  document.addEventListener("fullscreenerror", function() {
    console.log("fullscreenerror");
  });
  document.addEventListener("webkitfullscreenerror", function() {
    console.log("webkitfullscreenerror");
  });
  fullscreenButton.addEventListener("click", function() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
    console.log("requesting fullscreen");
  });
  vrButton.addEventListener("click", function() {
    windowHeight = window.innerHeight;
    if (vrDisplay) {
      vrDisplay.requestPresent([{source: renderer.domElement}]);
    } else {
      window.alert("VR not supported: navigator.getVRDisplays() is empty.");
    }
  });
  playButton.addEventListener("click", function() {
    if (playSim) {
      playButton.innerHTML = "Play";
    } else {
      playButton.innerHTML = "Pause";
      if (typeof procedures !== "undefined") {
        if (typeof procedures.onstart === "function") {
          procedures.onstart();
        }
      }
    }
    playSim = !playSim;
  });

  var renderer = new THREE.WebGLRenderer();
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var windowHeight;

  var hasBackground;

  var shadows;

  var scene, controls, vrEffect, vrDisplay;
  var camera;

  var cameraCube, sceneCube, equirectMaterial;

  var cameraOrtho, sceneOrtho;

  var physicsWorld;

  var rigidBodies = [];
  var softBodies = [];

  var huds = [];
  var hudTexts = [];
  var hudPositions = [];

  var margin = 0.01;

  var clock = new THREE.Clock();
  var transformAux1 = new Ammo.btTransform();
  var softBodyHelpers = new Ammo.btSoftBodyHelpers();

  var idToObjectProperties = {};
  var idToObject = {};
  var idToPhysicsBody = {};
  var objectID = -1;

  var idToLightProperties = {};
  var idToLight = {};
  var lightID = -1;

  var inVR = false;

  var raycaster;

  init();

  function init() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x32383f);
    renderer.autoClear = false;
    //renderer.shadowMap.enabled = true;
    //renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    cameraCube = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10000);

    cameraOrtho = new THREE.OrthographicCamera(-window.innerWidth / 2, window.innerWidth / 2, window.innerHeight / 2, -window.innerHeight / 2, 1, 10);
    cameraOrtho.position.z = 10;

    scene = new THREE.Scene();

    sceneCube = new THREE.Scene();

    sceneOrtho = new THREE.Scene();

    vrEffect = new THREE.VREffect(renderer);
    vrEffect.setSize(window.innerWidth, window.innerHeight);
    vrEffect.autoSubmitFrame = false;

    var collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
    var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    var broadphase = new Ammo.btDbvtBroadphase();
    var solver = new Ammo.btSequentialImpulseConstraintSolver();
    var softBodySolver = new Ammo.btDefaultSoftBodySolver();
    physicsWorld = new Ammo.btSoftRigidDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);

    var equirectShader = THREE.ShaderLib["equirect"];

    equirectMaterial = new THREE.ShaderMaterial({fragmentShader: getFrag(), vertexShader: equirectShader.vertexShader, uniforms: equirectShader.uniforms, depthWrite: false, side: THREE.BackSide});

    var backgroundMesh = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), equirectMaterial);
    sceneCube.add(backgroundMesh);

    importScene(JSON.parse(sceneJSONString));

    raycaster = new THREE.Raycaster();

    /*
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
    */

    navigator.getVRDisplays().then(function(vrDisplays) {
        if (false && vrDisplays.length) {
          vrDisplay = vrDisplays[0];
          controls = new THREE.VRControls(camera);
          vrDisplay.requestAnimationFrame(render);
        } else {
          requestAnimationFrame(render);
        }
      });

    window.addEventListener("resize", onWindowResize);
    window.addEventListener("vrdisplaypresentchange", onWindowResize);
    window.addEventListener("vrdisplaypresentchange", resizeHUDs);
    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
  }

  function onTouchStart(event) {
    if (typeof procedures !== "undefined") {
      if (typeof procedures.ontouchstart === "function") {
        var touches = event.changedTouches;
        for (var i = 0; i < touches.length; i++) {
          var mouse = new THREE.Vector2((touches[i].clientX / window.innerWidth) * 2 - 1, -(touches[i].clientY / window.innerHeight) * 2 + 1);
          raycaster.setFromCamera(mouse, camera);
          var intersects = raycaster.intersectObjects(Object.values(idToObject));
          var targetx = null;
          var targety = null;
          var targetz = null;
          var object = null;
          if (intersects.length > 0) {
            targetx = intersects[0].point.x;
            targety = intersects[0].point.y;
            targetz = intersects[0].point.z;
            object = intersects[0].object.userData.id;
          }
          var touch = (new THREE.Vector3()).set(mouse.x, mouse.y, 0.5).unproject(camera);
          procedures.ontouchstart(touches[i].clientX, touches[i].clientY, touch, targetx, targety, targetz, object, touches[i].identifier);
        }
      }
    }
  }

  function onTouchMove(event) {
    if (typeof procedures !== "undefined") {
      if (typeof procedures.ontouchmove === "function") {
        var touches = event.changedTouches;
        for (var i = 0; i < touches.length; i++) {
          var mouse = new THREE.Vector2((touches[i].clientX / window.innerWidth) * 2 - 1, -(touches[i].clientY / window.innerHeight) * 2 + 1);
          raycaster.setFromCamera(mouse, camera);
          var intersects = raycaster.intersectObjects(Object.values(idToObject));
          var targetx = null;
          var targety = null;
          var targetz = null;
          var object = null;
          if (intersects.length > 0) {
            targetx = intersects[0].point.x;
            targety = intersects[0].point.y;
            targetz = intersects[0].point.z;
            object = intersects[0].object.userData.id;
          }
          var touch = (new THREE.Vector3()).set(mouse.x, mouse.y, 0.5).unproject(camera);
          procedures.ontouchmove(touches[i].clientX, touches[i].clientY, touch, targetx, targety, targetz, object, touches[i].identifier);
        }
      }
    }
  }

  function onTouchEnd(event) {
    if (typeof procedures !== "undefined") {
      if (typeof procedures.ontouchend === "function") {
        var touches = event.changedTouches;
        for (var i = 0; i < touches.length; i++) {
          var mouse = new THREE.Vector2((touches[i].clientX / window.innerWidth) * 2 - 1, -(touches[i].clientY / window.innerHeight) * 2 + 1);
          raycaster.setFromCamera(mouse, camera);
          var intersects = raycaster.intersectObjects(Object.values(idToObject));
          var targetx = null;
          var targety = null;
          var targetz = null;
          var object = null;
          if (intersects.length > 0) {
            targetx = intersects[0].point.x;
            targety = intersects[0].point.y;
            targetz = intersects[0].point.z;
            object = intersects[0].object.userData.id;
          }
          var touch = (new THREE.Vector3()).set(mouse.x, mouse.y, 0.5).unproject(camera);
          procedures.ontouchend(touches[i].clientX, touches[i].clientY, touch, targetx, targety, targetz, object, touches[i].identifier);
        }
      }
    }
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

  function createRigidBody(object, physicsShape, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz, friction, restitution, collision, id) {
    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(object.position.x, object.position.y, object.position.z));
    transform.setRotation(new Ammo.btQuaternion(object.quaternion.x, object.quaternion.y, object.quaternion.z, object.quaternion.w));
    var motionState = new Ammo.btDefaultMotionState(transform);
    var localInertia = new Ammo.btVector3(0, 0, 0);
    physicsShape.calculateLocalInertia(mass, localInertia);
    var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
    rbInfo.set_m_friction(friction);
    rbInfo.set_m_restitution(restitution);
    var body = new Ammo.btRigidBody(rbInfo);
    body.setLinearVelocity(new Ammo.btVector3(linearvelocityx, linearvelocityy, linearvelocityz));
    body.setAngularVelocity(new Ammo.btVector3(angularvelocityx, angularvelocityy, angularvelocityz));
    object.userData.physicsBody = body;
    scene.add(object);
    if (mass > 0) {
      rigidBodies.push(object);
      body.setActivationState(4);
    }
    if (collision) {
      physicsWorld.addRigidBody(body);
    } else {
      physicsWorld.addRigidBody(body, 0, 0);
    }
    idToPhysicsBody[id] = body;
  }

  function createSoftBody(bufGeometry, object, mass, pressure, friction, collision, id) {
    var volumeSoftBody = softBodyHelpers.CreateFromTriMesh(physicsWorld.getWorldInfo(), bufGeometry.ammoVertices, bufGeometry.ammoIndices, bufGeometry.ammoIndices.length / 3, true);
    var sbConfig = volumeSoftBody.get_m_cfg();
    sbConfig.set_viterations(40);
    sbConfig.set_piterations(40);
    if (collision) {
      sbConfig.set_collisions(0x11);
    } else {
      sbConfig.set_collisions(0);
    }
    sbConfig.set_kDF(friction);
    sbConfig.set_kDP(0.01);
    sbConfig.set_kPR(pressure);
    volumeSoftBody.get_m_materials().at(0).set_m_kLST(0.9);
    volumeSoftBody.get_m_materials().at(0).set_m_kAST(0.9);
    if (mass == 0) {
      alert("mass of soft body " + object.name + " cannot be 0; changing to 10");
      mass = 10;
    }
    volumeSoftBody.setTotalMass(mass, false);
    Ammo.castObject(volumeSoftBody, Ammo.btCollisionObject).getCollisionShape().setMargin(margin);
    scene.add(object);
    physicsWorld.addSoftBody(volumeSoftBody, 1, -1);
    object.userData.physicsBody = volumeSoftBody;
    softBodies.push(object);
    volumeSoftBody.setActivationState(4);
    idToPhysicsBody[id] = volumeSoftBody;
  }

  function importScene(sceneJSON) {
    var worldJSON = sceneJSON[0];
    renderer.setClearColor(worldJSON.backgroundcolor);
    if (worldJSON.backgroundtexture !== "") {
      var equirectTexture = new THREE.TextureLoader().load(worldJSON.backgroundtexture);
      equirectTexture.mapping = THREE.EquirectangularReflectionMapping;
      equirectMaterial.uniforms["tEquirect"].value = equirectTexture;
      hasBackground = false;
    } else {
      hasBackground = true;
    }
    physicsWorld.setGravity(new Ammo.btVector3(worldJSON.gravityx, worldJSON.gravityy, worldJSON.gravityz));
    physicsWorld.getWorldInfo().set_m_gravity(new Ammo.btVector3(worldJSON.gravityx, worldJSON.gravityy, worldJSON.gravityz));
    camera = new THREE.PerspectiveCamera(worldJSON.camerafov, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(worldJSON.camerax, worldJSON.cameray, worldJSON.cameraz);
    camera.lookAt(new THREE.Vector3(worldJSON.targetx, worldJSON.targety, worldJSON.targetz));
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableKeys = false;
    controls.target.x = worldJSON.targetx;
    controls.target.y = worldJSON.targety;
    controls.target.z = worldJSON.targetz;
    scene.add(camera);
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
      addObjectJSON(createObjectJSON(objectJSON));
    }
    var lightsJSON = sceneJSON[3];
    for (var i = 0; i < lightsJSON.length; i++) {
      var lightJSON = lightsJSON[i];
      addLightJSON(createLightJSON(lightJSON));
    }
  }

  function createObjectJSON(properties) {
    var id = ++objectID;
    idToObjectProperties[id] = properties;
    return id;
  }

  createObject = createObjectJSON;

  function createLightJSON(properties) {
    var id = ++lightID;
    idToLightProperties[id] = properties;
    return id;
  }

  createLight = createLightJSON;

  function addObjectJSON(id) {
    if (idToObject.hasOwnProperty(id)) {
      alert("object " + id + " already in scene");
      return;
    }
    var objectJSON = idToObjectProperties[id];
    var objectGeometry;
    if (objectJSON.soft) {
      switch (objectJSON.type) {
        case "BoxBufferGeometry":
          objectGeometry = new THREE.BoxBufferGeometry(objectJSON.boxwidth, objectJSON.boxheight, objectJSON.boxdepth, objectJSON.boxwidthsegments, objectJSON.boxheightsegments, objectJSON.boxdepthsegments);
          break;
        case "ConeBufferGeometry":
          objectGeometry = new THREE.ConeBufferGeometry(objectJSON.coneradius, objectJSON.coneheight, objectJSON.coneradialsegments);
          break;
        case "CylinderBufferGeometry":
          objectGeometry = new THREE.CylinderBufferGeometry(objectJSON.cylinderradiustop, objectJSON.cylinderradiusbottom, objectJSON.cylinderheight, objectJSON.cylinderradialsegments);
          break;
        case "DodecahedronBufferGeometry":
          objectGeometry = new THREE.DodecahedronBufferGeometry(objectJSON.dodecahedronradius);
          break;
        case "IcosahedronBufferGeometry":
          objectGeometry = new THREE.IcosahedronBufferGeometry(objectJSON.icosahedronradius);
          break;
        case "OctahedronBufferGeometry":
          objectGeometry = new THREE.OctahedronBufferGeometry(objectJSON.octahedronradius);
          break;
        case "SphereBufferGeometry":
          objectGeometry = new THREE.SphereBufferGeometry(objectJSON.sphereradius, objectJSON.spherewidthsegments, objectJSON.sphereheightsegments);
          break;
        case "TetrahedronBufferGeometry":
          objectGeometry = new THREE.TetrahedronBufferGeometry(objectJSON.tetrahedronradius);
          break;
        default:
          return;
      }
    } else {
      switch (objectJSON.type) {
        case "BoxBufferGeometry":
          objectGeometry = new THREE.BoxGeometry(objectJSON.boxwidth, objectJSON.boxheight, objectJSON.boxdepth, objectJSON.boxwidthsegments, objectJSON.boxheightsegments, objectJSON.boxdepthsegments);
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
    }
    processObject(objectGeometry, objectJSON.name, objectJSON.positionx, objectJSON.positiony, objectJSON.positionz, objectJSON.rotationx, objectJSON.rotationy, objectJSON.rotationz, objectJSON.scalex, objectJSON.scaley, objectJSON.scalez, objectJSON.color, objectJSON.opacity, objectJSON.textureURL, objectJSON.mass, objectJSON.linearvelocityx, objectJSON.linearvelocityy, objectJSON.linearvelocityz, objectJSON.angularvelocityx, objectJSON.angularvelocityy, objectJSON.angularvelocityz, objectJSON.pressure, objectJSON.friction, objectJSON.restitution, objectJSON.flatshading, objectJSON.wireframe, objectJSON.collision, objectJSON.soft, id);
  }

  addObject = addObjectJSON;

  function addLightJSON(id) {
    if (idToLight.hasOwnProperty(id)) {
      alert("light " + id + " already in scene");
      return;
    }
    var lightJSON = idToLightProperties[id];
    var light;
    switch (lightJSON.type) {
      case "AmbientLight":
        light = new THREE.AmbientLight(lightJSON.color, lightJSON.intensity);
        break;
      case "DirectionalLight":
        light = new THREE.DirectionalLight(lightJSON.color, lightJSON.intensity);
        light.position.set(lightJSON.positionx, lightJSON.positiony, lightJSON.positionz);
        break;
      case "HemisphereLight":
        light = new THREE.HemisphereLight(lightJSON.skycolor, lightJSON.groundcolor, lightJSON.intensity);
        light.position.set(lightJSON.positionx, lightJSON.positiony, lightJSON.positionz);
        break;
      case "PointLight":
        light = new THREE.PointLight(lightJSON.color, lightJSON.intensity);
        light.position.set(lightJSON.positionx, lightJSON.positiony, lightJSON.positionz);
        break;
      case "SpotLight":
        light = new THREE.SpotLight(lightJSON.color, lightJSON.intensity, lightJSON.distance, lightJSON.angle, lightJSON.penumbra, lightJSON.decay);
        light.position.set(lightJSON.positionx, lightJSON.positiony, lightJSON.positionz);
        break;
      default:
        return;
    }
    processLight(light, id);
  }

  addLight = addLightJSON;

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
      if (typeof procedures !== "undefined") {
        if (typeof procedures.onrender === "function") {
          procedures.onrender();
        }
      }
    }
    controls.update();
    //Reticulum.update();
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
    for (var i = 0; i < softBodies.length; i++) {
      var object = softBodies[i];
      var geometry = object.geometry;
      var softBody = object.userData.physicsBody;
      var volumePositions = geometry.attributes.position.array;
      var volumeNormals = geometry.attributes.normal.array;
      var association = geometry.ammoIndexAssociation;
      var numVerts = association.length;
      var nodes = softBody.get_m_nodes();
      for (var j = 0; j < numVerts; j++) {
        var node = nodes.at(j);
        var nodePos = node.get_m_x();
        var x = nodePos.x();
        var y = nodePos.y();
        var z = nodePos.z();
        var nodeNormal = node.get_m_n();
        var nx = nodeNormal.x();
        var ny = nodeNormal.y();
        var nz = nodeNormal.z();
        var assocVertex = association[j];
        for (var k = 0, kl = assocVertex.length; k < kl; k++) {
          var indexVertex = assocVertex[k];
          volumePositions[indexVertex] = x;
          volumeNormals[indexVertex] = nx;
          indexVertex++;
          volumePositions[indexVertex] = y;
          volumeNormals[indexVertex] = ny;
          indexVertex++;
          volumePositions[indexVertex] = z;
          volumeNormals[indexVertex] = nz;
        }
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.normal.needsUpdate = true;
    }
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

  function processObject(objectGeometry, name, positionx, positiony, positionz, rotationx, rotationy, rotationz, scalex, scaley, scalez, color, opacity, textureURL, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz, pressure, friction, restitution, flatshading, wireframe, collision, soft, id) {
    if (!soft) {
      objectGeometry.vertices.forEach(function(v) {
        v.x = v.x * scalex;
        v.y = v.y * scaley;
        v.z = v.z * scalez;
      });
    }
    var objectMaterial;
    if (textureURL === "") {
      objectMaterial = new THREE.MeshPhongMaterial({color: color, flatShading: flatshading, side: THREE.DoubleSide, wireframe: wireframe});
    } else {
      var texture = new THREE.TextureLoader().load(textureURL);
      objectMaterial = new THREE.MeshPhongMaterial({color: color, map: texture, flatShading: flatshading, side: THREE.DoubleSide, wireframe: wireframe});
    }
    objectMaterial.opacity = opacity;
    if (opacity < 1) {
      objectMaterial.transparent = true;
    }
    if (soft) {
      objectGeometry.rotateX(rotationx);
      objectGeometry.rotateY(rotationy);
      objectGeometry.rotateZ(rotationz);
      objectGeometry.scale(scalex, scaley, scalez);
      objectGeometry.translate(positionx, positiony, positionz);
      processGeometry(objectGeometry);
      var object = new THREE.Mesh(objectGeometry, objectMaterial);
      if (shadows) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
      object.frustumCulled = false;
      object.name = name;
      createSoftBody(objectGeometry, object, mass, pressure, friction, collision, id);
    } else {
      var object = new THREE.Mesh(objectGeometry, objectMaterial);
      if (shadows) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
      object.name = name;
      object.position.set(positionx, positiony, positionz);
      object.rotation.set(rotationx, rotationy, rotationz);
      var objectShape = new Ammo.btConvexHullShape();
      for (var i = 0; i < objectGeometry.vertices.length; i++) {
        objectShape.addPoint(new Ammo.btVector3(objectGeometry.vertices[i].x, objectGeometry.vertices[i].y, objectGeometry.vertices[i].z));
      }
      objectShape.setMargin(margin);
      createRigidBody(object, objectShape, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz, friction, restitution, collision, id);
    }
    idToObject[id] = object;
    object.userData.id = id;
  }

  function processLight(light, id) {
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
    scene.add(light);
    idToLight[id] = light;
  }

  function typeToString(type) {
    switch (type) {
      case "BoxBufferGeometry":
        return "box";
      case "ConeBufferGeometry":
        return "cone";
      case "CylinderBufferGeometry":
        return "cylinder";
      case "DodecahedronBufferGeometry":
        return "dodecahedron";
      case "IcosahedronBufferGeometry":
        return "icosahedron";
      case "OctahedronBufferGeometry":
        return "octahedron";
      case "SphereBufferGeometry":
        return "sphere";
      case "TetrahedronBufferGeometry":
        return "tetrahedron";
      case "AmbientLight":
        return "ambient";
      case "DirectionalLight":
        return "directional";
      case "HemisphereLight":
        return "hemisphere";
      case "PointLight":
        return "point";
      default:
        return "spot";
    }
  }

  function processGeometry(bufGeometry) {
    var geometry = new THREE.Geometry().fromBufferGeometry(bufGeometry);
    var vertsDiff = geometry.mergeVertices();
    var indexedBufferGeom = createIndexedBufferGeometryFromGeometry(geometry);
    mapIndices(bufGeometry, indexedBufferGeom);
  }

  function createIndexedBufferGeometryFromGeometry(geometry) {
    var numVertices = geometry.vertices.length;
    var numFaces = geometry.faces.length;
    var bufferGeom = new THREE.BufferGeometry();
    var vertices = new Float32Array(numVertices * 3);
    var indices = new (numFaces * 3 > 65535 ? Uint32Array : Uint16Array)(numFaces * 3);
    for (var i = 0; i < numVertices; i++) {
      var p = geometry.vertices[i];
      var i3 = i * 3;
      vertices[i3] = p.x;
      vertices[i3 + 1] = p.y;
      vertices[i3 + 2] = p.z;
    }
    for (var i = 0; i < numFaces; i++) {
      var f = geometry.faces[i];
      var i3 = i * 3;
      indices[i3] = f.a;
      indices[i3 + 1] = f.b;
      indices[i3 + 2] = f.c;
    }
    bufferGeom.setIndex(new THREE.BufferAttribute(indices, 1));
    bufferGeom.addAttribute("position", new THREE.BufferAttribute(vertices, 3));
    return bufferGeom;
  }

  function isEqual(x1, y1, z1, x2, y2, z2) {
    var delta = 0.000001;
    return Math.abs(x2 - x1) < delta && Math.abs(y2 - y1) < delta && Math.abs(z2 - z1) < delta;
  }

  function mapIndices(bufGeometry, indexedBufferGeom) {
    var vertices = bufGeometry.attributes.position.array;
    var idxVertices = indexedBufferGeom.attributes.position.array;
    var indices = indexedBufferGeom.index.array;
    var numIdxVertices = idxVertices.length / 3;
    var numVertices = vertices.length / 3;
    bufGeometry.ammoVertices = idxVertices;
    bufGeometry.ammoIndices = indices;
    bufGeometry.ammoIndexAssociation = [];
    for (var i = 0; i < numIdxVertices; i++) {
      var association = [];
      bufGeometry.ammoIndexAssociation.push(association);
      var i3 = i * 3;
      for (var j = 0; j < numVertices; j++) {
        var j3 = j * 3;
        if (isEqual(idxVertices[i3], idxVertices[i3 + 1], idxVertices[i3 + 2], vertices[j3], vertices[j3 + 1], vertices[j3 + 2])) {
          association.push(j3);
        }
      }
    }
  }

  setObjectProperty = function setObjectProperty(id, property, value) {
    if (!idToObjectProperties.hasOwnProperty(id)) {
      alert("invalid id: " + id);
      return;
    }
    var properties = idToObjectProperties[id];
    properties[property] = value;
    if (idToObject.hasOwnProperty(id) && !properties.soft) {
      var object = idToObject[id];
      switch (property) {
        case "name":
          object.name = value;
          break;
        case "positionx":
          object.userData.physicsBody.getWorldTransform().setOrigin(new Ammo.btVector3(value, object.position.y, object.position.z));
          break;
        case "positiony":
          object.userData.physicsBody.getWorldTransform().setOrigin(new Ammo.btVector3(object.position.x, value, object.position.z));
          break;
        case "positionz":
          object.userData.physicsBody.getWorldTransform().setOrigin(new Ammo.btVector3(object.position.x, object.position.y, value));
          break;
        case "rotationx":
          var newQuaternion = new Ammo.btQuaternion();
          newQuaternion.setEulerZYX(object.rotation.z, object.rotation.y, value);
          object.userData.physicsBody.getWorldTransform().setRotation(newQuaternion);
          break;
        case "rotationy":
          var newQuaternion = new Ammo.btQuaternion();
          newQuaternion.setEulerZYX(object.rotation.z, value, object.rotation.x);
          object.userData.physicsBody.getWorldTransform().setRotation(newQuaternion);
          break;
        case "rotationz":
          var newQuaternion = new Ammo.btQuaternion();
          newQuaternion.setEulerZYX(value, object.rotation.y, object.rotation.x);
          object.userData.physicsBody.getWorldTransform().setRotation(newQuaternion);
          break;
        case "color":
          object.material.color = new THREE.Color(value);
          break;
        case "opacity":
          object.material.opacity = value;
          if (value < 1) {
            object.material.transparent = true;
          } else {
            object.material.transparent = false;
          }
          break;
        case "wireframe":
          object.material.wireframe = value;
        default:
          removeObject(id);
          addObjectJSON(id);
      }
    }
  }

  getObjectProperty = function getObjectProperty(id, property) {
    if (!idToObjectProperties.hasOwnProperty(id)) {
      alert("invalid id: " + id);
      return;
    }
    var properties = idToObjectProperties[id];
    if (property === "type") {
      return typeToString(properties[property]);
    }
    if (idToObject.hasOwnProperty(id) && !properties.soft) {
      var object = idToObject[id];
      var physicsBody = idToPhysicsBody[id];
    } else {
      return properties[property];
    }
    switch (property) {
      case "positionx":
        return object.position.x;
      case "positiony":
        return object.position.y;
      case "positionz":
        return object.position.z;
      case "rotationx":
        return object.rotation.x;
      case "rotationy":
        return object.rotation.y;
      case "rotationz":
        return object.rotation.z;
      case "linearvelocityx":
        return physicsBody.getLinearVelocity().x();
      case "linearvelocityy":
        return physicsBody.getLinearVelocity().y();
      case "linearvelocityz":
        return physicsBody.getLinearVelocity().z();
      case "angularvelocityx":
        return physicsBody.getAngularVelocity().x();
      case "angularvelocityy":
        return physicsBody.getAngularVelocity().y();
      case "angularvelocityz":
        return physicsBody.getAngularVelocity().z();
      default:
        return properties[property];
    }
  }

  setLightProperty = function setLightProperty(id, property, value) {
    if (!idToLightProperties.hasOwnProperty(id)) {
      alert("invalid id: " + id);
      return;
    }
    var properties = idToLightProperties[id];
    properties[property] = value;
    if (idToLight.hasOwnProperty(id)) {
      var light = idToLight[id];
      switch (property) {
        case "name":
          light.name = value;
          break;
        case "positionx":
          light.position.x = value;
          break;
        case "positiony":
          light.position.y = value;
          break;
        case "positionz":
          light.position.z = value;
          break;
        case "color":
          light.color = new THREE.Color(value);
          break;
        case "skycolor":
          light.skyColor = new THREE.Color(value);
          break;
        case "groundcolor":
          light.groundColor = new THREE.Color(value);
          break;
        default:
          light[property] = value;
      }
    }
  }

  getLightProperty = function getLightProperty(id, property) {
    if (!idToLightProperties.hasOwnProperty(id)) {
      alert("invalid id: " + id);
      return;
    }
    if (property === "type") {
      return typeToString(idToLightProperties[id][property]);
    }
    return idToLightProperties[id][property];
  }

  removeObject = function removeObject(id) {
    if (!idToObject.hasOwnProperty(id)) {
      alert("object " + id + " not in scene");
      return;
    }
    var properties = idToObjectProperties[id];
    var object = idToObject[id];
    var physicsBody = idToPhysicsBody[id];
    if (properties.soft) {
      softBodies.splice(softBodies.indexOf(object), 1);
    } else {
      properties.positionx = object.position.x;
      properties.positiony = object.position.y;
      properties.positionz = object.position.z;
      properties.rotationx = object.rotation.x;
      properties.rotationy = object.rotation.y;
      properties.rotationz = object.rotation.z;
      properties.linearvelocityx = physicsBody.getLinearVelocity().x();
      properties.linearvelocityy = physicsBody.getLinearVelocity().y();
      properties.linearvelocityz = physicsBody.getLinearVelocity().z();
      properties.angularvelocityx = physicsBody.getAngularVelocity().x();
      properties.angularvelocityy = physicsBody.getAngularVelocity().y();
      properties.angularvelocityy = physicsBody.getAngularVelocity().z();
      rigidBodies.splice(rigidBodies.indexOf(object), 1);
    }
    scene.remove(object);
    physicsWorld.removeCollisionObject(physicsBody);
    delete idToObject[id];
    delete idToPhysicsBody[id];
  }

  removeLight = function removeLight(id) {
    if (!idToLight.hasOwnProperty(id)) {
      alert("light " + id + " not in scene");
      return;
    }
    scene.remove(idToLight[id]);
    delete idToLight[id];
  }

  setCameraProperty = function setCameraProperty(property, value) {
    switch (property) {
      case "positionx":
        camera.position.x = value;
        break;
      case "positiony":
        camera.position.y = value;
        break;
      case "positionz":
        camera.position.z = value;
        break;
      case "targetx":
        controls.target.x = value;
        break;
      case "targety":
        controls.target.y = value;
        break;
      case "targetz":
        controls.target.z = value;
        break;
      case "fov":
        camera.fov = value;
        camera.updateProjectionMatrix();
        break;
      default:
        controls.enabled = value;
    }
  }

  getCameraProperty = function getCameraProperty(property) {
    switch (property) {
      case "positionx":
        return camera.position.x;
      case "positiony":
        return camera.position.y;
      case "positionz":
        return camera.position.z;
      case "targetx":
        return controls.target.x;
      case "targety":
        return controls.target.y;
      case "targetz":
        return controls.target.z;
      case "fov":
        return camera.fov;
      default:
        return controls.enabled;
    }
  }

  getObjects = function getObjects() {
    return Object.keys(idToObject);
  }

  getLights = function getLights() {
    return Object.keys(idToLight);
  }

  setWorldProperty = function setWorldProperty(property, value) {
    switch (property) {
      case "backgroundcolor":
        renderer.setClearColor(color);
        break;
      case "gravityx":
        physicsWorld.setGravity(new Ammo.btVector3(value, physicsWorld.getGravity().y(), physicsWorld.getGravity().z()));
        physicsWorld.getWorldInfo().set_m_gravity(new Ammo.btVector3(value, physicsWorld.getGravity().y(), physicsWorld.getGravity().z()));
        break;
      case "gravityy":
        physicsWorld.setGravity(new Ammo.btVector3(physicsWorld.getGravity().x(), value, physicsWorld.getGravity().z()));
        physicsWorld.getWorldInfo().set_m_gravity(new Ammo.btVector3(physicsWorld.getGravity().x(), value, physicsWorld.getGravity().z()));
        break;
      case "gravityz":
        physicsWorld.setGravity(new Ammo.btVector3(physicsWorld.getGravity().x(), physicsWorld.getGravity().y(), value));
        physicsWorld.getWorldInfo().set_m_gravity(new Ammo.btVector3(physicsWorld.getGravity().x(), physicsWorld.getGravity().y(), value));
        break;
      default:
        shadows = value;
        renderer.shadowMap.enabled = value;
        for (var key in idToObject) {
          idToObject[key].castShadow = value;
          idToObject[key].receiveShadow = value;
        }
        for (var key in idToLight) {
          if (!idToLight[key].isAmbientLight && !idToLight[key].isHemisphereLight) {
            idToLight[key].castShadow = value;
          }
        }
    }
  }

  getWorldProperty = function getWorldProperty(property) {
    switch (property) {
      case "backgroundcolor":
        return renderer.getClearColor().getHex();
      case "gravityx":
        return physicsWorld.getGravity().x();
      case "gravityy":
        return physicsWorld.getGravity().y();
      case "gravityz":
        return physicsWorld.getGravity().z();
      default:
        return shadows;
    }
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

  getHUDText = function getHUDText(i) {
    return hudTexts[i];
  }
}

var createObject;
var createLight;

var addObject;
var addLight;

var setObjectProperty;
var getObjectProperty;

var setLightProperty;
var getLightProperty;

var removeObject;
var removeLight;

var setCameraProperty;
var getCameraProperty;

var getObjects;
var getLights;

var setWorldProperty;
var getWorldProperty;

var setBackground;

var setHUDText;
var getHUDText;
