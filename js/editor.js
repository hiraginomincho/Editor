"use strict";

var sceneJSONString;

function initEditor() {
  var renderer = new THREE.WebGLRenderer();

  var objects = [];

  var scene, transformControls;
  var camera, orbitControls;
  var raycaster;
  var mouse = new THREE.Vector2();
  var onDownPosition = new THREE.Vector2();
  var onUpPosition = new THREE.Vector2();
  var INTERSECTED, CLICKED;

  var cameraCube, sceneCube, equirectMaterial;

  var editorDiv = document.getElementById("editor");

  var gravityXInput = document.getElementById("gravity-x");
  var gravityYInput = document.getElementById("gravity-y");
  var gravityZInput = document.getElementById("gravity-z");

  var cameraXInput = document.getElementById("camera-x");
  var cameraYInput = document.getElementById("camera-y");
  var cameraZInput = document.getElementById("camera-z");

  var backgroundInput = document.getElementById("background");

  var objectList = document.getElementById("object-list");
  var selectedObjectDiv;

  var positionXInput = document.getElementById("position-x");
  var positionYInput = document.getElementById("position-y");
  var positionZInput = document.getElementById("position-z");

  var rotationXInput = document.getElementById("rotation-x");
  var rotationYInput = document.getElementById("rotation-y");
  var rotationZInput = document.getElementById("rotation-z");

  var scaleXInput = document.getElementById("scale-x");
  var scaleYInput = document.getElementById("scale-y");
  var scaleZInput = document.getElementById("scale-z");

  var colorInput = document.getElementById("color");
  var textureInput = document.getElementById("texture");

  var massInput = document.getElementById("mass");

  var linearVelocityXInput = document.getElementById("linear-velocity-x");
  var linearVelocityYInput = document.getElementById("linear-velocity-y");
  var linearVelocityZInput = document.getElementById("linear-velocity-z");

  var angularVelocityXInput = document.getElementById("angular-velocity-x");
  var angularVelocityYInput = document.getElementById("angular-velocity-y");
  var angularVelocityZInput = document.getElementById("angular-velocity-z");

  var parameterWrapper1 = document.getElementById("parameter-wrapper-1");
  var parameterWrapper2 = document.getElementById("parameter-wrapper-2");
  var parameterWrapper3 = document.getElementById("parameter-wrapper-3");

  init();
  render();

  initControlButtons();
  initObjectButtons();
  initParameterControls();

  function init() {
    renderer.setSize(editorDiv.clientWidth, editorDiv.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x32383f);
    editorDiv.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(70, renderer.domElement.clientWidth / renderer.domElement.clientHeight, 0.01, 10000);
    camera.position.set(20, 20, 10);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    cameraCube = new THREE.PerspectiveCamera(70, renderer.domElement.clientWidth / renderer.domElement.clientHeight, 0.01, 10000);

    orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.25;
    orbitControls.enableKeys = false;

    scene = new THREE.Scene();

    sceneCube = new THREE.Scene();

    var gridHelper = new THREE.GridHelper(32, 32, 0xffffff, 0x808080);
    scene.add(gridHelper);

    var boxGeometry = new THREE.BoxBufferGeometry(4, 4, 4);
    var boxMaterial = new THREE.MeshPhongMaterial({color: 0x7f0000, shading: THREE.FlatShading});
    var box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.name = "Box";
    setOtherParameters(box);
    addToScene(box, false);

    box.position.y += 2;

    var sphereGeometry = new THREE.SphereBufferGeometry(2, 16, 16);
    var sphereMaterial = new THREE.MeshPhongMaterial({color: 0x007f00, shading: THREE.FlatShading});
    var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.name = "Sphere";
    setOtherParameters(sphere);
    addToScene(sphere, false);

    sphere.position.y += 12;

    var groundGeometry = new THREE.BoxBufferGeometry(24, 0.2, 24);
    var groundMaterial = new THREE.MeshPhongMaterial({color: 0x304962, shading: THREE.FlatShading});
    var ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.name = "Ground";
    setOtherParameters(ground);
    ground.mass = 0;
    addToScene(ground, false);

    ground.position.y = -0.1;

    var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    var directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight1.position.set(2, 8, 1).normalize();
    scene.add(directionalLight1);

    var directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.2);
    directionalLight2.position.set(-2, -8, -1).normalize();
    scene.add(directionalLight2);

    var equirectShader = THREE.ShaderLib["equirect"];

    equirectMaterial = new THREE.ShaderMaterial({fragmentShader: getFrag(), vertexShader: equirectShader.vertexShader, uniforms: equirectShader.uniforms, depthWrite: false, side: THREE.BackSide});

    var backgroundMesh = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), equirectMaterial);
    sceneCube.add(backgroundMesh);

    transformControls = new THREE.TransformControls(camera, renderer.domElement);
    transformControls.setSpace("local");
    scene.add(transformControls);

    transformControls.addEventListener("change", function() {
      updateInputs();
    });

    raycaster = new THREE.Raycaster();

    editorDiv.children[0].addEventListener("mousemove", onEditorMouseMove);
    editorDiv.children[0].addEventListener("mousedown", onEditorMouseDown);
    window.addEventListener("resize", onWindowResize);
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

  function onWindowResize() {
    camera.aspect = editorDiv.clientWidth / editorDiv.clientHeight;
    camera.updateProjectionMatrix();

    cameraCube.aspect = editorDiv.clientWidth / editorDiv.clientHeight;
    cameraCube.updateProjectionMatrix();

    renderer.setSize(editorDiv.clientWidth, editorDiv.clientHeight);
  }

  function getMousePosition(event) {
    var xPos = ((event.clientX - window.innerWidth / 6) / renderer.domElement.clientWidth) * 2 - 1;
    var yPos = -((event.clientY - renderer.domElement.offsetTop) / renderer.domElement.clientHeight) * 2 + 1;
    return [xPos, yPos];
  }

  function onEditorMouseMove(event) {
    event.preventDefault();
    mouse.fromArray(getMousePosition(event));
  }

  function onEditorMouseDown(event) {
    event.preventDefault();
    onDownPosition.fromArray(getMousePosition(event));
    editorDiv.addEventListener("mouseup", onEditorMouseUp);
  }

  function onEditorMouseUp(event) {
    onUpPosition.fromArray(getMousePosition(event));
    if (onDownPosition.distanceTo(onUpPosition) === 0) {
      raycaster.setFromCamera(mouse, camera);
      var intersects = raycaster.intersectObjects(objects);
      if (intersects.length > 0) {
        focus(intersects[0].object);
      } else if (CLICKED) {
        transformControls.detach();
        CLICKED = null;
        updateVisibility();
        parameterWrapper2.innerHTML = "";
        selectedObjectDiv.classList.remove("object-active");
        selectedObjectDiv.classList.add("object-inactive");
        selectedObjectDiv = null;
      }
    }
    editorDiv.children[0].removeEventListener("mouseup", onEditorMouseUp);
  }

  function focus(object) {
    var objectDiv = objectList.children[objects.indexOf(object)];
    objectDiv.classList.remove("object-inactive");
    objectDiv.classList.add("object-active");
    if (selectedObjectDiv && selectedObjectDiv != objectDiv) {
      selectedObjectDiv.classList.remove("object-active");
      selectedObjectDiv.classList.add("object-inactive");
    }
    selectedObjectDiv = objectDiv;
    transformControls.attach(object);
    CLICKED = object;
    updateInputs();
    updateVisibility();
    addObjectSpecificParameters();
  }

  function addToScene(object, focusObject) {
    scene.add(object);
    objects.push(object);
    addToObjectList(object);
    if (focusObject) {
      focus(object);
    }
  }

  function updateInputs() {
    if (CLICKED) {
      positionXInput.value = CLICKED.position.x.toFixed(3);
      positionYInput.value = CLICKED.position.y.toFixed(3);
      positionZInput.value = CLICKED.position.z.toFixed(3);
      rotationXInput.value = (CLICKED.rotation.x * 180 / Math.PI).toFixed(3);
      rotationYInput.value = (CLICKED.rotation.y * 180 / Math.PI).toFixed(3);
      rotationZInput.value = (CLICKED.rotation.z * 180 / Math.PI).toFixed(3);
      scaleXInput.value = CLICKED.scale.x.toFixed(3);
      scaleYInput.value = CLICKED.scale.y.toFixed(3);
      scaleZInput.value = CLICKED.scale.z.toFixed(3);
      colorInput.value = "#" + CLICKED.material.color.getHexString();
      textureInput.value = CLICKED.textureURL;
      massInput.value = CLICKED.mass.toFixed(3);
      linearVelocityXInput.value = CLICKED.linearVelocityX.toFixed(3);
      linearVelocityYInput.value = CLICKED.linearVelocityY.toFixed(3);
      linearVelocityZInput.value = CLICKED.linearVelocityZ.toFixed(3);
      angularVelocityXInput.value = CLICKED.angularVelocityX.toFixed(3);
      angularVelocityYInput.value = CLICKED.angularVelocityY.toFixed(3);
      angularVelocityZInput.value = CLICKED.angularVelocityZ.toFixed(3);
    }
  }

  function updateVisibility() {
    if (CLICKED) {
      parameterWrapper1.style.visibility = "visible";
      parameterWrapper3.style.visibility = "visible";
    } else {
      parameterWrapper1.style.visibility = "hidden";
      parameterWrapper3.style.visibility = "hidden";
    }
  }

  function render() {
    requestAnimationFrame(render);
    orbitControls.update();
    transformControls.update();
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(objects);
    if (intersects.length > 0) {
      if (INTERSECTED != intersects[0].object) {
        if (INTERSECTED) {
          INTERSECTED.material.emissive.setHex(INTERSECTED.baseHex);
        }
        INTERSECTED = intersects[0].object;
        INTERSECTED.material.emissive.setHex(0x222222);
      }
    } else {
      if (INTERSECTED) {
        INTERSECTED.material.emissive.setHex(INTERSECTED.baseHex);
      }
      INTERSECTED = null;
    }
    cameraCube.rotation.copy(camera.rotation);
    renderer.render(sceneCube, cameraCube);
    renderer.render(scene, camera);
  };

  function initControlButtons() {
    var translateButton = document.getElementById("translate");
    var rotateButton = document.getElementById("rotate");
    var scaleButton = document.getElementById("scale");
    translateButton.addEventListener("click", function() {
      translateButton.classList.remove("control-inactive");
      translateButton.classList.add("control-active");
      rotateButton.classList.remove("control-active");
      rotateButton.classList.add("control-inactive");
      scaleButton.classList.remove("control-active");
      scaleButton.classList.add("control-inactive");
      transformControls.setMode("translate");
    });
    rotateButton.addEventListener("click", function() {
      rotateButton.classList.remove("control-inactive");
      rotateButton.classList.add("control-active");
      translateButton.classList.remove("control-active");
      translateButton.classList.add("control-inactive");
      scaleButton.classList.remove("control-active");
      scaleButton.classList.add("control-inactive");
      transformControls.setMode("rotate");
    });
    scaleButton.addEventListener("click", function() {
      scaleButton.classList.remove("control-inactive");
      scaleButton.classList.add("control-active");
      translateButton.classList.remove("control-active");
      translateButton.classList.add("control-inactive");
      rotateButton.classList.remove("control-active");
      rotateButton.classList.add("control-inactive");
      transformControls.setMode("scale");
    });
    var duplicateButton = document.getElementById("duplicate");
    duplicateButton.addEventListener("click", function() {
      if (CLICKED) {
        var cloneGeometry = CLICKED.geometry.clone();
        cloneGeometry.parameters = CLICKED.geometry.parameters;
        cloneGeometry.type = CLICKED.geometry.type;
        var cloneMaterial = CLICKED.material.clone();
        var clone = CLICKED.clone();
        clone.geometry = cloneGeometry;
        clone.material = cloneMaterial;
        clone.position.addScalar(2);
        addToScene(clone, true);
      }
    });
    var importButton = document.getElementById("import");
    var importJSON = document.getElementById("import-json");
    importButton.addEventListener("click", function() {
      importJSON.click();
    });
    importJSON.addEventListener("change", function(event) {
      if (this.value !== "") {
        var reader = new FileReader();
        reader.onload = function(event) {
          importScene(JSON.parse(event.target.result));
        };
        reader.readAsText(event.target.files[0]);
        this.value = "";
      }
    });
    var exportButton = document.getElementById("export");
    exportButton.addEventListener("click", function() {
      exportScene();
    });
    var vrButton = document.getElementById("vr");
    vrButton.addEventListener("click", function() {
      sceneJSONString = generateSceneJSONString();
      var win = window.open("/vr.html", "_blank");
    });
    var deleteButton = document.getElementById("delete");
    deleteButton.addEventListener("click", function() {
      if (CLICKED) {
        transformControls.detach();
        var index = objects.indexOf(CLICKED);
        objects.splice(objects.indexOf(CLICKED), 1);
        scene.remove(CLICKED);
        CLICKED = null;
        updateVisibility();
        parameterWrapper2.innerHTML = "";
        selectedObjectDiv = null;
        objectList.removeChild(objectList.children[index]);
      }
    });
    var clearButton = document.getElementById("clear");
    clearButton.addEventListener("click", function() {
      clearScene();
    });
  }

  function importScene(sceneJSON) {
    var worldJSON = sceneJSON[0];
    gravityXInput.value = worldJSON.gravityx.toFixed(3);
    gravityYInput.value = worldJSON.gravityy.toFixed(3);
    gravityZInput.value = worldJSON.gravityz.toFixed(3);
    cameraXInput.value = worldJSON.camerax.toFixed(3);
    cameraYInput.value = worldJSON.cameray.toFixed(3);
    cameraZInput.value = worldJSON.cameraz.toFixed(3);
    if (worldJSON.background !== "") {
      var equirectTexture = new THREE.TextureLoader().load(worldJSON.background);
      equirectTexture.mapping = THREE.EquirectangularReflectionMapping;
      equirectMaterial.uniforms["tEquirect"].value = equirectTexture;
      renderer.autoClear = false;
    } else {
      equirectMaterial.uniforms["tEquirect"].value = null;
      renderer.autoClear = true;
    }
    for (var i = 1; i < sceneJSON.length; i++) {
      var objectJSON = sceneJSON[i];
      var objectGeometry;
      switch (objectJSON.type) {
        case "BoxBufferGeometry":
          objectGeometry = new THREE.BoxBufferGeometry(objectJSON.boxwidth, objectJSON.boxheight, objectJSON.boxdepth);
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
      var objectMaterial;
      if (objectJSON.textureURL === "") {
        objectMaterial = new THREE.MeshPhongMaterial({color: objectJSON.color, shading: THREE.FlatShading});
      } else {
        var texture = new THREE.TextureLoader().load(objectJSON.textureURL);
        objectMaterial = new THREE.MeshPhongMaterial({color: objectJSON.color, map: texture, shading: THREE.FlatShading});

        /*
        var loader = new THREE.TextureLoader();
        loader.load(objectJSON.textureURL, function(texture) {
          objectMaterial = new THREE.MeshPhongMaterial({color: objectJSON.color, map: texture, shading: THREE.FlatShading});
        }, null, function(xhr) {
          objectMaterial = new THREE.MeshPhongMaterial({color: objectJSON.color, shading: THREE.FlatShading});
        });
        */
      }
      var object = new THREE.Mesh(objectGeometry, objectMaterial);
      object.position.set(objectJSON.positionx, objectJSON.positiony, objectJSON.positionz);
      object.rotation.set(objectJSON.rotationx, objectJSON.rotationy, objectJSON.rotationz);
      object.scale.set(objectJSON.scalex, objectJSON.scaley, objectJSON.scalez);
      object.material.color = new THREE.Color(objectJSON.color);
      object.textureURL = objectJSON.textureURL;
      object.mass = objectJSON.mass;
      object.linearVelocityX = objectJSON.linearvelocityx;
      object.linearVelocityY = objectJSON.linearvelocityy;
      object.linearVelocityZ = objectJSON.linearvelocityz;
      object.angularVelocityX = objectJSON.angularvelocityx;
      object.angularVelocityY = objectJSON.angularvelocityy;
      object.angularVelocityZ = objectJSON.angularvelocityz;
      object.name = objectJSON.name;
      object.baseHex = object.material.emissive.getHex();
      addToScene(object, false);
    }
  }

  function clearScene() {
    if (CLICKED) {
      transformControls.detach();
    }
    for (var i = 0; i < objects.length; i++) {
      scene.remove(objects[i]);
    }
    objects = [];
    CLICKED = null;
    updateVisibility();
    parameterWrapper2.innerHTML = "";
    selectedObjectDiv = null;
    objectList.innerHTML = "";
  }

  function generateSceneJSONString() {
    var sceneJSON = [];
    var worldJSON = {};
    worldJSON.gravityx = gravityXInput.valueAsNumber;
    worldJSON.gravityy = gravityYInput.valueAsNumber;
    worldJSON.gravityz = gravityZInput.valueAsNumber;
    worldJSON.camerax = cameraXInput.valueAsNumber;
    worldJSON.cameray = cameraYInput.valueAsNumber;
    worldJSON.cameraz = cameraZInput.valueAsNumber;
    worldJSON.background = backgroundInput.value;
    sceneJSON[0] = worldJSON;
    for (var i = 0; i < objects.length; i++) {
      var objectJSON = {};
      var object = objects[i];
      objectJSON.type = object.geometry.type;
      objectJSON.name = object.name;
      objectJSON.positionx = object.position.x;
      objectJSON.positiony = object.position.y;
      objectJSON.positionz = object.position.z;
      objectJSON.rotationx = object.rotation.x;
      objectJSON.rotationy = object.rotation.y;
      objectJSON.rotationz = object.rotation.z;
      objectJSON.scalex = object.scale.x;
      objectJSON.scaley = object.scale.y;
      objectJSON.scalez = object.scale.z;
      objectJSON.color = object.material.color;
      objectJSON.textureURL = object.textureURL;
      objectJSON.mass = object.mass;
      switch (object.geometry.type) {
        case "BoxBufferGeometry":
          objectJSON.boxwidth = object.geometry.parameters.width;
          objectJSON.boxheight = object.geometry.parameters.height;
          objectJSON.boxdepth = object.geometry.parameters.depth;
          break;
        case "ConeBufferGeometry":
          objectJSON.coneradius = object.geometry.parameters.radius;
          objectJSON.coneheight = object.geometry.parameters.height;
          objectJSON.coneradialsegments = object.geometry.parameters.radialSegments;
          break;
        case "CylinderBufferGeometry":
          objectJSON.cylinderradiustop = object.geometry.parameters.radiusTop;
          objectJSON.cylinderradiusbottom = object.geometry.parameters.radiusBottom;
          objectJSON.cylinderheight = object.geometry.parameters.height;
          objectJSON.cylinderradialsegments = object.geometry.parameters.radialSegments;
          break;
        case "DodecahedronBufferGeometry":
          objectJSON.dodecahedronradius = object.geometry.parameters.radius;
          break;
        case "IcosahedronBufferGeometry":
          objectJSON.icosahedronradius = object.geometry.parameters.radius;
          break;
        case "OctahedronBufferGeometry":
          objectJSON.octahedronradius = object.geometry.parameters.radius;
          break;
        case "SphereBufferGeometry":
          objectJSON.sphereradius = object.geometry.parameters.radius;
          objectJSON.spherewidthsegments = object.geometry.parameters.widthSegments;
          objectJSON.sphereheightsegments = object.geometry.parameters.heightSegments;
          break;
        case "TetrahedronBufferGeometry":
          objectJSON.tetrahedronradius = object.geometry.parameters.radius;
          break;
        default:
          break;
      }
      objectJSON.linearvelocityx = object.linearVelocityX;
      objectJSON.linearvelocityy = object.linearVelocityY;
      objectJSON.linearvelocityz = object.linearVelocityZ;
      objectJSON.angularvelocityx = object.angularVelocityX;
      objectJSON.angularvelocityy = object.angularVelocityY;
      objectJSON.angularvelocityz = object.angularVelocityZ;
      sceneJSON[i + 1] = objectJSON;
    }
    return JSON.stringify(sceneJSON, null, "\t");
  }

  function exportScene() {
    window.open("data:application/json," + encodeURIComponent(generateSceneJSONString()), "_blank");
  }

  function initObjectButtons() {
    var boxButton = document.getElementById("box");
    var coneButton = document.getElementById("cone");
    var cylinderButton = document.getElementById("cylinder");
    var dodecahedronButton = document.getElementById("dodecahedron");
    var icosahedronButton = document.getElementById("icosahedron");
    var octahedronButton = document.getElementById("octahedron");
    var sphereButton = document.getElementById("sphere");
    var tetrahedronButton = document.getElementById("tetrahedron");
    boxButton.addEventListener("click", function() {
      var boxGeometry = new THREE.BoxBufferGeometry(4, 4, 4);
      var boxMaterial = new THREE.MeshPhongMaterial({color: 0x7f7f00, shading: THREE.FlatShading});
      var box = new THREE.Mesh(boxGeometry, boxMaterial);
      box.name = "Box";
      setOtherParameters(box);
      addToScene(box, true);
    });
    coneButton.addEventListener("click", function() {
      var coneGeometry = new THREE.ConeBufferGeometry(2, 4, 16);
      var coneMaterial = new THREE.MeshPhongMaterial({color: 0x7f007f, shading: THREE.FlatShading});
      var cone = new THREE.Mesh(coneGeometry, coneMaterial);
      cone.name = "Cone";
      setOtherParameters(cone);
      addToScene(cone, true);
    });
    cylinderButton.addEventListener("click", function() {
      var cylinderGeometry = new THREE.CylinderBufferGeometry(2, 2, 4, 16);
      var cylinderMaterial = new THREE.MeshPhongMaterial({color: 0x007f7f, shading: THREE.FlatShading});
      var cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
      cylinder.name = "Cylinder";
      setOtherParameters(cylinder);
      addToScene(cylinder, true);
    });
    dodecahedronButton.addEventListener("click", function() {
      var dodecahedronGeometry = new THREE.DodecahedronBufferGeometry(2);
      var dodecahedronMaterial = new THREE.MeshPhongMaterial({color: 0x7f7fff, shading: THREE.FlatShading});
      var dodecahedron = new THREE.Mesh(dodecahedronGeometry, dodecahedronMaterial);
      dodecahedron.name = "Dodecahedron";
      setOtherParameters(dodecahedron);
      addToScene(dodecahedron, true);
    });
    icosahedronButton.addEventListener("click", function() {
      var icosahedronGeometry = new THREE.IcosahedronBufferGeometry(2);
      var icosahedronMaterial = new THREE.MeshPhongMaterial({color: 0x7fff7f, shading: THREE.FlatShading});
      var icosahedron = new THREE.Mesh(icosahedronGeometry, icosahedronMaterial);
      icosahedron.name = "Icosahedron";
      setOtherParameters(icosahedron);
      addToScene(icosahedron, true);
    });
    octahedronButton.addEventListener("click", function() {
      var octahedronGeometry = new THREE.OctahedronBufferGeometry(2);
      var octahedronMaterial = new THREE.MeshPhongMaterial({color: 0xff7f7f, shading: THREE.FlatShading});
      var octahedron = new THREE.Mesh(octahedronGeometry, octahedronMaterial);
      octahedron.name = "Octahedron";
      setOtherParameters(octahedron);
      addToScene(octahedron, true);
    });
    sphereButton.addEventListener("click", function() {
      var sphereGeometry = new THREE.SphereBufferGeometry(2, 16, 16);
      var sphereMaterial = new THREE.MeshPhongMaterial({color: 0xffff7f, shading: THREE.FlatShading});
      var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.name = "Sphere";
      setOtherParameters(sphere);
      addToScene(sphere, true);
    });
    tetrahedronButton.addEventListener("click", function() {
      var tetrahedronGeometry = new THREE.TetrahedronBufferGeometry(2);
      var tetrahedronMaterial = new THREE.MeshPhongMaterial({color: 0xff7fff, shading: THREE.FlatShading});
      var tetrahedron = new THREE.Mesh(tetrahedronGeometry, tetrahedronMaterial);
      tetrahedron.name = "Tetrahedron";
      setOtherParameters(tetrahedron);
      addToScene(tetrahedron, true);
    });
  }

  function setOtherParameters(object) {
    object.textureURL = "";
    object.mass = 10;
    object.linearVelocityX = 0;
    object.linearVelocityY = 0;
    object.linearVelocityZ = 0;
    object.angularVelocityX = 0;
    object.angularVelocityY = 0;
    object.angularVelocityZ = 0;
    object.baseHex = object.material.emissive.getHex();
  }

  function addToObjectList(object) {
    var objectDiv = document.createElement("div");
    objectDiv.classList.add("object-item");
    objectDiv.classList.add("object-inactive");
    objectDiv.innerHTML = object.name;
    objectList.appendChild(objectDiv);
    objectDiv.addEventListener("click", function() {
      objectDiv.classList.remove("object-inactive");
      objectDiv.classList.add("object-active");
      if (selectedObjectDiv && selectedObjectDiv != objectDiv) {
        selectedObjectDiv.classList.remove("object-active");
        selectedObjectDiv.classList.add("object-inactive");
      }
      selectedObjectDiv = objectDiv;
      transformControls.attach(object);
      CLICKED = object;
      updateInputs();
      updateVisibility();
      addObjectSpecificParameters();
    });
    objectDiv.addEventListener("dblclick", function() {
      makeEditable(objectDiv);
    });
    objectDiv.addEventListener("keydown", function(event) {
      if (event.keyCode === 13/*Enter*/) {
        objectDiv.blur();
      }
    });
    objectDiv.addEventListener("blur", function() {
      if (objectDiv.innerHTML === "") {
        objectDiv.innerHTML = "Object";
      }
      object.name = objectDiv.innerHTML;
      objectDiv.contentEditable = false;
    });
  }

  function makeEditable(objectDiv) {
    objectDiv.contentEditable = true;
    var range = document.createRange();
    var sel = window.getSelection();
    range.setStart(objectDiv.childNodes[0], objectDiv.childNodes[0].length);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function initParameterControls() {
    addParameterListeners(gravityXInput, "world");
    addParameterListeners(gravityYInput, "world");
    addParameterListeners(gravityZInput, "world");
    addParameterListeners(cameraXInput, "world");
    addParameterListeners(cameraYInput, "world");
    addParameterListeners(cameraZInput, "world");
    addParameterListeners(backgroundInput, "background");
    addParameterListeners(positionXInput, "positionx");
    addParameterListeners(positionYInput, "positiony");
    addParameterListeners(positionZInput, "positionz");
    addParameterListeners(rotationXInput, "rotationx");
    addParameterListeners(rotationYInput, "rotationy");
    addParameterListeners(rotationZInput, "rotationz");
    addParameterListeners(scaleXInput, "scalex");
    addParameterListeners(scaleYInput, "scaley");
    addParameterListeners(scaleZInput, "scalez");
    colorInput.addEventListener("input", function() {
      if (CLICKED) {
        CLICKED.material.color = new THREE.Color(colorInput.value);
      }
    });
    addParameterListeners(textureInput, "texture");
    addParameterListeners(massInput, "mass");
    addParameterListeners(linearVelocityXInput, "linearvelocityx");
    addParameterListeners(linearVelocityYInput, "linearvelocityy");
    addParameterListeners(linearVelocityZInput, "linearvelocityz");
    addParameterListeners(angularVelocityXInput, "angularvelocityx");
    addParameterListeners(angularVelocityYInput, "angularvelocityy");
    addParameterListeners(angularVelocityZInput, "angularvelocityz");
  }

  function addParameterListeners(input, clickedValue) {
    input.addEventListener("keydown", function(event) {
      if (event.keyCode === 13/*Enter*/) {
        input.blur();
      }
    });
    input.addEventListener("blur", function() {
      updateParameters(input, clickedValue);
    });
  }

  function updateParameters(input, clickedValue) {
    if (!CLICKED && clickedValue !== "world" && clickedValue !== "background") {
      return;
    }
    if (input.value === "" && clickedValue !== "texture" && clickedValue != "background") {
      input.value = (0).toFixed(3);
    }
    if (clickedValue === "coneradialsegments" || clickedValue === "cylinderradialsegments" || clickedValue === "spherewidthsegments" || clickedValue === "sphereheightsegments") {
      input.value = Math.abs(input.valueAsNumber.toFixed());
    } else if (clickedValue === "mass") {
      input.value = Math.abs(input.valueAsNumber).toFixed(3);
    } else if (clickedValue !== "texture" && clickedValue !== "background") {
      input.value = input.valueAsNumber.toFixed(3);
    }
    switch (clickedValue) {
      case "background":
        if (input.value === "") {
          equirectMaterial.uniforms["tEquirect"].value = null;
          renderer.autoClear = true;
        } else {
          var equirectTexture = new THREE.TextureLoader().load(input.value);
          equirectTexture.mapping = THREE.EquirectangularReflectionMapping;
          equirectMaterial.uniforms["tEquirect"].value = equirectTexture;
          renderer.autoClear = false;
        }
        break;
      case "positionx":
        CLICKED.position.x = input.valueAsNumber;
        break;
      case "positiony":
        CLICKED.position.y = input.valueAsNumber;
        break;
      case "positionz":
        CLICKED.position.z = input.valueAsNumber;
        break;
      case "rotationx":
        CLICKED.rotation.x = input.valueAsNumber * Math.PI / 180;
        break;
      case "rotationy":
        CLICKED.rotation.y = input.valueAsNumber * Math.PI / 180;
        break;
      case "rotationz":
        CLICKED.rotation.z = input.valueAsNumber * Math.PI / 180;
        break;
      case "scalex":
        CLICKED.scale.x = input.valueAsNumber;
        break;
      case "scaley":
        CLICKED.scale.y = input.valueAsNumber;
        break;
      case "scalez":
        CLICKED.scale.z = input.valueAsNumber;
        break;
      case "texture":
        var color = CLICKED.material.color.getHex();
        CLICKED.textureURL = input.value;
        CLICKED.material.dispose();
        if (input.value === "") {
          CLICKED.material = new THREE.MeshPhongMaterial({color: color, shading: THREE.FlatShading});
        } else {
          var texture = new THREE.TextureLoader().load(input.value);
          CLICKED.material = new THREE.MeshPhongMaterial({color: color, map: texture, shading: THREE.FlatShading});
          /*
          var loader = new THREE.TextureLoader();
          loader.load(input.value, function(texture) {
            CLICKED.material = new THREE.MeshPhongMaterial({color: color, map: texture, shading: THREE.FlatShading});
          }, null, function(xhr) {
            CLICKED.material = new THREE.MeshPhongMaterial({color: color, shading: THREE.FlatShading});
          });
          */
        }
        break;
      case "mass":
        CLICKED.mass = input.valueAsNumber;
        break;
      case "boxwidth":
        updateGeometry(new THREE.BoxBufferGeometry(input.valueAsNumber, CLICKED.geometry.parameters.height, CLICKED.geometry.parameters.depth));
        break;
      case "boxheight":
        updateGeometry(new THREE.BoxBufferGeometry(CLICKED.geometry.parameters.width, input.valueAsNumber, CLICKED.geometry.parameters.depth));
        break;
      case "boxdepth":
        updateGeometry(new THREE.BoxBufferGeometry(CLICKED.geometry.parameters.width, CLICKED.geometry.parameters.height, input.valueAsNumber));
        break;
      case "coneradius":
        updateGeometry(new THREE.ConeBufferGeometry(input.valueAsNumber, CLICKED.geometry.parameters.height, CLICKED.geometry.parameters.radialSegments));
        break;
      case "coneheight":
        updateGeometry(new THREE.ConeBufferGeometry(CLICKED.geometry.parameters.radius, input.valueAsNumber, CLICKED.geometry.parameters.radialSegments));
        break;
      case "coneradialsegments":
        updateGeometry(new THREE.ConeBufferGeometry(CLICKED.geometry.parameters.radius, CLICKED.geometry.parameters.height, input.valueAsNumber));
        break;
      case "cylinderradiustop":
        updateGeometry(new THREE.CylinderBufferGeometry(input.valueAsNumber, CLICKED.geometry.parameters.radiusBottom, CLICKED.geometry.parameters.height, CLICKED.geometry.parameters.radialSegments));
        break;
      case "cylinderradiusbottom":
        updateGeometry(new THREE.CylinderBufferGeometry(CLICKED.geometry.parameters.radiusTop, input.valueAsNumber, CLICKED.geometry.parameters.height, CLICKED.geometry.parameters.radialSegments));
        break;
      case "cylinderheight":
        updateGeometry(new THREE.CylinderBufferGeometry(CLICKED.geometry.parameters.radiusTop, CLICKED.geometry.parameters.radiusBottom, input.valueAsNumber, CLICKED.geometry.parameters.radialSegments));
        break;
      case "cylinderradialsegments":
        updateGeometry(new THREE.CylinderBufferGeometry(CLICKED.geometry.parameters.radiusTop, CLICKED.geometry.parameters.radiusBottom, CLICKED.geometry.parameters.height, input.valueAsNumber));
        break;
      case "dodecahedronradius":
        updateGeometry(new THREE.DodecahedronBufferGeometry(input.valueAsNumber));
        break;
      case "icosahedronradius":
        updateGeometry(new THREE.IcosahedronBufferGeometry(input.valueAsNumber));
        break;
      case "octahedronradius":
        updateGeometry(new THREE.OctahedronBufferGeometry(input.valueAsNumber));
        break;
      case "sphereradius":
        updateGeometry(new THREE.SphereBufferGeometry(input.valueAsNumber, CLICKED.geometry.parameters.widthSegments, CLICKED.geometry.parameters.heightSegments));
        break;
      case "spherewidthsegments":
        updateGeometry(new THREE.SphereBufferGeometry(CLICKED.geometry.parameters.radius, input.valueAsNumber, CLICKED.geometry.parameters.heightSegments));
        break;
      case "sphereheightsegments":
        updateGeometry(new THREE.SphereBufferGeometry(CLICKED.geometry.parameters.radius, CLICKED.geometry.parameters.widthSegments, input.valueAsNumber));
        break;
      case "tetrahedronradius":
        updateGeometry(new THREE.TetrahedronBufferGeometry(input.valueAsNumber));
        break;
      case "linearvelocityx":
        CLICKED.linearVelocityX = input.valueAsNumber;
        break;
      case "linearvelocityy":
        CLICKED.linearVelocityY = input.valueAsNumber;
        break;
      case "linearvelocityz":
        CLICKED.linearVelocityZ = input.valueAsNumber;
        break;
      case "angularvelocityx":
        CLICKED.angularVelocityX = input.valueAsNumber;
        break;
      case "angularvelocityy":
        CLICKED.angularVelocityY = input.valueAsNumber;
        break;
      case "angularvelocityz":
        CLICKED.angularVelocityZ = input.valueAsNumber;
        break;
      default:
        break;
    }
  }

  function updateGeometry(geometry) {
    CLICKED.geometry.dispose();
    CLICKED.geometry = geometry;
  }

  function addObjectSpecificParameters() {
    switch (CLICKED.geometry.type) {
      case "BoxBufferGeometry":
        parameterWrapper2.innerHTML = "<div class=\"parameter-label\">Width</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"box-width\" type=\"number\"></div></div>" +
        "<div class=\"parameter-label\">Height</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"box-height\" type=\"number\"></div></div>" +
        "<div class=\"parameter-label\">Depth</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"box-depth\" type=\"number\"></div></div>";
        var boxWidthInput = document.getElementById("box-width");
        var boxHeightInput = document.getElementById("box-height");
        var boxDepthInput = document.getElementById("box-depth");
        boxWidthInput.value = CLICKED.geometry.parameters.width.toFixed(3);
        boxHeightInput.value = CLICKED.geometry.parameters.height.toFixed(3);
        boxDepthInput.value = CLICKED.geometry.parameters.depth.toFixed(3);
        addParameterListeners(boxWidthInput, "boxwidth");
        addParameterListeners(boxHeightInput, "boxheight");
        addParameterListeners(boxDepthInput, "boxdepth");
        break;
      case "ConeBufferGeometry":
        parameterWrapper2.innerHTML = "<div class=\"parameter-label\">Radius</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"cone-radius\" type=\"number\"></div></div>" +
        "<div class=\"parameter-label\">Height</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"cone-height\" type=\"number\"></div></div>" +
        "<div class=\"parameter-label\">Radial Segments</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"cone-radial-segments\" type=\"number\"></div></div>";
        var coneRadiusInput = document.getElementById("cone-radius");
        var coneHeightInput = document.getElementById("cone-height");
        var coneRadialSegmentsInput = document.getElementById("cone-radial-segments");
        coneRadiusInput.value = CLICKED.geometry.parameters.radius.toFixed(3);
        coneHeightInput.value = CLICKED.geometry.parameters.height.toFixed(3);
        coneRadialSegmentsInput.value = CLICKED.geometry.parameters.radialSegments.toFixed();
        addParameterListeners(coneRadiusInput, "coneradius");
        addParameterListeners(coneHeightInput, "coneheight");
        addParameterListeners(coneRadialSegmentsInput, "coneradialsegments");
        break;
      case "CylinderBufferGeometry":
        parameterWrapper2.innerHTML = "<div class=\"parameter-label\">Top Radius</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"cylinder-radius-top\" type=\"number\"></div></div>" +
        "<div class=\"parameter-label\">Bottom Radius</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"cylinder-radius-bottom\" type=\"number\"></div></div>" +
        "<div class=\"parameter-label\">Height</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"cylinder-height\" type=\"number\"></div></div>" +
        "<div class=\"parameter-label\">Radial Segments</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"cylinder-radial-segments\" type=\"number\"></div></div>";
        var cylinderRadiusTopInput = document.getElementById("cylinder-radius-top");
        var cylinderRadiusBottomInput = document.getElementById("cylinder-radius-bottom");
        var cylinderHeightInput = document.getElementById("cylinder-height");
        var cylinderRadialSegmentsInput = document.getElementById("cylinder-radial-segments");
        cylinderRadiusTopInput.value = CLICKED.geometry.parameters.radiusTop.toFixed(3);
        cylinderRadiusBottomInput.value = CLICKED.geometry.parameters.radiusBottom.toFixed(3);
        cylinderHeightInput.value = CLICKED.geometry.parameters.height.toFixed(3);
        cylinderRadialSegmentsInput.value = CLICKED.geometry.parameters.radialSegments.toFixed();
        addParameterListeners(cylinderRadiusTopInput, "cylinderradiustop");
        addParameterListeners(cylinderRadiusBottomInput, "cylinderradiusbottom");
        addParameterListeners(cylinderHeightInput, "cylinderheight");
        addParameterListeners(cylinderRadialSegmentsInput, "cylinderradialsegments");
        break;
      case "DodecahedronBufferGeometry":
        parameterWrapper2.innerHTML = "<div class=\"parameter-label\">Radius</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"dodecahedron-radius\" type=\"number\"></div></div>";
        var dodecahedronRadiusInput = document.getElementById("dodecahedron-radius");
        dodecahedronRadiusInput.value = CLICKED.geometry.parameters.radius.toFixed(3);
        addParameterListeners(dodecahedronRadiusInput, "dodecahedronradius");
        break;
      case "IcosahedronBufferGeometry":
        parameterWrapper2.innerHTML = "<div class=\"parameter-label\">Radius</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"icosahedron-radius\" type=\"number\"></div></div>";
        var icosahedronRadiusInput = document.getElementById("icosahedron-radius");
        icosahedronRadiusInput.value = CLICKED.geometry.parameters.radius.toFixed(3);
        addParameterListeners(icosahedronRadiusInput, "icosahedronradius");
        break;
      case "OctahedronBufferGeometry":
        parameterWrapper2.innerHTML = "<div class=\"parameter-label\">Radius</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"octahedron-radius\" type=\"number\"></div></div>";
        var octahedronRadiusInput = document.getElementById("octahedron-radius");
        octahedronRadiusInput.value = CLICKED.geometry.parameters.radius.toFixed(3);
        addParameterListeners(octahedronRadiusInput, "octahedronradius");
        break;
      case "SphereBufferGeometry":
        parameterWrapper2.innerHTML = "<div class=\"parameter-label\">Radius</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"sphere-radius\" type=\"number\"></div></div>" +
        "<div class=\"parameter-label\">Width Segments</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"sphere-width-segments\" type=\"number\"></div></div>" +
        "<div class=\"parameter-label\">Height Segments</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"sphere-height-segments\" type=\"number\"></div></div>";
        var sphereRadiusInput = document.getElementById("sphere-radius");
        var sphereWidthSegmentsInput = document.getElementById("sphere-width-segments");
        var sphereHeightSegmentsInput = document.getElementById("sphere-height-segments");
        sphereRadiusInput.value = CLICKED.geometry.parameters.radius.toFixed(3);
        sphereWidthSegmentsInput.value = CLICKED.geometry.parameters.widthSegments.toFixed();
        sphereHeightSegmentsInput.value = CLICKED.geometry.parameters.heightSegments.toFixed();
        addParameterListeners(sphereRadiusInput, "sphereradius");
        addParameterListeners(sphereWidthSegmentsInput, "spherewidthsegments");
        addParameterListeners(sphereHeightSegmentsInput, "sphereheightsegments");
        break;
      case "TetrahedronBufferGeometry":
        parameterWrapper2.innerHTML = "<div class=\"parameter-label\">Radius</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"tetrahedron-radius\" type=\"number\"></div></div>";
        var tetrahedronRadiusInput = document.getElementById("tetrahedron-radius");
        tetrahedronRadiusInput.value = CLICKED.geometry.parameters.radius.toFixed(3);
        addParameterListeners(tetrahedronRadiusInput, "tetrahedronradius");
        break;
      default:
        parameterWrapper2.style.visibility = "hidden";
        parameterWrapper2.innerHTML = "";
        return;
    }
    parameterWrapper2.style.visibility = "visible";
  }
}

initEditor(true);
