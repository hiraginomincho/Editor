var scene, transformControls, renderer;
var camera, orbitControls;
var raycaster;
var mouse = new THREE.Vector2(), INTERSECTED, CLICKED;

var torus;

var objects = [];

var editorDiv = document.getElementById("editor");

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

var colorWrapper = document.getElementById("color-wrapper");
var colorInput = document.getElementById("color-input");

var parameterWrapper1 = document.getElementById("parameter-wrapper-1");
var parameterWrapper2 = document.getElementById("parameter-wrapper-2");

init();
render();

initControlButtons();
initObjectButtons();
initParameterControls();

function init() {
  renderer = new THREE.WebGLRenderer();//{antialias:true});
  renderer.setSize(editorDiv.clientWidth, editorDiv.clientHeight, false);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0xeeeeee);
  editorDiv.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(60, renderer.domElement.clientWidth / renderer.domElement.clientHeight, 0.1, 10000);
  camera.position.x = 20;
  camera.position.y = 20;
  camera.position.z = 10;

  camera.lookAt(new THREE.Vector3(0,0,0));

  orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.25;
  orbitControls.enableKeys = false;

  scene = new THREE.Scene();

  var gridHelper = new THREE.GridHelper(16, 16, 0xaaaaaa, 0xcccccc);
  scene.add(gridHelper);

  var boxGeometry = new THREE.BoxBufferGeometry(4, 4, 4);
  var boxMaterial = new THREE.MeshPhongMaterial({color: 0x7f0000, shading: THREE.FlatShading});
  var box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.name = "Box";
  box.baseHex = box.material.emissive.getHex();
  addToScene(box, false);

  var sphereGeometry = new THREE.SphereBufferGeometry(2, 16, 16);
  var sphereMaterial = new THREE.MeshPhongMaterial({color: 0x007f00, shading: THREE.FlatShading});
  var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.name = "Sphere";
  sphere.baseHex = sphere.material.emissive.getHex();
  addToScene(sphere, false);

  sphere.position.y += 8;

  var torusGeometry = new THREE.TorusBufferGeometry(3, 0.5, 16, 16);
  var torusMaterial = new THREE.MeshPhongMaterial({color: 0x00007f, shading: THREE.FlatShading});
  torus = new THREE.Mesh(torusGeometry, torusMaterial);
  torus.name = "Torus";
  torus.baseHex = torus.material.emissive.getHex();
  addToScene(torus, false);

  torus.position.y += 8;

  var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  var directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
  directionalLight1.position.set(2, 8, 1).normalize();
  scene.add(directionalLight1);

  var directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.2);
  directionalLight2.position.set(-2, -8, -1).normalize();
  scene.add(directionalLight2);

  transformControls = new THREE.TransformControls(camera, renderer.domElement);
  transformControls.setSpace("local");
  scene.add(transformControls);

  transformControls.addEventListener("change", function() {
    updateBoxes();
  });

  raycaster = new THREE.Raycaster();

  editorDiv.addEventListener("mousemove", onDocumentMouseMove, false);
  editorDiv.addEventListener("mousedown", onDocumentMouseDown, false);
  window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = editorDiv.clientWidth / editorDiv.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(editorDiv.clientWidth, editorDiv.clientHeight, false);
}

function onDocumentMouseMove(event) {
  event.preventDefault();
  mouse.x = ((event.clientX - window.innerWidth / 6) / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - renderer.domElement.offsetTop) / renderer.domElement.clientHeight) * 2 + 1;
}

