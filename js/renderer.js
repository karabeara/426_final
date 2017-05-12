"use strict";
var Reflection = Reflection || {
  ambient: new Pixel(0, 0, 0),
  diffuse: new Pixel(1.0, 1.0, 1.0),
  specular: new Pixel(1.0, 1.0, 1.0),
  shininess: 20,
};


Reflection.phongReflectionModel = function(vertex, view, normal, lightPos, phongMaterial) {
  var color = new Pixel(0, 0, 0);
 // normal.normalize();

  // diffuse
  var light_dir = (new THREE.Vector3()).subVectors(lightPos, vertex).normalize();
  var ndotl = normal.dot(light_dir);
  color.plus(phongMaterial.diffuse.copy().multipliedBy(ndotl));

  /* no specular
  var r = light_dir.reflect(normal);
  var v = view.normalize();
  var vdotr = -r.dot(v);
  if (vdotr < 0) vdotr = 0;
  if (vdotr > 1) vdotr = 1;
  var v = Math.pow(vdotr,phongMaterial.shininess);
  var spec = (phongMaterial.specular.copy()).multipliedBy(v);
  color.plus(spec); */

   color.plus(phongMaterial.ambient);
  // ----------- STUDENT CODE BEGIN ------------
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
  // ----------- Our reference solution uses 12 lines of code.
  for (var i = 0; i < 3; i++) {
    projectedVerts[i] = new THREE.Vector4(verts[i].x, verts[i].y, verts[i].z, 1.0);
	
	projectedVerts[i].applyMatrix4(viewMat);
	
	projectedVerts[i].x /= projectedVerts[i].w;
	projectedVerts[i].y /= projectedVerts[i].w;
	projectedVerts[i].z /= projectedVerts[i].w;
	
    projectedVerts[i].x = projectedVerts[i].x * this.width / 2 + this.width / 2;
    projectedVerts[i].y = projectedVerts[i].y * this.height / 2 + this.height / 2;

  }
  // ----------- STUDENT CODE END ------------

  return projectedVerts;
};

Renderer.computeBoundingBox = function(projectedVerts) {
  var box = {};
  box.minX = projectedVerts[0].x;
  box.minY = projectedVerts[0].y;
  box.maxX = projectedVerts[0].x;
  box.maxY = projectedVerts[0].y;

  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 14 lines of code.
  for (var i = 1; i < 3; i++) {
	  if  (projectedVerts[i].x < box.minX) box.minX = projectedVerts[i].x;
	  if  (projectedVerts[i].y < box.minY) box.minY = projectedVerts[i].y;
	  if  (projectedVerts[i].x > box.maxX) box.maxX = projectedVerts[i].x;
	  if  (projectedVerts[i].y > box.maxY) box.maxY = projectedVerts[i].y;
  }
  // ----------- STUDENT CODE END ------------

  if (box.minX < 0) box.minX = 0;
  if (box.minY < 0) box.minY = 0;
  if (box.maxX >= this.width) box.maxX = this.width - 1;
  if (box.maxY >= this.height) box.maxY = this.height - 1;
  
  return box;
};

