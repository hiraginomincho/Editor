var scene, transformControls, renderer;
var camera, orbitControls;
var raycaster;
var mouse = new THREE.Vector2(), INTERSECTED, CLICKED;

var torus;

var objects = [];

var editorDiv = document.getElementById("editor");

var objectList = document.getElementById("object-list");
var selectedObjectDiv;

var positionXBox = document.getElementById("position-x");
var positionYBox = document.getElementById("position-y");
var positionZBox = document.getElementById("position-z");

var rotationXBox = document.getElementById("rotation-x");
var rotationYBox = document.getElementById("rotation-y");
var rotationZBox = document.getElementById("rotation-z");

var scaleXBox = document.getElementById("scale-x");
var scaleYBox = document.getElementById("scale-y");
var scaleZBox = document.getElementById("scale-z");

var colorBox = document.getElementById("color");
var colorInput = document.getElementById("color-input");

init();
render();

initControlButtons();
initObjectButtons();
initParameterControls();

function init() {
  renderer = new THREE.WebGLRenderer({antialias:true});
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
  scene.add(box);
  objects.push(box);
  addToObjectList(box);

  var sphereGeometry = new THREE.SphereBufferGeometry(2, 16, 16);
  var sphereMaterial = new THREE.MeshPhongMaterial({color: 0x007f00, shading: THREE.FlatShading});
  var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.name = "Sphere";
  sphere.baseHex = sphere.material.emissive.getHex();
  scene.add(sphere);
  objects.push(sphere);
  addToObjectList(sphere);

  sphere.position.y += 8;

  var torusGeometry = new THREE.TorusBufferGeometry(3, 0.5, 16, 16);
  var torusMaterial = new THREE.MeshPhongMaterial({color: 0x00007f, shading: THREE.FlatShading});
  torus = new THREE.Mesh(torusGeometry, torusMaterial);
  torus.name = "Torus";
  torus.baseHex = torus.material.emissive.getHex();
  scene.add(torus);
  objects.push(torus);
  addToObjectList(torus);

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
  console.log("width " + editorDiv.clientWidth);
  console.log("height " + editorDiv.clientHeight);
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
    var objectDiv = objectList.children[objects.indexOf(intersects[0].object)];
    objectDiv.classList.remove("object-inactive");
    objectDiv.classList.add("object-active");
    if (selectedObjectDiv && selectedObjectDiv != objectDiv) {
      selectedObjectDiv.classList.remove("object-active");
      selectedObjectDiv.classList.add("object-inactive");
    }
    selectedObjectDiv = objectDiv;
    transformControls.attach(intersects[0].object);
    CLICKED = intersects[0].object;
    updateBoxes();
  }
}

