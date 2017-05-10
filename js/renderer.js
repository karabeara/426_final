"use strict";
var Reflection = Reflection || {
  ambient: new Pixel(0, 0, 0),
  diffuse: new Pixel(1.0, 1.0, 1.0),
  specular: new Pixel(1.0, 1.0, 1.0),
  shininess: 20,
};


Reflection.phongReflectionModel = function(vertex, view, normal, lightPos, phongMaterial) {
  var color = new Pixel(0, 0, 0);
  normal.normalize();

  // diffuse
  var light_dir = (new THREE.Vector3()).subVectors(lightPos, vertex).normalize();
  var ndotl = normal.dot(light_dir);
  color.plus(phongMaterial.diffuse.copy().multipliedBy(ndotl));

  // ----------- STUDENT CODE BEGIN ------------
  var lightVector = (new THREE.Vector3()).subVectors(lightPos, vertex);
  var dist = lightVector.length();
  var attenuation = dist * dist;

  // ambient
  color.plus(phongMaterial.ambient.copy());

  // specular: angle alpha -> angle for reflected ray
  var reflection_vector = lightVector.reflect(normal);
  reflection_vector.normalize();
  view.normalize();
  var cos_alpha = reflection_vector.dot( view );

  if (cos_alpha > 0) {
    var specularIntensity = Math.pow(cos_alpha, phongMaterial.shininess);
    color.plus(phongMaterial.specular.copy().multipliedBy(4 * specularIntensity / attenuation));
  }

  // ----------- Our reference solution uses 9 lines of code.
  // ----------- STUDENT CODE END ------------

  return color;
}

var Renderer = Renderer || {
  meshInstances: new Set(),
  width: 320,
  height: 240,
  negNear: 0.3,
  negFar: 1000,
  fov: 45,
  lightPos: new THREE.Vector3(10, 10, -10),
  shaderMode: "",
  cameraLookAtVector: new THREE.Vector3(0, 0, 0),
  cameraPosition: new THREE.Vector3(0, 0, -10),
  cameraUpVector: new THREE.Vector3(0, -1, 0),
  cameraUpdated: true
};

Renderer.updateCameraParameters = function() {
  this.camera.position.copy(this.cameraPosition);
  this.camera.up.copy(this.cameraUpVector);
  this.camera.lookAt(this.cameraLookAtVector);
};


Renderer.initialize = function() {
  this.buffer = new Image(this.width, this.height);
  this.zBuffer = [];

  // set camera
  this.camera = new THREE.PerspectiveCamera(this.fov, this.width / this.height, this.negNear, this.negFar);
  this.updateCameraParameters();

  this.clearZBuffer();
  this.buffer.display(); // initialize canvas
};

Renderer.clearZBuffer = function() {
  for (var x = 0; x < this.width; x++) {
    this.zBuffer[x] = new Float32Array(this.height);
    for (var y = 0; y < this.height; y++) {
      this.zBuffer[x][y] = 1; // z value is in [-1 1];
    }
  }
};

Renderer.addMeshInstance = function(meshInstance) {
  assert(meshInstance.mesh, "meshInstance must have mesh to be added to renderer");
  this.meshInstances.add(meshInstance);
};

Renderer.removeMeshInstance = function(meshInstance) {
  this.meshInstances.delete(meshInstance);
};

Renderer.clear = function() {
  this.buffer.clear();
  this.clearZBuffer();
  Main.context.clearRect(0, 0, Main.canvas.width, Main.canvas.height);
};

Renderer.displayImage = function() {
  this.buffer.display();
};

