	var stats, scene, renderer;
	var camera, cameraControl;


	if( !init() )	animate();

	// init the scene
	function init(){



	renderer = new THREE.WebGLRenderer();

	renderer.setSize( window.innerWidth, window.innerHeight );
	document.getElementById('container').appendChild(renderer.domElement);


	// create a scene
	scene = new THREE.Scene();

	// put a camera in the scene
	camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.set(0, 0, 5);
	scene.add(camera);


	//var startTime = Date.now();

	// make material 

	uniforms = {
	time: { type: "f", value: 1.0 },
	};
		var material = new THREE.ShaderMaterial( {
	uniforms: uniforms,
	vertexShader: document.getElementById( 'vertexShader' ).textContent,
	fragmentShader: document.getElementById( 'fragmentShader' ).textContent
	});

	// here you add your objects
	// - you will most likely replace this part by your own
	var geometry = new THREE.BoxGeometry(700, 700, 700, 10, 10, 10);
	//var material	= new THREE.MeshBasicMaterial({color: 0x00ff00});
	var mesh	= new THREE.Mesh( geometry, material );
	scene.add( mesh );
	}

	// animation loop
	function animate() {

	cube.rotation.x += 0.001;
	cube.rotation.y += 0.001;
	var elapsedMilliseconds = Date.now() - startTime;
	var elapsedSeconds = elapsedMilliseconds / 1000.;
	uniforms.time.value = 60. * elapsedSeconds;
	// loop on request animation loop
	// - it has to be at the begining of the function
	// - see details at http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
	requestAnimationFrame( animate );

	// do the render
	render();


	}

	// render the scene
	function render() {



	// actually render the scene
	renderer.render( scene, camera );
	}