function updateBoxes() {
  if (CLICKED) {
    positionXBox.style.visibility = "visible";
    positionXBox.value = CLICKED.position.x.toFixed(3);
    positionYBox.style.visibility = "visible";
    positionYBox.value = CLICKED.position.y.toFixed(3);
    positionZBox.style.visibility = "visible";
    positionZBox.value = CLICKED.position.z.toFixed(3);
    rotationXBox.style.visibility = "visible";
    rotationXBox.value = (CLICKED.rotation.x * 180 / Math.PI).toFixed(3);
    rotationYBox.style.visibility = "visible";
    rotationYBox.value = (CLICKED.rotation.y * 180 / Math.PI).toFixed(3);
    rotationZBox.style.visibility = "visible";
    rotationZBox.value = (CLICKED.rotation.z * 180 / Math.PI).toFixed(3);
    scaleXBox.style.visibility = "visible";
    scaleXBox.value = CLICKED.scale.x.toFixed(3);
    scaleYBox.style.visibility = "visible";
    scaleYBox.value = CLICKED.scale.y.toFixed(3);
    scaleZBox.style.visibility = "visible";
    scaleZBox.value = CLICKED.scale.z.toFixed(3);
    colorBox.style.visibility = "visible";
    colorInput.value = "#" + CLICKED.material.color.getHexString();
  } else {
    positionXBox.style.visibility = "hidden";
    positionYBox.style.visibility = "hidden";
    positionZBox.style.visibility = "hidden";
    rotationXBox.style.visibility = "hidden";
    rotationYBox.style.visibility = "hidden";
    rotationZBox.style.visibility = "hidden";
    scaleXBox.style.visibility = "hidden";
    scaleYBox.style.visibility = "hidden";
    scaleZBox.style.visibility = "hidden";
    colorBox.style.visibility = "hidden";
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
      updateBoxes();
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
    scene.add(box);
    objects.push(box);
    addToObjectList(box);
  });
  coneButton.addEventListener("click", function() {
    var coneGeometry = new THREE.ConeBufferGeometry(2, 4, 16);
    var coneMaterial = new THREE.MeshPhongMaterial({color: 0x7f007f, shading: THREE.FlatShading});
    var cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.name = "Cone";
    cone.baseHex = cone.material.emissive.getHex();
    scene.add(cone);
    objects.push(cone);
    addToObjectList(cone);
  });
  dodecahedronButton.addEventListener("click", function() {
    var dodecahedronGeometry = new THREE.DodecahedronBufferGeometry(2);
    var dodecahedronMaterial = new THREE.MeshPhongMaterial({color: 0x007f7f, shading: THREE.FlatShading});
    var dodecahedron = new THREE.Mesh(dodecahedronGeometry, dodecahedronMaterial);
    dodecahedron.name = "Dodecahedron";
    dodecahedron.baseHex = dodecahedron.material.emissive.getHex();
    scene.add(dodecahedron);
    objects.push(dodecahedron);
    addToObjectList(dodecahedron);
  });
  cylinderButton.addEventListener("click", function() {
    var cylinderGeometry = new THREE.CylinderBufferGeometry(2, 2, 4, 16);
    var cylinderMaterial = new THREE.MeshPhongMaterial({color: 0x7f7fff, shading: THREE.FlatShading});
    var cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.name = "Cylinder";
    cylinder.baseHex = cylinder.material.emissive.getHex();
    scene.add(cylinder);
    objects.push(cylinder);
    addToObjectList(cylinder);
  });
  icosahedronButton.addEventListener("click", function() {
    var icosahedronGeometry = new THREE.IcosahedronBufferGeometry(2);
    var icosahedronMaterial = new THREE.MeshPhongMaterial({color: 0x7fff7f, shading: THREE.FlatShading});
    var icosahedron = new THREE.Mesh(icosahedronGeometry, icosahedronMaterial);
    icosahedron.name = "Icosahedron";
    icosahedron.baseHex = icosahedron.material.emissive.getHex();
    scene.add(icosahedron);
    objects.push(icosahedron);
    addToObjectList(icosahedron);
  });
  octahedronButton.addEventListener("click", function() {
    var octahedronGeometry = new THREE.OctahedronBufferGeometry(2);
    var octahedronMaterial = new THREE.MeshPhongMaterial({color: 0xff7f7f, shading: THREE.FlatShading});
    var octahedron = new THREE.Mesh(octahedronGeometry, octahedronMaterial);
    octahedron.name = "Octahedron";
    octahedron.baseHex = octahedron.material.emissive.getHex();
    scene.add(octahedron);
    objects.push(octahedron);
    addToObjectList(octahedron);
  });
  sphereButton.addEventListener("click", function() {
    var sphereGeometry = new THREE.SphereBufferGeometry(2, 16, 16);
    var sphereMaterial = new THREE.MeshPhongMaterial({color: 0xffff7f, shading: THREE.FlatShading});
    var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.name = "Sphere";
    sphere.baseHex = sphere.material.emissive.getHex();
    scene.add(sphere);
    objects.push(sphere);
    addToObjectList(sphere);
  });
  tetrahedronButton.addEventListener("click", function() {
    var tetrahedronGeometry = new THREE.TetrahedronBufferGeometry(2);
    var tetrahedronMaterial = new THREE.MeshPhongMaterial({color: 0xff7fff, shading: THREE.FlatShading});
    var tetrahedron = new THREE.Mesh(tetrahedronGeometry, tetrahedronMaterial);
    tetrahedron.name = "Tetrahedron";
    tetrahedron.baseHex = tetrahedron.material.emissive.getHex();
    scene.add(tetrahedron);
    objects.push(tetrahedron);
    addToObjectList(tetrahedron);
  });
  torusButton.addEventListener("click", function() {
    var torusGeometry = new THREE.TorusBufferGeometry(3, 0.5, 16, 16);
    var torusMaterial = new THREE.MeshPhongMaterial({color: 0x7fffff, shading: THREE.FlatShading});
    var torus = new THREE.Mesh(torusGeometry, torusMaterial);
    torus.name = "Torus";
    torus.baseHex = torus.material.emissive.getHex();
    scene.add(torus);
    objects.push(torus);
    addToObjectList(torus);
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
  });
}

function initParameterControls() {
  addParameterListeners(positionXBox, "positionx");
  addParameterListeners(positionYBox, "positiony");
  addParameterListeners(positionZBox, "positionz");
  addParameterListeners(rotationXBox, "rotationx");
  addParameterListeners(rotationYBox, "rotationy");
  addParameterListeners(rotationZBox, "rotationz");
  addParameterListeners(scaleXBox, "scalex");
  addParameterListeners(scaleYBox, "scaley");
  addParameterListeners(scaleZBox, "scalez");
  colorInput.addEventListener("input", function() {
    if (CLICKED) {
      CLICKED.material.color = new THREE.Color(colorInput.value);
    }
  });
}

function addParameterListeners(box, clickedValue) {
  box.addEventListener("keydown", function(evt) {
    if (evt.keyCode == 13/*Enter*/) {
      updateParameters(box, clickedValue);
      box.blur();
    }
  });
  box.addEventListener("blur", function() {
    updateParameters(box, clickedValue);
  });
}

function updateParameters(box, clickedValue) {
  box.value = box.valueAsNumber.toFixed(3);
  if (CLICKED) {
    switch (clickedValue) {
      case "positionx":
        CLICKED.position.x = box.valueAsNumber;
        break;
      case "positiony":
        CLICKED.position.y = box.valueAsNumber;
        break;
      case "positionz":
        CLICKED.position.z = box.valueAsNumber;
        break;
      case "rotationx":
        CLICKED.rotation.x = box.valueAsNumber * Math.PI / 180;
        break;
      case "rotationy":
        CLICKED.rotation.y = box.valueAsNumber * Math.PI / 180;
        break;
      case "rotationz":
        CLICKED.rotation.z = box.valueAsNumber * Math.PI / 180;
        break;
      case "scalex":
        CLICKED.scale.x = box.valueAsNumber;
        break;
      case "scaley":
        CLICKED.scale.y = box.valueAsNumber;
        break;
      case "scalez":
        CLICKED.scale.z = box.valueAsNumber;
        break;
      default:
        break;
    }
  }
}