Renderer.render = function() {
  this.clear();

  var eps = 0.01;
  if (!(this.cameraUpVector.distanceTo(this.camera.up) < eps &&
      this.cameraPosition.distanceTo(this.camera.position) < eps &&
      this.cameraLookAtVector.distanceTo(Main.controls.target) < eps)) {
    this.cameraUpdated = false;
    // update camera position
    this.cameraLookAtVector.copy(Main.controls.target);
    this.cameraPosition.copy(this.camera.position);
    this.cameraUpVector.copy(this.camera.up);
  } else { // camera's stable, update url once
    if (!this.cameraUpdated) {
      Gui.updateUrl();
      this.cameraUpdated = true; //update one time
    }
  }

  this.camera.updateMatrixWorld();
  this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);

  // light goes with the camera, COMMENT this line for debugging if you want
  this.lightPos = this.camera.position;

  for (var meshInst of this.meshInstances) {
    var mesh = meshInst.mesh;
    if (mesh !== undefined) {
      for (var faceIdx = 0; faceIdx < mesh.faces.length; faceIdx++) {
        var face = mesh.faces[faceIdx];
        var verts = [mesh.vertices[face.a], mesh.vertices[face.b], mesh.vertices[face.c]];
        var vert_normals = [mesh.vertex_normals[face.a], mesh.vertex_normals[face.b], mesh.vertex_normals[face.c]];

        // camera's view matrix = K * [R | t] where K is the projection matrix and [R | t] is the inverse of the camera pose
        var viewMat = (new THREE.Matrix4()).multiplyMatrices(this.camera.projectionMatrix,
          this.camera.matrixWorldInverse);


        Renderer.drawTriangle(verts, vert_normals, mesh.uvs[faceIdx], meshInst.material, viewMat);
      }
    }
  }

  this.displayImage();
};

Renderer.getPhongMaterial = function(uv_here, material) {
  var phongMaterial = {};
  phongMaterial.ambient = Reflection.ambient;

  if (material.diffuse === undefined || uv_here === undefined) {
    phongMaterial.diffuse = Reflection.diffuse;
  } else if (Pixel.prototype.isPrototypeOf(material.diffuse)) {
    phongMaterial.diffuse = material.diffuse;
  } else {
    // note that this function uses point sampling. it would be better to use bilinear
    // subsampling and mipmaps for area sampling, but this good enough for now...
    phongMaterial.diffuse = material.diffuse.getPixel(Math.floor(uv_here.x * (material.diffuse.width-1)),
      Math.floor(uv_here.y * (material.diffuse.height-1)));
  }

  if (material.specular === undefined || uv_here === undefined) {
    phongMaterial.specular = Reflection.specular;
  } else if (Pixel.prototype.isPrototypeOf(material.specular)) {
    phongMaterial.specular = material.specular;
  } else {
    phongMaterial.specular = material.specular.getPixel(Math.floor(uv_here.x * (material.specular.width-1)),
      Math.floor(uv_here.y * (material.specular.height-1)));
  }

  phongMaterial.shininess = Reflection.shininess;

  return phongMaterial;
};

Renderer.projectVerticesNaive = function(verts) {
  // this is a naive orthogonal projection, does not even consider camera pose
  var projectedVerts = [];

  var orthogonalScale = 5;
  for (var i = 0; i < 3; i++) {
    projectedVerts[i] = new THREE.Vector4(verts[i].x, verts[i].y, verts[i].z, 1.0);

    projectedVerts[i].x /= orthogonalScale;
    projectedVerts[i].y /= orthogonalScale * this.height / this.width;

    projectedVerts[i].x = projectedVerts[i].x * this.width / 2 + this.width / 2;
    projectedVerts[i].y = projectedVerts[i].y * this.height / 2 + this.height / 2;
  }

  return projectedVerts;
};

Renderer.projectVertices = function(verts, viewMat) {
  var projectedVerts = []; // Vector3/Vector4 array (you need z for z buffering)

  // ----------- STUDENT CODE BEGIN ------------
  // viewMat --> camera's view matrix = K * [R | t] where K is the projection matrix and [R | t] is the inverse of the camera pose
  var i_outOfBounds = 0;

  for (var i = 0; i < verts.length; i++) {
    projectedVerts[i] = new THREE.Vector4(verts[i].x, verts[i].y, verts[i].z, 1.0);
    projectedVerts[i] = projectedVerts[i].applyMatrix4(viewMat);

    projectedVerts[i].x /= projectedVerts[i].w;
    projectedVerts[i].y /= projectedVerts[i].w;
    projectedVerts[i].z /= projectedVerts[i].w;

    projectedVerts[i].x = projectedVerts[i].x * this.width / 2 + this.width / 2;
    projectedVerts[i].y = projectedVerts[i].y * this.height / 2 + this.height / 2;

    if ( projectedVerts[i].z >= 0 ) { i_outOfBounds++; }
    if ( this.negNear >= projectedVerts[i].z && this.negFar <= projectedVerts[i].z ) { } // do nothing
    else { i_outOfBounds++; }
  }

  // Check if triangle out of bounds --> if out of bounds, do not render triangle
  if ( i_outOfBounds === 3 ) { return undefined; }

  // ----------- Our reference solution uses 12 lines of code.
  // ----------- STUDENT CODE END ------------
  return projectedVerts;
};

