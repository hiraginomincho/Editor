"use strict";

var sceneJSONString = window.opener.sceneJSONString;

function initVR() {
  var vrButton = document.getElementById("vr-switch");
  vrButton.addEventListener("click", function() {
    vrDisplay.requestPresent([{source: renderer.domElement}]);
  });

  var renderer = new THREE.WebGLRenderer();

  var scene, vrControls, vrEffect, vrDisplay;
  var dummy, camera;

  var cameraCube, sceneCube, equirectMaterial;

  var physicsWorld;

  var rigidBodies = [];

  var margin = 0.05;

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
    //renderer.shadowMap.enabled = true;
    //renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    cameraCube = new THREE.PerspectiveCamera(70, renderer.domElement.clientWidth / renderer.domElement.clientHeight, 0.01, 10000);

    scene = new THREE.Scene();

    sceneCube = new THREE.Scene();

    vrEffect = new THREE.VREffect(renderer);
    vrEffect.setSize(window.innerWidth, window.innerHeight);

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
      renderer.autoClear = false;
    } else {
      renderer.autoClear = true;
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
      objectGeometry.vertices.forEach(function(v) {
        v.x = v.x * objectJSON.scalex;
        v.y = v.y * objectJSON.scaley;
        v.z = v.z * objectJSON.scalez;
      });
      var objectMaterial;
      if (objectJSON.textureURL === "") {
        objectMaterial = new THREE.MeshPhongMaterial({color: objectJSON.color, shading: THREE.FlatShading});
      } else {
        var texture = new THREE.TextureLoader().load(objectJSON.textureURL);
        objectMaterial = new THREE.MeshPhongMaterial({color: objectJSON.color, map: texture, shading: THREE.FlatShading});
      }
      var object = new THREE.Mesh(objectGeometry, objectMaterial);
      var objectShape = new Ammo.btConvexHullShape();
      for (var j = 0; j < objectGeometry.vertices.length; j++) {
        objectShape.addPoint(new Ammo.btVector3(objectGeometry.vertices[j].x, objectGeometry.vertices[j].y, objectGeometry.vertices[j].z));
      }
      object.position.set(objectJSON.positionx, objectJSON.positiony, objectJSON.positionz);
      object.rotation.set(objectJSON.rotationx, objectJSON.rotationy, objectJSON.rotationz);
      objectShape.setMargin(margin);
      id++;
      createRigidBody(object, objectShape, objectJSON.mass, objectJSON.linearvelocityx, objectJSON.linearvelocityy, objectJSON.linearvelocityz, objectJSON.angularvelocityx, objectJSON.angularvelocityy, objectJSON.angularvelocityz, id);
      idToObject[id] = object;
    }
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    cameraCube.aspect = editorDiv.clientWidth / editorDiv.clientHeight;
    cameraCube.updateProjectionMatrix();

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
    renderer.render(sceneCube, cameraCube);
    renderer.clearDepth();
    vrEffect.render(scene, camera);
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

  addBox = function addBox(positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x7f7f00, mass = 10, width = 4, height = 4, depth = 4, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0) {
    var boxGeometry = new THREE.BoxGeometry(width, height, depth);
    boxGeometry.vertices.forEach(function(v) {
      v.x = v.x * scalex;
      v.y = v.y * scaley;
      v.z = v.z * scalez;
    });
    var boxMaterial = new THREE.MeshPhongMaterial({color: color, shading: THREE.FlatShading});
    var box = new THREE.Mesh(boxGeometry, boxMaterial);
    var boxShape = new Ammo.btConvexHullShape();
    for (var i = 0; i < boxGeometry.vertices.length; i++) {
      boxShape.addPoint(new Ammo.btVector3(boxGeometry.vertices[i].x, boxGeometry.vertices[i].y, boxGeometry.vertices[i].z));
    }
    box.position.set(positionx, positiony, positionz);
    box.rotation.set(rotationx, rotationy, rotationz);
    boxShape.setMargin(margin);
    id++;
    createRigidBody(box, boxShape, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz, id);
    idToObject[id] = box;
    return id;
  }

  addCone = function addCone(positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x7f007f, mass = 10, radius = 2, height = 4, radialSegments = 16, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0) {
    var coneGeometry = new THREE.ConeGeometry(radius, height, radialSegments);
    coneGeometry.vertices.forEach(function(v) {
      v.x = v.x * scalex;
      v.y = v.y * scaley;
      v.z = v.z * scalez;
    });
    var coneMaterial = new THREE.MeshPhongMaterial({color: color, shading: THREE.FlatShading});
    var cone = new THREE.Mesh(coneGeometry, coneMaterial);
    var coneShape = new Ammo.btConvexHullShape();
    for (var i = 0; i < coneGeometry.vertices.length; i++) {
      coneShape.addPoint(new Ammo.btVector3(coneGeometry.vertices[i].x, coneGeometry.vertices[i].y, coneGeometry.vertices[i].z));
    }
    cone.position.set(positionx, positiony, positionz);
    cone.rotation.set(rotationx, rotationy, rotationz);
    coneShape.setMargin(margin);
    id++;
    createRigidBody(cone, coneShape, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz, id);
    idToObject[id] = cone;
    return id;
  }

  addCylinder = function addCylinder(positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x007f7f, mass = 10, radiusTop = 2, radiusBottom = 2, height = 4, radialSegments = 16, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0) {
    var cylinderGeometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
    cylinderGeometry.vertices.forEach(function(v) {
      v.x = v.x * scalex;
      v.y = v.y * scaley;
      v.z = v.z * scalez;
    });
    var cylinderMaterial = new THREE.MeshPhongMaterial({color: color, shading: THREE.FlatShading});
    var cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    var cylinderShape = new Ammo.btConvexHullShape();
    for (var i = 0; i < cylinderGeometry.vertices.length; i++) {
      cylinderShape.addPoint(new Ammo.btVector3(cylinderGeometry.vertices[i].x, cylinderGeometry.vertices[i].y, cylinderGeometry.vertices[i].z));
    }
    cylinder.position.set(positionx, positiony, positionz);
    cylinder.rotation.set(rotationx, rotationy, rotationz);
    cylinderShape.setMargin(margin);
    id++;
    createRigidBody(cylinder, cylinderShape, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz, id);
    idToObject[id] = cylinder;
    return id;
  }

  addDodecahedron = function addDodecahedron(positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x7f7fff, mass = 10, radius = 2, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0) {
    var dodecahedronGeometry = new THREE.DodecahedronGeometry(radius);
    dodecahedronGeometry.vertices.forEach(function(v) {
      v.x = v.x * scalex;
      v.y = v.y * scaley;
      v.z = v.z * scalez;
    });
    var dodecahedronMaterial = new THREE.MeshPhongMaterial({color: color, shading: THREE.FlatShading});
    var dodecahedron = new THREE.Mesh(dodecahedronGeometry, dodecahedronMaterial);
    var dodecahedronShape = new Ammo.btConvexHullShape();
    for (var i = 0; i < dodecahedronGeometry.vertices.length; i++) {
      dodecahedronShape.addPoint(new Ammo.btVector3(dodecahedronGeometry.vertices[i].x, dodecahedronGeometry.vertices[i].y, dodecahedronGeometry.vertices[i].z));
    }
    dodecahedron.position.set(positionx, positiony, positionz);
    dodecahedron.rotation.set(rotationx, rotationy, rotationz);
    dodecahedronShape.setMargin(margin);
    id++;
    createRigidBody(dodecahedron, dodecahedronShape, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz, id);
    idToObject[id] = dodecahedron;
    return id;
  }

  addIcosahedron = function addIcosahedron(positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x7fff7f, mass = 10, radius = 2, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0) {
    var icosahedronGeometry = new THREE.IcosahedronGeometry(radius);
    icosahedronGeometry.vertices.forEach(function(v) {
      v.x = v.x * scalex;
      v.y = v.y * scaley;
      v.z = v.z * scalez;
    });
    var icosahedronMaterial = new THREE.MeshPhongMaterial({color: color, shading: THREE.FlatShading});
    var icosahedron = new THREE.Mesh(icosahedronGeometry, icosahedronMaterial);
    var icosahedronShape = new Ammo.btConvexHullShape();
    for (var i = 0; i < icosahedronGeometry.vertices.length; i++) {
      icosahedronShape.addPoint(new Ammo.btVector3(icosahedronGeometry.vertices[i].x, icosahedronGeometry.vertices[i].y, icosahedronGeometry.vertices[i].z));
    }
    icosahedron.position.set(positionx, positiony, positionz);
    icosahedron.rotation.set(rotationx, rotationy, rotationz);
    icosahedronShape.setMargin(margin);
    id++;
    createRigidBody(icosahedron, icosahedronShape, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz, id);
    idToObject[id] = icosahedron;
    return id;
  }

  addOctahedron = function addOctahedron(positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0xff7f7f, mass = 10, radius = 2, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0) {
    var octahedronGeometry = new THREE.OctahedronGeometry(radius);
    octahedronGeometry.vertices.forEach(function(v) {
      v.x = v.x * scalex;
      v.y = v.y * scaley;
      v.z = v.z * scalez;
    });
    var octahedronMaterial = new THREE.MeshPhongMaterial({color: color, shading: THREE.FlatShading});
    var octahedron = new THREE.Mesh(octahedronGeometry, octahedronMaterial);
    var octahedronShape = new Ammo.btConvexHullShape();
    for (var i = 0; i < octahedronGeometry.vertices.length; i++) {
      octahedronShape.addPoint(new Ammo.btVector3(octahedronGeometry.vertices[i].x, octahedronGeometry.vertices[i].y, octahedronGeometry.vertices[i].z));
    }
    octahedron.position.set(positionx, positiony, positionz);
    octahedron.rotation.set(rotationx, rotationy, rotationz);
    octahedronShape.setMargin(margin);
    id++;
    createRigidBody(octahedron, octahedronShape, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz, id);
    idToObject[id] = octahedron;
    return id;
  }

  addSphere = function addSphere(positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0xffff7f, mass = 10, radius = 2, widthSegments = 16, heightSegments = 16, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0) {
    var sphereGeometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    sphereGeometry.vertices.forEach(function(v) {
      v.x = v.x * scalex;
      v.y = v.y * scaley;
      v.z = v.z * scalez;
    });
    var sphereMaterial = new THREE.MeshPhongMaterial({color: color, shading: THREE.FlatShading});
    var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    var sphereShape = new Ammo.btConvexHullShape();
    for (var i = 0; i < sphereGeometry.vertices.length; i++) {
      sphereShape.addPoint(new Ammo.btVector3(sphereGeometry.vertices[i].x, sphereGeometry.vertices[i].y, sphereGeometry.vertices[i].z));
    }
    sphere.position.set(positionx, positiony, positionz);
    sphere.rotation.set(rotationx, rotationy, rotationz);
    sphereShape.setMargin(margin);
    id++;
    createRigidBody(sphere, sphereShape, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz, id);
    idToObject[id] = sphere;
    return id;
  }

  addTetrahedron = function addTetrahedron(positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0xff7fff, mass = 10, radius = 2, linearvelocityx = 0, linearvelocityy = 0, linearvelocityz = 0, angularvelocityx = 0, angularvelocityy = 0, angularvelocityz = 0) {
    var tetrahedronGeometry = new THREE.TetrahedronGeometry(radius);
    tetrahedronGeometry.vertices.forEach(function(v) {
      v.x = v.x * scalex;
      v.y = v.y * scaley;
      v.z = v.z * scalez;
    });
    var tetrahedronMaterial = new THREE.MeshPhongMaterial({color: color, shading: THREE.FlatShading});
    var tetrahedron = new THREE.Mesh(tetrahedronGeometry, tetrahedronMaterial);
    var tetrahedronShape = new Ammo.btConvexHullShape();
    for (var i = 0; i < tetrahedronGeometry.vertices.length; i++) {
      tetrahedronShape.addPoint(new Ammo.btVector3(tetrahedronGeometry.vertices[i].x, tetrahedronGeometry.vertices[i].y, tetrahedronGeometry.vertices[i].z));
    }
    tetrahedron.position.set(positionx, positiony, positionz);
    tetrahedron.rotation.set(rotationx, rotationy, rotationz);
    tetrahedronShape.setMargin(margin);
    id++;
    createRigidBody(tetrahedron, tetrahedronShape, mass, linearvelocityx, linearvelocityy, linearvelocityz, angularvelocityx, angularvelocityy, angularvelocityz, id);
    idToObject[id] = tetrahedron;
    return id;
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

  setCamera = function setCamera(x, y, z) {
    dummy.position.set(x, y, z);
  }

  setGravity = function setGravity(x, y, z) {
    physicsWorld.setGravity(new Ammo.btVector3(x, y, z));
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

var setCamera;

var setGravity;

initVR();