function onDocumentMouseDown(event) {
  event.preventDefault();
  mouse.x = ((event.clientX - window.innerWidth / 6) / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - renderer.domElement.offsetTop) / renderer.domElement.clientHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  var intersects = raycaster.intersectObjects(objects);
  if (intersects.length > 0) {
    focus(intersects[0].object);
  }
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
  updateBoxes();
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

function updateBoxes() {
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
}

function updateVisibility() {
  if (CLICKED) {
    parameterWrapper1.style.visibility = "visible";
  } else {
    parameterWrapper1.style.visibility = "hidden";
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
      objectList.removeChild(objectList.children[index]);
    }
  });
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
  var torusButton = document.getElementById("torus");
  boxButton.addEventListener("click", function() {
    var boxGeometry = new THREE.BoxBufferGeometry(4, 4, 4);
    var boxMaterial = new THREE.MeshPhongMaterial({color: 0x7f7f00, shading: THREE.FlatShading});
    var box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.name = "Box";
    box.baseHex = box.material.emissive.getHex();
    addToScene(box, true);
  });
  coneButton.addEventListener("click", function() {
    var coneGeometry = new THREE.ConeBufferGeometry(2, 4, 16);
    var coneMaterial = new THREE.MeshPhongMaterial({color: 0x7f007f, shading: THREE.FlatShading});
    var cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.name = "Cone";
    cone.baseHex = cone.material.emissive.getHex();
    addToScene(cone, true);
  });
  cylinderButton.addEventListener("click", function() {
    var cylinderGeometry = new THREE.CylinderBufferGeometry(2, 2, 4, 16);
    var cylinderMaterial = new THREE.MeshPhongMaterial({color: 0x007f7f, shading: THREE.FlatShading});
    var cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.name = "Cylinder";
    cylinder.baseHex = cylinder.material.emissive.getHex();
    addToScene(cylinder, true);
  });
  dodecahedronButton.addEventListener("click", function() {
    var dodecahedronGeometry = new THREE.DodecahedronBufferGeometry(2);
    var dodecahedronMaterial = new THREE.MeshPhongMaterial({color: 0x7f7fff, shading: THREE.FlatShading});
    var dodecahedron = new THREE.Mesh(dodecahedronGeometry, dodecahedronMaterial);
    dodecahedron.name = "Dodecahedron";
    dodecahedron.baseHex = dodecahedron.material.emissive.getHex();
    addToScene(dodecahedron, true);
  });
  icosahedronButton.addEventListener("click", function() {
    var icosahedronGeometry = new THREE.IcosahedronBufferGeometry(2);
    var icosahedronMaterial = new THREE.MeshPhongMaterial({color: 0x7fff7f, shading: THREE.FlatShading});
    var icosahedron = new THREE.Mesh(icosahedronGeometry, icosahedronMaterial);
    icosahedron.name = "Icosahedron";
    icosahedron.baseHex = icosahedron.material.emissive.getHex();
    addToScene(icosahedron, true);
  });
  octahedronButton.addEventListener("click", function() {
    var octahedronGeometry = new THREE.OctahedronBufferGeometry(2);
    var octahedronMaterial = new THREE.MeshPhongMaterial({color: 0xff7f7f, shading: THREE.FlatShading});
    var octahedron = new THREE.Mesh(octahedronGeometry, octahedronMaterial);
    octahedron.name = "Octahedron";
    octahedron.baseHex = octahedron.material.emissive.getHex();
    addToScene(octahedron, true);
  });
  sphereButton.addEventListener("click", function() {
    var sphereGeometry = new THREE.SphereBufferGeometry(2, 16, 16);
    var sphereMaterial = new THREE.MeshPhongMaterial({color: 0xffff7f, shading: THREE.FlatShading});
    var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.name = "Sphere";
    sphere.baseHex = sphere.material.emissive.getHex();
    addToScene(sphere, true);
  });
  tetrahedronButton.addEventListener("click", function() {
    var tetrahedronGeometry = new THREE.TetrahedronBufferGeometry(2);
    var tetrahedronMaterial = new THREE.MeshPhongMaterial({color: 0xff7fff, shading: THREE.FlatShading});
    var tetrahedron = new THREE.Mesh(tetrahedronGeometry, tetrahedronMaterial);
    tetrahedron.name = "Tetrahedron";
    tetrahedron.baseHex = tetrahedron.material.emissive.getHex();
    addToScene(tetrahedron, true);
  });
  torusButton.addEventListener("click", function() {
    var torusGeometry = new THREE.TorusBufferGeometry(3, 0.5, 16, 16);
    var torusMaterial = new THREE.MeshPhongMaterial({color: 0x7fffff, shading: THREE.FlatShading});
    var torus = new THREE.Mesh(torusGeometry, torusMaterial);
    torus.name = "Torus";
    torus.baseHex = torus.material.emissive.getHex();
    addToScene(torus, true);
  });
}