Renderer.computeBoundingBox = function(projectedVerts) {
  var box = {};
  box.minX = -1;
  box.minY = -1;
  box.maxX = -1;
  box.maxY = -1;

  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 14 lines of code.
  function checkBounds(vert) {

    var roundedVertX = Math.round(vert.x);
    var roundedVertY = Math.round(vert.y);

    if (roundedVertX < box.minX) {
      box.minX = roundedVertX;
    }
    if (roundedVertY < box.minY) {
      box.minY = roundedVertY;
    }
    if (roundedVertX > box.maxX) {
      box.maxX = roundedVertX;
    }
    if (roundedVertY > box.maxY) {
      box.maxY= roundedVertY;
    }
  }

  projectedVerts.forEach(v => checkBounds(v));
  // ----------- STUDENT CODE END ------------
  return box;
};

function make2D(vert3D) {
  return new THREE.Vector3(vert3D,x, vert3D.y,0);
}
Renderer.computeBarycentric = function(projectedVerts, x, y) {
  var triCoords = [];
  // (see https://fgiesen.wordpress.com/2013/02/06/the-barycentric-conspirac/)
  // return undefined if (x,y) is outside the triangle
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 15 lines of code.

  var triPoints = projectedVerts.map(function(vert) {
    return new THREE.Vector3(vert.x, vert.y, 0);
  })
  var point = new THREE.Vector3(x,y, 0);

  var triangle = new THREE.Triangle(make2D(triPoints[0]), make2D(triPoints[1]), make2D(triPoints[2]));
  if (triangle.containsPoint(point)) {
    return triangle.barycoordFromPoint(point)
  }
  else {
      return undefined;
  }
  // ----------- STUDENT CODE END ------------
  return triCoords;
};

Renderer.drawTriangleWire = function(projectedVerts) {
  var color = new Pixel(1.0, 0, 0);
  for (var i = 0; i < 3; i++) {
    var va = projectedVerts[(i + 1) % 3];
    var vb = projectedVerts[(i + 2) % 3];

    var ba = new THREE.Vector2(vb.x - va.x, vb.y - va.y);
    var len_ab = ba.length();
    ba.normalize();
    // draw line
    for (var j = 0; j < len_ab; j += 0.5) {
      var x = Math.round(va.x + ba.x * j);
      var y = Math.round(va.y + ba.y * j);
      this.buffer.setPixel(x, y, color);
    }
  }
};

// do z buffer stuff
function _calculateAverageVect(normals) {
  var avgNorm = new THREE.Vector3(0,0,0);
  normals.forEach(function (norm) {
    avgNorm.add(norm)
  })
  avgNorm.divideScalar(normals.length)
  return avgNorm;
}

function _getCentroidDist(projectedVerts) {
  var centroidVertex = _calculateAverageVect(projectedVerts);
  return centroidVertex.z;
}

function _interpolateUVCoordinates(uvs, baryCoord) {
  var uv_here = new THREE.Vector2( 0, 0 );
  if (uvs === undefined) {
    return undefined;
  } else {
    uv_here.x += uvs[0].x * baryCoord.x;
    uv_here.x += uvs[1].x * baryCoord.y;
    uv_here.x += uvs[2].x * baryCoord.z;

    uv_here.y += uvs[0].y * baryCoord.x;
    uv_here.y += uvs[1].y * baryCoord.y;
    uv_here.y += uvs[2].y * baryCoord.z;
  }
  return uv_here;
}

