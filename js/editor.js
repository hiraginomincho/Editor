"use strict";

var sceneJSONString;

var editing = true;
var cameraPos;

var renderer = new THREE.WebGLRenderer();

function initEditor(fromStart) {
  editing = true;
  document.body.innerHTML = "<div class=\"container-fluid\" id=\"container\">" +
    "<div class=\"row\" id=\"container-row\">" +
      "<div class=\"col-2\" id=\"left-panel\">" +
        "<div class=\"object-button\" id=\"box\">" +
          "Box" +
        "</div>" +
        "<div class=\"object-button\" id=\"cone\">" +
          "Cone" +
        "</div>" +
        "<div class=\"object-button\" id=\"cylinder\">" +
          "Cylinder" +
        "</div>" +
        "<div class=\"object-button\" id=\"dodecahedron\">" +
          "Dodecahedron" +
        "</div>" +
        "<div class=\"object-button\" id=\"icosahedron\">" +
          "Icosahedron" +
        "</div>" +
        "<div class=\"object-button\" id=\"octahedron\">" +
          "Octahedron" +
        "</div>" +
        "<div class=\"object-button\" id=\"sphere\">" +
          "Sphere" +
        "</div>" +
        "<div class=\"object-button\" id=\"tetrahedron\">" +
          "Tetrahedron" +
        "</div>" +
        "<div class=\"object-button\" id=\"torus\">" +
          "Torus" +
        "</div>" +
      "</div>" +
      "<div class=\"col-8\" id=\"editor-panel\">" +
        "<div id=\"editor\">" +
        "</div>" +
        "<div id=\"controls-left\">" +
          "<div class=\"control-button control-button-left control-active\" id=\"translate\">" +
            "Translate" +
          "</div>" +
          "<div class=\"control-button control-button-left control-inactive\" id=\"rotate\">" +
            "Rotate" +
          "</div>" +
          "<div class=\"control-button control-button-left control-inactive\" id=\"scale\">" +
            "Scale" +
          "</div>" +
          "<div class=\"control-button control-button-left control-inactive\" id=\"duplicate\">" +
            "Duplicate" +
          "</div>" +
          "<div class=\"control-button control-button-left control-inactive\" id=\"import\">" +
            "Import" +
          "</div>" +
          "<input type=\"file\" id=\"import-json\">" +
          "<div class=\"control-button control-button-left control-inactive\" id=\"export\">" +
            "Export" +
          "</div>" +
          "<div class=\"control-button control-button-left control-inactive\" id=\"vr\">" +
            "VR" +
          "</div>" +
        "</div>" +
        "<div id=\"controls-right\">" +
          "<div class=\"control-button control-button-right control-inactive\" id=\"delete\">" +
            "Delete" +
          "</div>" +
          "<div class=\"control-button control-button-right control-inactive\" id=\"clear\">" +
            "Clear" +
          "</div>" +
        "</div>" +
      "</div>" +
      "<div class=\"col-2\" id=\"right-panel\">" +
        "<div class=\"parameter-label\">" +
          "Objects" +
        "</div>" +
        "<div id=\"object-list\">" +
        "</div>" +
        "<div id=\"parameter-wrapper-1\">" +
          "<div class=\"parameter-label\">" +
            "Position" +
          "</div>" +
          "<div class=\"row parameter-row\">" +
            "<div class=\"col-4 parameter-item\">" +
              "<input class=\"input-text parameter-box\" id=\"position-x\" type=\"number\">" +
            "</div>" +
            "<div class=\"col-4 parameter-item\">" +
              "<input class=\"input-text parameter-box\" id=\"position-y\" type=\"number\">" +
            "</div>" +
            "<div class=\"col-4 parameter-item\">" +
              "<input class=\"input-text parameter-box\" id=\"position-z\" type=\"number\">" +
            "</div>" +
          "</div>" +
          "<div class=\"parameter-label\">" +
            "Rotation" +
          "</div>" +
          "<div class=\"row parameter-row\">" +
            "<div class=\"col-4 parameter-item\">" +
              "<input class=\"input-text parameter-box\" id=\"rotation-x\" type=\"number\">" +
            "</div>" +
            "<div class=\"col-4 parameter-item\">" +
              "<input class=\"input-text parameter-box\" id=\"rotation-y\" type=\"number\">" +
            "</div>" +
            "<div class=\"col-4 parameter-item\">" +
              "<input class=\"input-text parameter-box\" id=\"rotation-z\" type=\"number\">" +
            "</div>" +
          "</div>" +
          "<div class=\"parameter-label\">" +
            "Scale" +
          "</div>" +
          "<div class=\"row parameter-row\">" +
            "<div class=\"col-4 parameter-item\">" +
              "<input class=\"input-text parameter-box\" id=\"scale-x\" type=\"number\">" +
            "</div>" +
            "<div class=\"col-4 parameter-item\">" +
              "<input class=\"input-text parameter-box\" id=\"scale-y\" type=\"number\">" +
            "</div>" +
            "<div class=\"col-4 parameter-item\">" +
              "<input class=\"input-text parameter-box\" id=\"scale-z\" type=\"number\">" +
            "</div>" +
          "</div>" +
          "<div class=\"parameter-label\">" +
            "Color" +
          "</div>" +
          "<div class=\"parameter-row\" id=\"color-wrapper\">" +
            "<input id=\"color-input\" type=\"color\">" +
          "</div>" +
        "</div>" +
        "<div id=\"parameter-wrapper-2\">" +
        "</div>" +
      "</div>" +
    "</div>" +
  "</div>";

  var objects = [];

  var scene, transformControls;
  var camera, orbitControls;
  var raycaster;
  var mouse = new THREE.Vector2();
  var onDownPosition = new THREE.Vector2();
  var onUpPosition = new THREE.Vector2();
  var INTERSECTED, CLICKED;

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
    //renderer = new THREE.WebGLRenderer();//{antialias:true});
    renderer.setSize(editorDiv.clientWidth, editorDiv.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0xeeeeee);
    editorDiv.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(60, renderer.domElement.clientWidth / renderer.domElement.clientHeight, 0.01, 10000);
    camera.position.set(20, 20, 10);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.25;
    orbitControls.enableKeys = false;

    scene = new THREE.Scene();

    var gridHelper = new THREE.GridHelper(32, 32, 0xaaaaaa, 0xcccccc);
    scene.add(gridHelper);

    if (fromStart) {
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
      var torus = new THREE.Mesh(torusGeometry, torusMaterial);
      torus.name = "Torus";
      torus.baseHex = torus.material.emissive.getHex();
      addToScene(torus, false);

      torus.position.y += 8;
    } else {
      camera.position.copy(cameraPos);
      importScene(JSON.parse(sceneJSONString));
    }

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
      updateInputs();
    });

    raycaster = new THREE.Raycaster();

    editorDiv.children[0].addEventListener("mousemove", onEditorMouseMove);
    editorDiv.children[0].addEventListener("mousedown", onEditorMouseDown);
    window.addEventListener("resize", onWindowResize);
  }

  function onWindowResize() {
    camera.aspect = editorDiv.clientWidth / editorDiv.clientHeight;
    camera.updateProjectionMatrix();
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
    if (editing) {
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
    }
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
      cameraPos = camera.position.clone();
      renderer.dispose();
      window.removeEventListener("resize", onWindowResize);
      initVR();
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
    for (var i = 0; i < sceneJSON.length; i++) {
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
        case "TorusBufferGeometry":
          objectGeometry = new THREE.TorusBufferGeometry(objectJSON.torusradius, objectJSON.torustube, objectJSON.torusradialsegments, objectJSON.torustubularsegments);
          break;
        default:
          return;
      }
      var objectMaterial = new THREE.MeshPhongMaterial({color: objectJSON.color, shading: THREE.FlatShading});
      var object = new THREE.Mesh(objectGeometry, objectMaterial);
      object.position.set(objectJSON.positionx, objectJSON.positiony, objectJSON.positionz);
      object.rotation.set(objectJSON.rotationx, objectJSON.rotationy, objectJSON.rotationz);
      object.scale.set(objectJSON.scalex, objectJSON.scaley, objectJSON.scalez);
      object.material.color = new THREE.Color(objectJSON.color);
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
        case "TorusBufferGeometry":
          objectJSON.torusradius = object.geometry.parameters.radius;
          objectJSON.torustube = object.geometry.parameters.tube;
          objectJSON.torusradialsegments = object.geometry.parameters.radialSegments;
          objectJSON.torustubularsegments = object.geometry.parameters.tubularSegments;
          break;
        default:
          break;
      }
      sceneJSON[i] = objectJSON;
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
    if (!CLICKED) {
      return;
    }
    if (input.value === "") {
      input.value = (0).toFixed(3);
    }
    if (clickedValue === "coneradialsegments" || clickedValue === "cylinderradialsegments" || clickedValue === "spherewidthsegments" || clickedValue === "sphereheightsegments" || clickedValue === "torusradialsegments" || clickedValue === "torustubularsegments") {
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
}