function addToObjectList(object) {
  var s = object.name;
  var objectDiv = document.createElement("div");
  objectDiv.classList.add("object-item");
  objectDiv.classList.add("object-inactive");
  objectDiv.innerHTML = s;
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
    updateBoxes();
    updateVisibility();
    addObjectSpecificParameters();
  });
}

function initParameterControls() {
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
}

function addParameterListeners(input, clickedValue) {
  input.addEventListener("keydown", function(evt) {
    if (evt.keyCode == 13/*Enter*/) {
      input.blur();
    }
  });
  input.addEventListener("blur", function() {
    updateParameters(input, clickedValue);
  });
}

function updateParameters(input, clickedValue) {
  if (clickedValue == "coneradialsegments" || clickedValue == "cylinderradialsegments" || clickedValue == "spherewidthsegments" || clickedValue == "sphereheightsegments" || clickedValue == "torusradialsegments" || clickedValue == "torustubularsegments") {
    input.value = Math.abs(input.valueAsNumber.toFixed());
  } else {
    input.value = input.valueAsNumber.toFixed(3);
  }
  switch (clickedValue) {
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
    case "torusradius":
      updateGeometry(new THREE.TorusBufferGeometry(input.valueAsNumber, CLICKED.geometry.parameters.tube, CLICKED.geometry.parameters.radialSegments, CLICKED.geometry.parameters.tubularSegments));
      break;
    case "torustube":
      updateGeometry(new THREE.TorusBufferGeometry(CLICKED.geometry.parameters.radius, input.valueAsNumber, CLICKED.geometry.parameters.radialSegments, CLICKED.geometry.parameters.tubularSegments));
      break;
    case "torusradialsegments":
      updateGeometry(new THREE.TorusBufferGeometry(CLICKED.geometry.parameters.radius, CLICKED.geometry.parameters.tube, input.valueAsNumber, CLICKED.geometry.parameters.tubularSegments));
      break;
    case "torustubularsegments":
      updateGeometry(new THREE.TorusBufferGeometry(CLICKED.geometry.parameters.radius, CLICKED.geometry.parameters.tube, CLICKED.geometry.parameters.radialSegments, input.valueAsNumber));
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
    case "TorusBufferGeometry":
      parameterWrapper2.innerHTML = "<div class=\"parameter-label\">Radius</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"torus-radius\" type=\"number\"></div></div>" +
      "<div class=\"parameter-label\">Tube Diameter</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"torus-tube\" type=\"number\"></div></div>" +
      "<div class=\"parameter-label\">Radial Segments</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"torus-radial-segments\" type=\"number\"></div></div>" +
      "<div class=\"parameter-label\">Tubular Segments</div><div class=\"row parameter-row\"><div class=\"col-4 parameter-item\"><input class=\"input-text parameter-box\" id=\"torus-tubular-segments\" type=\"number\"></div></div>";
      var torusRadiusInput = document.getElementById("torus-radius");
      var torusTubeInput = document.getElementById("torus-tube");
      var torusRadialSegmentsInput = document.getElementById("torus-radial-segments");
      var torusTubularSegmentsInput = document.getElementById("torus-tubular-segments");
      torusRadiusInput.value = CLICKED.geometry.parameters.radius.toFixed(3);
      torusTubeInput.value = CLICKED.geometry.parameters.tube.toFixed(3);
      torusRadialSegmentsInput.value = CLICKED.geometry.parameters.radialSegments.toFixed();
      torusTubularSegmentsInput.value = CLICKED.geometry.parameters.tubularSegments.toFixed();
      addParameterListeners(torusRadiusInput, "torusradius");
      addParameterListeners(torusTubeInput, "torustube");
      addParameterListeners(torusRadialSegmentsInput, "torusradialsegments");
      addParameterListeners(torusTubularSegmentsInput, "torustubularsegments");
      break;
    default:
      parameterWrapper2.style.visibility = "hidden";
      parameterWrapper2.innerHTML = "";
      return;
  }
  parameterWrapper2.style.visibility = "visible";
}
