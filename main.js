(function () {
    if (!Detector.webgl) {

        Detector.addGetWebGLMessage();
        document.getElementById('container').innerHTML = "";

    }

    var container;
    var camera, scene, renderer;
    var sphere;

    var water;
    var mirrorMesh;

    var MAX_FOV = 75, MIN_FOV = 5;
    var MIN_PHI = Math.PI / 100, MAX_PHI = Math.PI / 2;

    var fov = 55;
    var mouse = new THREE.Vector2(0, 0);
    var touch = new THREE.Vector2(0, 0);
    var deltaMouse = new THREE.Vector2(0, 0);
    var deltaTouch = new THREE.Vector2(0, 0);
    var mouseDown = false;
    var touchDown = false;
    var pinch = false;
    var pinchLength = 0;
    var deltaPinch = 0;
    var theta = 0, phi = Math.PI/10;
    var deltaTheta = 0, deltaPhi = 0;
    var target = new THREE.Vector3(0, 0, 0);
    var radius = 3000;
    var rotateSpeed = {mouse: 3, touch: 1};
    var pinchSpeed = 0.1;

    var parameters = {
        width: 2000,
        height: 2000,
        widthSegments: 250,
        heightSegments: 250,
        depth: 1500,
        param: 4,
        filterparam: 1
    };

    var waterNormals;

    init();
    animate();

    function init() {

        container = document.createElement('div');
        document.body.appendChild(container);

        renderer = new THREE.WebGLRenderer();
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.5, 3000000);
        camera.up.set(0, 1, 0);
        camera.position.x = radius * Math.cos(phi) * Math.sin(theta);
        camera.position.y = radius * Math.sin(phi);
        camera.position.z = radius * Math.cos(phi) * Math.cos(theta);
        camera.lookAt(target);

        scene.add(new THREE.AmbientLight(0x444444));

        var light = new THREE.DirectionalLight(0xffffbb, 1);
        light.position.set(-1, 1, -1);
        scene.add(light);


        waterNormals = new THREE.TextureLoader().load('textures/waternormals.jpg');
        waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

        water = new THREE.Water(renderer, camera, scene, {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: waterNormals,
            alpha: 1.0,
            sunDirection: light.position.clone().normalize(),
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
            distortionScale: 50.0
        });


        mirrorMesh = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(parameters.width * 500, parameters.height * 500),
            water.material
        );

        mirrorMesh.add(water);
        mirrorMesh.rotation.x = -Math.PI * 0.5;
        scene.add(mirrorMesh);

        var cubeMap = new THREE.CubeTexture([]);
        cubeMap.format = THREE.RGBFormat;

        var loader = new THREE.ImageLoader();
        loader.load('textures/skyboxsun25degtest.png', function (image) {
            var getSide = function (x, y) {
                var size = 1024;

                var canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;

                var context = canvas.getContext('2d');
                context.drawImage(image, -x * size, -y * size);

                return canvas;
            };
            cubeMap.images[0] = getSide(2, 1); // px
            cubeMap.images[1] = getSide(0, 1); // nx
            cubeMap.images[2] = getSide(1, 0); // py
            cubeMap.images[3] = getSide(1, 2); // ny
            cubeMap.images[4] = getSide(1, 1); // pz
            cubeMap.images[5] = getSide(3, 1); // nz
            cubeMap.needsUpdate = true;
        });

        var cubeShader = THREE.ShaderLib['cube'];
        cubeShader.uniforms['tCube'].value = cubeMap;

        var skyBoxMaterial = new THREE.ShaderMaterial({
            fragmentShader: cubeShader.fragmentShader,
            vertexShader: cubeShader.vertexShader,
            uniforms: cubeShader.uniforms,
            depthWrite: false,
            side: THREE.BackSide
        });

        var skyBox = new THREE.Mesh(
            new THREE.BoxGeometry(1000000, 1000000, 1000000),
            skyBoxMaterial
        );

        scene.add(skyBox);

        var geometry = new THREE.IcosahedronGeometry(400, 4);
        for (var i = 0, j = geometry.faces.length; i < j; i++) {
            geometry.faces[i].color.setHex(Math.random() * 0xffffff);
        }

        var material = new THREE.MeshPhongMaterial({
            vertexColors: THREE.FaceColors,
            shininess: 100,
            envMap: cubeMap
        });

        sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);


        window.addEventListener('mousedown', onMouseDown, false);
        window.addEventListener('touchstart', onTouchStart, false);
        window.addEventListener('wheel', onWheel, false);
        window.addEventListener('resize', onWindowResize, false);
    }

    function onWindowResize() {
        var containerW = window.innerWidth;
        var containerH = window.innerHeight;

        camera.aspect = containerW / containerH;
        camera.updateProjectionMatrix();

        renderer.setSize(containerW, containerH);
    }

    function onWheel(event) {
        event.preventDefault();
        event.stopPropagation();

        fov += event.deltaY;
        fov = Math.max(MIN_FOV, Math.min(MAX_FOV, fov));
        camera.fov = fov;
        camera.updateProjectionMatrix();
    }

    function onMouseDown(event) {
        mouseDown = true;

        window.addEventListener('mousemove', onMouseMove, false);
        window.addEventListener('mouseup', onMouseUp, false);
        window.addEventListener('mouseout', onMouseOut, false);

        mouse.x = event.clientX;
        mouse.y = event.clientY;
    }

    function calcPinchLength(e) {
        var x = e.touches[0].clientX;
        var y = e.touches[0].clientY;
        return Math.sqrt(x * x + y * y);
    }

    function onTouchStart(event) {
        event.preventDefault();
        event.stopPropagation();

        if (event.touches.length > 1) {
            pinch = true;
            pinchLength = calcPinchLength(event);
        }
        else {
            pinch = false;
            touchDown = true;
            touch.x = event.touches[0].clientX;
            touch.y = event.touches[0].clientY;
        }

        window.addEventListener('touchmove', onTouchMove, false);
        window.addEventListener('touchend', onTouchEnd, false);
        window.addEventListener('touchcancel', onTouchCancel, false);
    }

    function onMouseMove(event) {
        if (mouseDown) {
            deltaMouse.x = event.clientX - mouse.x;
            deltaMouse.y = event.clientY - mouse.y;

            mouse.x = event.clientX;
            mouse.y = event.clientY;

            deltaTheta = deltaMouse.x / radius;
            deltaPhi = deltaMouse.y / radius;

            theta -= deltaTheta * rotateSpeed.mouse;
            phi += deltaPhi * rotateSpeed.mouse;
            phi = Math.max(MIN_PHI, Math.min(MAX_PHI, phi));
        }
    }

    function onTouchMove(event) {
        event.preventDefault();
        event.stopPropagation();

        if (pinch || event.touches.length > 1) {
            deltaPinch = calcPinchLength(event) - pinchLength;

            fov += deltaPinch;
            fov = Math.max(MIN_FOV, Math.min(MAX_FOV, fov));
            camera.fov = fov;
            camera.updateProjectionMatrix();
            pinchLength = calcPinchLength(event);
        }
        else if (touchDown) {
            deltaTouch.x = event.touches[0].clientX - touch.x;
            deltaTouch.y = event.touches[0].clientY - touch.y;

            touch.x = event.touches[0].clientX;
            touch.y = event.touches[0].clientY;

            deltaTheta = deltaTouch.x / radius;
            deltaPhi = deltaTouch.y / radius;

            theta -= deltaTheta * rotateSpeed.touch;
            phi += deltaPhi * rotateSpeed.touch;
            phi = Math.max(MIN_PHI, Math.min(MAX_PHI, phi));
        }
    }

    function onMouseUp(event) {
        disposeListeners(event);
    }

    function onTouchEnd(event) {
        event.preventDefault();
        event.stopPropagation();
        disposeListeners(event);
    }

    function onMouseOut() {
        disposeListeners();
    }

    function onTouchCancel() {
        event.preventDefault();
        event.stopPropagation();
        disposeListeners();
    }

    function disposeListeners() {
        mouseDown = false;
        touchDown = false;
        deltaTheta = 0;
        deltaPhi = 0;

        window.removeEventListener('mousemove', onMouseMove, false);
        window.removeEventListener('mouseup', onMouseUp, false);
        window.removeEventListener('mouseout', onMouseOut, false);
        window.removeEventListener('touchmove', onTouchMove, false);
        window.removeEventListener('touchEnd', onTouchEnd, false);
        window.removeEventListener('touchCancel', onTouchCancel, false);
    }

    function animate() {

        requestAnimationFrame(animate);
        render();

    }

    function render() {
        var time = performance.now() * 0.001;

        sphere.position.y = Math.sin(time) * 500 + 250;
        sphere.rotation.x = time * 0.5;
        sphere.rotation.z = time * 0.51;

        if (mouseDown || touchDown) {
            camera.position.x = radius * Math.cos(phi) * Math.sin(theta);
            camera.position.y = radius * Math.sin(phi);
            camera.position.z = radius * Math.cos(phi) * Math.cos(theta);

            camera.lookAt(target);
        }

        water.material.uniforms.time.value += 1.0 / 60.0;
        water.render();
        renderer.render(scene, camera);
    }

})();