Renderer.drawTriangleFlat = function(verts, projectedVerts, normals, uvs, material) {
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 45 lines of code.

  function _getFlatColor(cameraPosition, lightPos, projectedTriangle) {
    var centroidVertex = _calculateAverageVect( verts );
    var centroidNormal = _calculateAverageVect( normals );
    var view = ( new THREE.Vector3() ).subVectors( centroidVertex, cameraPosition );
    var baryCoord = projectedTriangle.barycoordFromPoint(centroidVertex);
    var uv_here = _interpolateUVCoordinates(uvs, baryCoord);
    var phongMaterial = Renderer.getPhongMaterial( uv_here, material );
    var flatColor = Reflection.phongReflectionModel( centroidVertex, view, centroidNormal, lightPos, phongMaterial );
    return flatColor;
  }

  var projectedTriangle = new THREE.Triangle(projectedVerts[0], projectedVerts[1], projectedVerts[2]);
  var faceColor = _getFlatColor(this.cameraPosition, this.lightPos, projectedTriangle);
  var boundBox = Renderer.computeBoundingBox(projectedVerts);
  var centroidDist = _getCentroidDist(projectedVerts)

  var eps = 0.01;

  for (var x = boundBox.minX; x < boundBox.maxX; x++) {
    for (var y = boundBox.minY; y < boundBox.maxY; y++) {
      var currentHalfPix = new THREE.Vector3(Math.floor(x) + 0.5, Math.floor(y) + 0.5, 0);
      if (projectedTriangle.containsPoint(currentHalfPix)) {
        var baryCoord = projectedTriangle.barycoordFromPoint(currentHalfPix);
        var pixDepth = _getPixelDepth(projectedVerts, baryCoord);
        if (pixDepth > -eps && pixDepth < this.zBuffer[x][y]) {
          this.buffer.setPixel(x,y,faceColor);
          this.zBuffer[x][y] = pixDepth;
        }
      }
    }
  }
  // ----------- STUDENT CODE END ------------
};

 function _getPixelDepth(projectedVerts, baryCoord) {

    var pixVertex = new THREE.Vector3(0,0,0);
    pixVertex.add(projectedVerts[0].clone().multiplyScalar(baryCoord.x));
    pixVertex.add(projectedVerts[1].clone().multiplyScalar(baryCoord.y));
    pixVertex.add(projectedVerts[2].clone().multiplyScalar(baryCoord.z));

    return pixVertex.z;
  }

Renderer.drawTriangleGouraud = function(verts, projectedVerts, normals, uvs, material) {
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 42 lines of code.
  function _getGouraudVectColors(verts, normals, lightPos, uvs, cameraPosition, material) {
    assert(verts.length == 3);
    var vertColors = [];
    for (var i = 0; i < verts.length; i++) {
      var uv_here = new THREE.Vector2();
      if (uvs === undefined) { uv_here = undefined; }
      else                   { uv_here = uvs[i]; }
      var phongMaterial = Renderer.getPhongMaterial(uv_here, material);
      var view = (new THREE.Vector3()).subVectors(verts[i], cameraPosition );
      vertColors[i] = Reflection.phongReflectionModel(verts[i], view, normals[i], lightPos, phongMaterial);
    }
    assert(vertColors.length === verts.length);
    return vertColors;
  }
  function _getGouraudInterpolatedColor(baryCoord, vertColors) {
    var color = new Pixel(0,0,0);

    color.plus(vertColors[0].copyMultiplyScalar(baryCoord.x))
    color.plus(vertColors[1].copyMultiplyScalar(baryCoord.y))
    color.plus(vertColors[2].copyMultiplyScalar(baryCoord.z))
    return color;
  }

  var boundBox = Renderer.computeBoundingBox(projectedVerts);
  var projectedTriangle = new THREE.Triangle(projectedVerts[0], projectedVerts[1], projectedVerts[2]);
  var phongMaterial = Renderer.getPhongMaterial(uvs, material);
  var lightPos = this.lightPos;
  var cameraPosition = this.cameraPosition
  var eps = 0.01;
  var vertColors = _getGouraudVectColors(verts, normals, lightPos, uvs, cameraPosition, material)
  //var centroidDist = _getCentroidDist(projectedVerts)

  for (var x = boundBox.minX; x < boundBox.maxX; x++) {
    for (var y = boundBox.minY; y < boundBox.maxY; y++) {
      var currentHalfPix = new THREE.Vector3(Math.floor(x) + 0.5, Math.floor(y) + 0.5, 0);
      if (projectedTriangle.containsPoint(currentHalfPix)) {
        var baryCoord = projectedTriangle.barycoordFromPoint(currentHalfPix);
        var pixDepth = _getPixelDepth(projectedVerts, baryCoord);
          if (pixDepth > -eps && pixDepth < this.zBuffer[x][y]) {

          this.buffer.setPixel(x,y,_getGouraudInterpolatedColor(baryCoord, vertColors));
          this.zBuffer[x][y] = pixDepth;
        }
      }
    }
  }
  // ----------- STUDENT CODE END ------------
};


