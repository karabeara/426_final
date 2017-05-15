(function() {

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
    var renderer = new THREE.WebGLRenderer();
    var geometry = new THREE.BoxGeometry(700, 700, 700, 10, 10, 10);
    var startTime = Date.now();
    uniforms = {
			time: { type: "f", value: 1.0 },
		};
    var material = new THREE.ShaderMaterial( {
			uniforms: uniforms,
			vertexShader: document.getElementById( 'vertexShader' ).textContent,
			fragmentShader: document.getElementById( 'fragmentShader' ).textContent
		});
    //var material = new THREE.MeshBasicMaterial({color: 0xfffff});

    console.log(material)
    var cube = new THREE.Mesh(geometry, material);

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    scene.add(cube);
    camera.position.z = 1000;

    function render() {
      requestAnimationFrame(render);
      cube.rotation.x += 0.001;
      cube.rotation.y += 0.001;
      var elapsedMilliseconds = Date.now() - startTime;
		var elapsedSeconds = elapsedMilliseconds / 1000.;
		uniforms.time.value = 60. * elapsedSeconds;
      renderer.render(scene, camera);
    };

    render();
  }());