Renderer.computeBarycentric = function(projectedVerts, x, y) {
  var triCoords = [];

  var F01 = (projectedVerts[0].y - projectedVerts[1].y) * x + (projectedVerts[1].x - projectedVerts[0].x) * y + (projectedVerts[0].x * projectedVerts[1].y - projectedVerts[0].y * projectedVerts[1].x);
  var F12 = (projectedVerts[1].y - projectedVerts[2].y) * x + (projectedVerts[2].x - projectedVerts[1].x) * y + (projectedVerts[1].x * projectedVerts[2].y - projectedVerts[1].y * projectedVerts[2].x);
  var F20 = (projectedVerts[2].y - projectedVerts[0].y) * x + (projectedVerts[0].x - projectedVerts[2].x) * y + (projectedVerts[2].x * projectedVerts[0].y - projectedVerts[2].y * projectedVerts[0].x);

  
  if (F01 <= 0 || F12 <= 0 || F20 <= 0) {
    return undefined;
  }
  else {
	    var total = F01 + F12 + F20;
		F01 = F01 / total;
		F12 = F12 / total;
		F20 = F20 / total;
		triCoords[0] = F12;
		triCoords[1] = F20;
		triCoords[2] = F01;
  }
  // (see https://fgiesen.wordpress.com/2013/02/06/the-barycentric-conspirac/)
  // return undefined if (x,y) is outside the triangle
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 15 lines of code.
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

Renderer.drawTriangleFlat = function(verts, projectedVerts, normals, uvs, material) {
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 45 lines of code.
	var color = new Pixel(1.0, 0, 0);
	var cent = new THREE.Vector3(0,0,0);
	cent.add(verts[0]).add(verts[1]).add(verts[2]);
	cent.divideScalar(3);
	var view = ((new THREE.Vector3()).copy(this.cameraPosition)).sub(cent);
	view.normalize();
	var v0 = (new THREE.Vector3(0,0,0)).copy(verts[0]);
	
	var normal = (new THREE.Vector3(0,0,0)).add(normals[0]).add(normals[1]).add(normals[2]);
	normal.normalize();
	
	var phongMaterial;
	if (uvs != undefined) {
		var uv = {};
		uv.x = (uvs[0].x+uvs[1].x+uvs[2].x)/3;
		uv.y = (uvs[0].y+uvs[1].y+uvs[2].y)/3;
		phongMaterial = Renderer.getPhongMaterial(uv, material);
	} else {
		phongMaterial = Renderer.getPhongMaterial(undefined, material);
	}
	color = Reflection.phongReflectionModel(cent, view, normal, this.lightPos, phongMaterial)
	
	var box = Renderer.computeBoundingBox(projectedVerts);
	for (var x = Math.floor(box.minX); x < box.maxX; x++) {
		var seen = false;
		for (var y = Math.floor(box.minY); y < box.maxY; y++) {
			var triCoords = Renderer.computeBarycentric(projectedVerts, x, y);
			if (triCoords != undefined) {
				seen = true;
				//01, 10, 20
				var z = projectedVerts[0].z * triCoords[0] + projectedVerts[1].z * triCoords[1] + projectedVerts[2].z * triCoords[2];
				if (z < this.zBuffer[x][y]) {
					this.zBuffer[x][y] = z;
					this.buffer.setPixel(x, y, color);
				}
			} else if (seen) {
				break; 
			}
		}
	}
  // ----------- STUDENT CODE END ------------
};


Renderer.drawTriangleGouraud = function(verts, projectedVerts, normals, uvs, material) {
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 42 lines of code.
	

	var view0 = ((new THREE.Vector3()).copy(this.cameraPosition)).sub(verts[0]);
	var view1 = ((new THREE.Vector3()).copy(this.cameraPosition)).sub(verts[1]);
	var view2 = ((new THREE.Vector3()).copy(this.cameraPosition)).sub(verts[2]);
	
	var phongMaterial;
	if (uvs != undefined) {
		var phongMaterial0 = Renderer.getPhongMaterial(uvs[0], material);
		var phongMaterial1 = Renderer.getPhongMaterial(uvs[1], material);
		var phongMaterial2 = Renderer.getPhongMaterial(uvs[2], material);
		var color0 = Reflection.phongReflectionModel(verts[0], view0, normals[0], this.lightPos, phongMaterial0);
		var color1 = Reflection.phongReflectionModel(verts[1], view1, normals[1], this.lightPos, phongMaterial1);
		var color2 = Reflection.phongReflectionModel(verts[2], view2, normals[2], this.lightPos, phongMaterial2);
	} else {
		var phongMaterial = Renderer.getPhongMaterial(undefined, material);
		var color0 = Reflection.phongReflectionModel(verts[0], view0, normals[0], this.lightPos, phongMaterial);
		var color1 = Reflection.phongReflectionModel(verts[1], view1, normals[1], this.lightPos, phongMaterial);
		var color2 = Reflection.phongReflectionModel(verts[2], view2, normals[2], this.lightPos, phongMaterial);
	}
	
	var box = Renderer.computeBoundingBox(projectedVerts);
	for (var x = Math.floor(box.minX); x < box.maxX; x++) {
		var seen = false;
		for (var y = Math.floor(box.minY); y < box.maxY; y++) {
			var triCoords = Renderer.computeBarycentric(projectedVerts, x, y);
			if (triCoords != undefined) {
				seen = true;
				//01, 10, 20
				var z = projectedVerts[0].z * triCoords[0] + projectedVerts[1].z * triCoords[1] + projectedVerts[2].z * triCoords[2];
				if (z < this.zBuffer[x][y]) {
					this.zBuffer[x][y] = z;
					var c0 = (color0.copy()).multipliedBy(triCoords[0]);
					var c1 = (color1.copy()).multipliedBy(triCoords[1]);
					var c2 = (color2.copy()).multipliedBy(triCoords[2]);
					
					this.buffer.setPixel(x, y, c0.plus(c1).plus(c2));
				}
			} else if (seen) {
				break; 
			}
		}
	}
	
  // ----------- STUDENT CODE END ------------
};


Renderer.drawTrianglePhong = function(verts, projectedVerts, normals, uvs, material) {
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 53 lines of code.
	var phongMaterial = Renderer.getPhongMaterial(undefined, material);

	var box = Renderer.computeBoundingBox(projectedVerts);
	for (var x = Math.floor(box.minX); x < box.maxX; x++) {
		var seen = false;
		for (var y = Math.floor(box.minY); y < box.maxY; y++) {
			var triCoords = Renderer.computeBarycentric(projectedVerts, x, y);
			if (triCoords != undefined) {
				seen = true;
				
				var z = projectedVerts[0].z * triCoords[0] + projectedVerts[1].z * triCoords[1] + projectedVerts[2].z * triCoords[2];
				if (z < this.zBuffer[x][y]) {
					//check alpha value here!!
						
					var v0 = ((new THREE.Vector3()).copy(verts[0])).multiplyScalar(triCoords[0]);
					var v1 = ((new THREE.Vector3()).copy(verts[1])).multiplyScalar(triCoords[1]);
					var v2 = ((new THREE.Vector3()).copy(verts[2])).multiplyScalar(triCoords[2]);
					var v = v0.add(v1).add(v2);
					var view = ((new THREE.Vector3(0,0,0)).copy(this.cameraPosition)).sub(v);
					view.normalize();
					
					var n;
					
					var isTransparent = false;
					
					var color;
					if (uvs !== undefined) {
						var uv = {};
						uv.x = uvs[0].x*triCoords[0]+uvs[1].x*triCoords[1]+uvs[2].x*triCoords[2];
						uv.y = uvs[0].y*triCoords[0]+uvs[1].y*triCoords[1]+uvs[2].y*triCoords[2];
						var newPhongMaterial = Renderer.getPhongMaterial(uv, material);

						if (newPhongMaterial.specular.r <= 0.1) {
							isTransparent = true;
						} else {
						
							if (material.xyzNormal != undefined && material.xyzNormal.width > 1) {
								var rgb = material.xyzNormal.getPixel(Math.floor(uv.x * (material.xyzNormal.width-1)), Math.floor(uv.y * (material.xyzNormal.height-1)));

								var xVal = 2 * rgb.r - 1;
								var yVal = 2 * rgb.g - 1;
								var zVal = 2 * rgb.b - 1;

								n = new THREE.Vector3(xVal, yVal, zVal);
								n.normalize();
							} else {
								var n0 = ((new THREE.Vector3()).copy(normals[0])).multiplyScalar(triCoords[0]);
								var n1 = ((new THREE.Vector3()).copy(normals[1])).multiplyScalar(triCoords[1]);
								var n2 = ((new THREE.Vector3()).copy(normals[2])).multiplyScalar(triCoords[2]);
								n = n0.add(n1).add(n2);
							}
							color = Reflection.phongReflectionModel(v, view, n, this.lightPos, newPhongMaterial);
						}
					} else {
						var n0 = ((new THREE.Vector3()).copy(normals[0])).multiplyScalar(triCoords[0]);
						var n1 = ((new THREE.Vector3()).copy(normals[1])).multiplyScalar(triCoords[1]);
						var n2 = ((new THREE.Vector3()).copy(normals[2])).multiplyScalar(triCoords[2]);
						n = n0.add(n1).add(n2);
						color = Reflection.phongReflectionModel(v, view, n, this.lightPos, phongMaterial);
					}
					
					if (!isTransparent) {
						this.zBuffer[x][y] = z;
						this.buffer.setPixel(x, y, color);
					}
				}
			} else if (seen) {
				break; 
			}
		}
	}
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