function initVR() {
  editing = false;
  document.body.innerHTML = "<div id=\"controls-single\">" +
    "<div class=\"control-button control-inactive\" id=\"return-to-editor\">" +
      "Return to Editor" +
      "</div>" +
    "</div>";

  var returnButton = document.getElementById("return-to-editor");
  returnButton.addEventListener("click", function() {
    renderer.dispose();
    window.removeEventListener("resize", onWindowResize);
    window.removeEventListener("vrdisplaypresentchange", onWindowResize);
    initEditor(false);
  });

  var scene, vrControls, vrEffect;
  var dummy, camera;

  var physicsWorld;

  var rigidBodies = [];

  var margin = 0.05;

  var clock = new THREE.Clock();
  var transformAux1 = new Ammo.btTransform();

  var idToObject = {};
  var idToPhysicsBody = {};
  var id = -1;

  init();
  render();

  function init() {
    //renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    //renderer.shadowMap.enabled = true;
    //renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    //Physijs.scripts.worker = "js/physijs_worker.js";
    //Physijs.scripts.ammo = "ammo.js";

    scene = new THREE.Scene();
    //scene.setGravity(new THREE.Vector3(0, -10, 0));

    dummy = new THREE.Camera();
    dummy.position.set(30, 20, 60);
    dummy.lookAt(new THREE.Vector3(0, 0, 0));
    scene.add(dummy);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 10000);
    camera.position.set(0, 0, 0);
    dummy.add(camera);

    vrControls = new THREE.VRControls(camera);
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
/*
    var geometry = new THREE.DodecahedronGeometry(0.5);
    var material = new THREE.MeshPhongMaterial({color: 0x7f7fff, shading: THREE.FlatShading});
    var cube = new Physijs.ConvexMesh(geometry, material);
    //cube.castShadow = true;
    //cube.receiveShadow = true;
    cube.position.z = -1;
    scene.add(cube);
*/

    var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    var broadphase = new Ammo.btDbvtBroadphase();
    var solver = new Ammo.btSequentialImpulseConstraintSolver();
    physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
    physicsWorld.setGravity(new Ammo.btVector3(0, -98, 0));

    var groundGeometry = new THREE.BoxGeometry(500, 1, 500);
    var groundMaterial = new THREE.MeshPhongMaterial({color: 0x123456, shading: THREE.FlatShading});
    var ground = new THREE.Mesh(groundGeometry, groundMaterial);
    var groundShape = new Ammo.btBoxShape(new Ammo.btVector3(250, 0.5, 250));
    groundShape.setMargin(margin);
    //ground.castShadow = true;
    //ground.receiveShadow = true;
    ground.position.y = -0.5;
    createRigidBody(ground, groundShape, 0);

    importScene(JSON.parse(sceneJSONString));
    //ground.rotation.x = -0.1;
    //scene.add(ground);

/*
    var boxGeometry = new THREE.BoxGeometry(8, 8, 8);
    var boxMaterial = new THREE.MeshPhongMaterial({color: 0x654321, shading: THREE.FlatShading});
    var box = new THREE.Mesh(boxGeometry, boxMaterial);
    var boxShape = new Ammo.btBoxShape(new Ammo.btVector3(4, 4, 4));
    box.position.y = 15;
    boxShape.setMargin(margin);
    createRigidBody(box, boxShape, 64);

    var ballGeometry = new THREE.SphereGeometry(4, 16, 16);
    var ballMaterial = new THREE.MeshPhongMaterial({color: 0x7f7fff, shading: THREE.FlatShading});
    var ball = new THREE.Mesh(ballGeometry, ballMaterial);
    var ballShape = new Ammo.btSphereShape(4);
    ball.position.x = 5;
    ballShape.setMargin(margin);
    createRigidBody(ball, ballShape, 30);

    var icoGeometry = new THREE.IcosahedronGeometry(5);
    var icoMaterial = new THREE.MeshPhongMaterial({color: 0x7f7f00, shading: THREE.FlatShading});
    var ico = new THREE.Mesh(icoGeometry, icoMaterial);
    var icoShape = new Ammo.btConvexHullShape();
    for (i = 0; i < icoGeometry.vertices.length; i++) {
      icoShape.addPoint(new Ammo.btVector3(icoGeometry.vertices[i].x, icoGeometry.vertices[i].y, icoGeometry.vertices[i].z));
    }
    ico.position.y = 50;
    icoShape.setMargin(margin);
    createRigidBody(ico, icoShape, 10);

    var torusGeometry = new THREE.TorusGeometry(15, 2, 16, 16);
    var torusMaterial = new THREE.MeshPhongMaterial({color: 0x7fff7f, shading: THREE.FlatShading});
    var torus = new THREE.Mesh(torusGeometry, torusMaterial);
    var triangleMesh = new Ammo.btTriangleMesh();
    for (i = 0; i < torusGeometry.faces.length; i++) {
      var face = torusGeometry.faces[i];
      var vertex1 = new Ammo.btVector3(torusGeometry.vertices[face.a].x, torusGeometry.vertices[face.a].y, torusGeometry.vertices[face.a].z);
      var vertex2 = new Ammo.btVector3(torusGeometry.vertices[face.b].x, torusGeometry.vertices[face.b].y, torusGeometry.vertices[face.b].z);
      var vertex3 = new Ammo.btVector3(torusGeometry.vertices[face.c].x, torusGeometry.vertices[face.c].y, torusGeometry.vertices[face.c].z);
      triangleMesh.addTriangle(vertex1, vertex2, vertex3, true);
    }
    var torusShape = new Ammo.btBvhTriangleMeshShape(triangleMesh, true, true);
    //var torusShape = new Ammo.btGimpactMeshShape(triangleMesh);
    torus.position.y = -15;
    torus.position.x = 10;
    torus.rotation.x = Math.PI / 4;
    torusShape.setMargin(margin);
    createRigidBody(torus, torusShape, 5);
*/

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
        vrEffect.setVRDisplay(displays[0]);
        vrControls.setVRDisplay(displays[0]);
      }).catch(function() {
      });

    window.addEventListener("resize", onWindowResize);
    window.addEventListener("vrdisplaypresentchange", onWindowResize);
  }

  function createRigidBody(object, physicsShape, mass, id) {
    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(object.position.x, object.position.y, object.position.z));
    transform.setRotation(new Ammo.btQuaternion(object.quaternion.x, object.quaternion.y, object.quaternion.z, object.quaternion.w));
    var motionState = new Ammo.btDefaultMotionState(transform);
    var localInertia = new Ammo.btVector3(0, 0, 0);
    physicsShape.calculateLocalInertia(mass, localInertia);
    var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
    var body = new Ammo.btRigidBody(rbInfo);
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
    for (var i = 0; i < sceneJSON.length; i++) {
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
        case "TorusBufferGeometry":
          objectGeometry = new THREE.TorusGeometry(objectJSON.torusradius, objectJSON.torustube, objectJSON.torusradialsegments, objectJSON.torustubularsegments);
          break;
        default:
          break;
      }
      objectGeometry.vertices.forEach(function(v) {
        v.x = v.x * objectJSON.scalex;
        v.y = v.y * objectJSON.scaley;
        v.z = v.z * objectJSON.scalez;
      });
      var objectMaterial = new THREE.MeshPhongMaterial({color: objectJSON.color, shading: THREE.FlatShading});
      var object = new THREE.Mesh(objectGeometry, objectMaterial);
      var objectShape;
      //object = new Physijs.ConcaveMesh(objectGeometry, objectMaterial);
      if (objectJSON.type === "TorusBufferGeometry") {
        continue;
        /*
        var triangleMesh = new Ammo.btTriangleMesh();
        for (var j = 0; j < objectGeometry.faces.length; j++) {
          var face = objectGeometry.faces[j];
          var vertex1 = new Ammo.btVector3(objectGeometry.vertices[face.a].x, objectGeometry.vertices[face.a].y, objectGeometry.vertices[face.a].z);
          var vertex2 = new Ammo.btVector3(objectGeometry.vertices[face.b].x, objectGeometry.vertices[face.b].y, objectGeometry.vertices[face.b].z);
          var vertex3 = new Ammo.btVector3(objectGeometry.vertices[face.c].x, objectGeometry.vertices[face.c].y, objectGeometry.vertices[face.c].z);
          triangleMesh.addTriangle(vertex1, vertex2, vertex3, true);
        }
        objectShape = new Ammo.btBvhTriangleMeshShape(triangleMesh, true, true);
        */
      } else {
        objectShape = new Ammo.btConvexHullShape();
        for (var j = 0; j < objectGeometry.vertices.length; j++) {
          objectShape.addPoint(new Ammo.btVector3(objectGeometry.vertices[j].x, objectGeometry.vertices[j].y, objectGeometry.vertices[j].z));
        }
      }
      object.position.set(objectJSON.positionx, objectJSON.positiony, objectJSON.positionz);
      object.rotation.set(objectJSON.rotationx, objectJSON.rotationy, objectJSON.rotationz);
      objectShape.setMargin(margin);
      object.name = objectJSON.name;
      id++;
      createRigidBody(object, objectShape, 10, id);
      idToObject[id] = object;
    }
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    vrEffect.setSize(window.innerWidth, window.innerHeight);
  }

  function render() {
    if (!editing) {
      vrEffect.requestAnimationFrame(render);
      var deltaTime = clock.getDelta();
      updatePhysics(deltaTime);
      vrControls.update();
      Reticulum.update();
      vrEffect.render(scene, camera);
    }
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

  addBox = function addBox(positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x7f7f00, width = 4, height = 4, depth = 4) {
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
    createRigidBody(box, boxShape, 10, id);
    idToObject[id] = box;
    return id;
  }

  addCone = function addCone(positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x7f007f, radius = 2, height = 4, radialSegments = 16) {
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
    createRigidBody(cone, coneShape, 10, id);
    idToObject[id] = cone;
    return id;
  }

  addCylinder = function addCylinder(positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x007f7f, radiusTop = 2, radiusBottom = 2, height = 4, radialSegments = 16) {
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
    createRigidBody(cylinder, cylinderShape, 10, id);
    idToObject[id] = cylinder;
    return id;
  }

  addDodecahedron = function addDodecahedron(positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x7f7fff, radius = 2) {
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
    createRigidBody(dodecahedron, dodecahedronShape, 10, id);
    idToObject[id] = dodecahedron;
    return id;
  }

  addIcosahedron = function addIcosahedron(positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0x7fff7f, radius = 2) {
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
    createRigidBody(icosahedron, icosahedronShape, 10, id);
    idToObject[id] = icosahedron;
    return id;
  }

  addOctahedron = function addOctahedron(positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0xff7f7f, radius = 2) {
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
    createRigidBody(octahedron, octahedronShape, 10, id);
    idToObject[id] = octahedron;
    return id;
  }

  addSphere = function addSphere(positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0xffff7f, radius = 2, widthSegments = 16, heightSegments = 16) {
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
    createRigidBody(sphere, sphereShape, 10, id);
    idToObject[id] = sphere;
    return id;
  }

  addTetrahedron = function addTetrahedron(positionx = 0, positiony = 0, positionz = 0, rotationx = 0, rotationy = 0, rotationz = 0, scalex = 1, scaley = 1, scalez = 1, color = 0xff7fff, radius = 2) {
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
    createRigidBody(tetrahedron, tetrahedronShape, 10, id);
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

initEditor(true);