Renderer.drawTrianglePhong = function(verts, projectedVerts, normals, uvs, material) {
  // ----------- STUDENT CODE BEGIN ------------
  function _getPhongInterpolatedNormal(baryCoord, normals, uv_here, material) {
    var norm = new THREE.Vector3();

    if ( material.xyzNormal === undefined || uv_here === undefined ) {
      // do nothing with normal mapping, simply interpolate from 3 vertices' normals
      norm.add(normals[0].clone().multiplyScalar(baryCoord.x));
      norm.add(normals[1].clone().multiplyScalar(baryCoord.y));
      norm.add(normals[2].clone().multiplyScalar(baryCoord.z));
    }
    else {
      var xyzNormal_RGB = material.xyzNormal.getPixel(Math.floor(uv_here.x * (material.xyzNormal.width-1)),
        Math.floor(uv_here.y * (material.xyzNormal.height-1)));

      var xyzNormal = new THREE.Vector3();

      xyzNormal.x = 2 * xyzNormal_RGB.r - 1;
      xyzNormal.y = 2 * xyzNormal_RGB.g - 1;
      xyzNormal.z = 2 * xyzNormal_RGB.b - 1;

      norm = xyzNormal;
    }

    return norm;
  }

  var boundBox = Renderer.computeBoundingBox(projectedVerts);
  var projectedTriangle = new THREE.Triangle(projectedVerts[0], projectedVerts[1], projectedVerts[2]);
  //var phongMaterial = Renderer.getPhongMaterial(uvs, material);
  var lightPos = this.lightPos;
  var cameraPosition = this.cameraPosition
  var eps = 0.01;
  var centroidDist = _getCentroidDist(projectedVerts)

  for (var x = boundBox.minX; x < boundBox.maxX; x++) {
    for (var y = boundBox.minY; y < boundBox.maxY; y++) {
      var currentHalfPix = new THREE.Vector3(Math.floor(x) + 0.5, Math.floor(y) + 0.5, 0);
      if (projectedTriangle.containsPoint(currentHalfPix)) {
        var baryCoord = projectedTriangle.barycoordFromPoint(currentHalfPix);
        var pixDepth = _getPixelDepth(projectedVerts, baryCoord);
        if (pixDepth > -eps && pixDepth < this.zBuffer[x][y]) {

          var uv_here = new THREE.Vector3();
          var uv_here = _interpolateUVCoordinates(uvs, baryCoord);
          var phongMaterial = Renderer.getPhongMaterial(uv_here, material);

          var vertNorm  = _getPhongInterpolatedNormal(baryCoord, normals, uv_here, material);

          var currentVert = new THREE.Vector3();
          currentVert.add(verts[0].clone().multiplyScalar(baryCoord.x));
          currentVert.add(verts[1].clone().multiplyScalar(baryCoord.y));
          currentVert.add(verts[2].clone().multiplyScalar(baryCoord.z));

          var view = (new THREE.Vector3()).subVectors( currentVert, cameraPosition );
          var vertColor = Reflection.phongReflectionModel(currentVert, view, vertNorm, lightPos, phongMaterial);

          this.buffer.setPixel(x,y,vertColor);
          this.zBuffer[x][y] = pixDepth;
        }
      }
    }
  }
  // ----------- Our reference solution uses 53 lines of code.
  // ----------- STUDENT CODE END ------------
};


Renderer.drawTriangle = function(verts, normals, uvs, material, viewMat) {

  var projectedVerts = this.projectVertices(verts, viewMat);
  if (projectedVerts === undefined) { // not within near and far plane
    return;
  } else if (projectedVerts.length <= 0){
    projectedVerts = this.projectVerticesNaive(verts);
  }

  switch (this.shaderMode) {
    case "Wire":
      this.drawTriangleWire(projectedVerts);
      break;
    case "Flat":
      this.drawTriangleFlat(verts, projectedVerts, normals, uvs, material);
      break;
    case "Gouraud":
      this.drawTriangleGouraud(verts, projectedVerts, normals, uvs, material);
      break;
    case "Phong":
      this.drawTrianglePhong(verts, projectedVerts, normals, uvs, material);
      break;
    default:
  }
};
