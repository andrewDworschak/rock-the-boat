$(document).ready(function () {
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
    var theta = 0, phi = Math.PI / 10;
    var deltaTheta = 0, deltaPhi = 0;
    var target = new THREE.Vector3(0, 0, 0);
    var radius = 300;
    var rotateSpeed = {mouse: 3, touch: 1};
    var pinchSpeed = 0.1;

    //Boat variables
    var h = 0;
    var boat_theta = 0;
    var V_sub = 0;
    var B_x = 0;
    var B_y = 0;
    var R = 0;
    var net_force = 0;
    var net_torque = 0;
    var accel_h = 0;
    var speed_h = 0;
    var accel_theta = 0;
    var speed_theta = 0.03;
    var g = 10;

    //Situation variables
    var fluid_density = 2;
    var delta_t = 0.02;
    var lastTime = 1;
    var damping = 0.2;
    var water_h = 0;
    var water_theta = 0;


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
        container = document.getElementById('webGL-canvas');

        renderer = new THREE.WebGLRenderer();
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        scene = new THREE.Scene();
        window.scene = scene;

        camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.5, 3000000);
        camera.up.set(0, 1, 0);
        camera.position.x = radius * Math.cos(phi) * Math.sin(theta);
        camera.position.y = radius * Math.sin(phi);
        camera.position.z = radius * Math.cos(phi) * Math.cos(theta);
        camera.lookAt(target);

        scene.add(new THREE.AmbientLight(0x444444));

        var light = new THREE.DirectionalLight(0xffffbb, 1);
        light.position.set(1, 1, 1);
        scene.add(light);

        waterNormals = new THREE.TextureLoader().load('textures/waternormals.jpg');
        waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

        water = new THREE.Water(renderer, camera, scene, {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: waterNormals,
            alpha: 0.8,
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

        fov += event.deltaY / 50;
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

            fov -= deltaPinch;
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
        window.removeEventListener('touchend', onTouchEnd, false);
        window.removeEventListener('touchcancel', onTouchCancel, false);
    }

    function animate() {

        requestAnimationFrame(animate);
        render();

    }

    function render() {
        var time = performance.now() * 0.001;

        water_h = 0 * (1 - Math.cos(time));
        water_theta = 0 * Math.sin(time);

        if (window.ymatx != undefined) {
            moveBoat();
            window.boat.rotation.z = boat_theta;
            window.boat.position.y = h;
            window.CoM.position.y = h;
            window.BoM.position.set(-Math.cos(boat_theta) * B_x - Math.sin(boat_theta) * B_y, -Math.sin(boat_theta) * B_x + Math.cos(boat_theta) * B_y + h, 110);
        }
        else {
            h = water_h;
            boat_theta = water_theta;
            accel_h = 0;
            speed_h = 0;
            accel_theta = 0;
            speed_theta = 0.1;
        }

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

    /*function moveBoat() {
     //Vsub = Math.max(window.ymatx[subdiv]+Math.min(window.ymatx[subdiv],(subdiv-h)/tan_theta)) summed over y

     V_sub = 0;
     var next_h = h+speed_h*delta_t;
     var next_theta = boat_theta+speed_theta*delta_t;

     integralCalc(h, boat_theta);
     var accel_now_h = accel_h;
     var accel_now_theta = accel_theta;

     integralCalc(next_h, boat_theta);
     var accel_nexth_h = accel_h;
     var accel_nexth_theta = accel_theta;

     integralCalc(h, next_theta);
     var accel_nextt_h = accel_h;
     var accel_nextt_theta = accel_theta;

     accel_h = g - (accel_nexth_h-accel_now_h)/delta_t;
     accel_theta = (accel_now_theta-accel_nextt_theta)/delta_t;

     speed_h = speed_h + accel_h * delta_t;
     speed_theta = speed_theta + accel_theta * delta_t;
     h = h + speed_h * delta_t;
     boat_theta = boat_theta + speed_theta * delta_t;

     console.log(h);
     console.log(speed_h);
     console.log(accel_h);
     //console.log(window.centreOfMass);
     //console.log(V_sub);
     //console.log(accel_h);
     //console.log(boat_theta);
     //console.log(window.volume);
     }

     function integralCalc(b_h, b_theta){
     var integralBx = 0;
     var integralBy = 0;
     var alpha = 0;

     var tan_theta = Math.tan((b_theta));
     for (subdiv = 0; subdiv < window.ymatx.length; subdiv++) {
     if (window.ymatx[subdiv] != -1) {
     V = Math.max(window.ymatx[subdiv] + Math.min(window.ymatx[subdiv], (subdiv - window.centreOfMass - b_h) / tan_theta), 0);
     V_sub += V;
     integralBx += V * (-V/2 + window.ymatx[subdiv]);
     integralBy -= V * (subdiv - window.centreOfMass);

     }
     }
     if(V_sub==0){
     alpha = 0;
     R = 0;
     }
     else{
     alpha = Math.abs(boat_theta) - Math.atan(B_x / B_y);
     R = Math.sqrt(Math.pow(B_x, 2) + Math.pow(B_y, 2)) * Math.sin(alpha); //ccw torque = positive

     }
     if (boat_theta > 0) {
     R = -R;
     }
     var stuff = -Math.sin(b_theta)*integralBx + Math.cos(b_theta)*integralBy + b_h*V_sub;
     accel_theta = (stuff)*g*fluid_density/window.Izz;
     accel_h = g*fluid_density/window.volume*(stuff);
     }*/


    function moveBoat() {
        //Vsub = Math.max(window.ymatx[subdiv]+Math.min(window.ymatx[subdiv],(subdiv-h)/tan_theta)) summed over y

        V_sub = 0;
        var integralBx = 0;
        var integralBy = 0;
        var alpha = 0;
        h = h - water_h;
        boat_theta = boat_theta - water_theta;
        //var tan_theta = Math.tan(Math.abs(boat_theta));
        for (subdiv = 0; subdiv < window.ymatx.length; subdiv++) {
            for (i = 0; i < window.crossovers; i++) {
                if (window.ymatx[subdiv].length > i) {
                    var d_minus = -Math.sin(boat_theta) * window.ymatx[subdiv][i] + Math.cos(boat_theta) * (subdiv - window.centreOfMass);
                    var d_plus = Math.sin(boat_theta) * window.ymatx[subdiv][i] + Math.cos(boat_theta) * (subdiv - window.centreOfMass);

                    if (i % 2 == 0) {
                        if (d_plus != d_minus) {
                            var d_large = Math.max(d_plus, d_minus);
                            var d_small = Math.min(d_plus, d_minus);
                            V = Math.max(Math.min(2 * window.ymatx[subdiv][i] * (d_large - h) / (d_large - d_small), 2 * window.ymatx[subdiv][i]), 0);
                            if (d_plus > d_minus) {
                                integralBx += V * (window.ymatx[subdiv][i] - V / 2);
                            }
                            else {
                                integralBx += V * (-window.ymatx[subdiv][i] + V / 2);
                            }
                        }
                        else if (d_minus < h) {
                            V = 0;
                        }
                        else {
                            V = 2 * window.ymatx[subdiv][i];
                        }
                        V_sub += V;
                        integralBy -= V * (subdiv - window.centreOfMass);
                    }
                    else {
                        if (d_plus != d_minus) {
                            var d_large = Math.max(d_plus, d_minus);
                            var d_small = Math.min(d_plus, d_minus);
                            V = Math.max(Math.min(2 * window.ymatx[subdiv][i] * (d_large - h) / (d_large - d_small), 2 * window.ymatx[subdiv][i]), 0);
                            if (d_plus > d_minus) {
                                integralBx -= V * (window.ymatx[subdiv][i] - V / 2);
                            }
                            else {
                                integralBx -= V * (-window.ymatx[subdiv][i] + V / 2);
                            }
                        }
                        else if (d_minus < h) {
                            V = 0;
                        }
                        else {
                            V = 2 * window.ymatx[subdiv][i];
                        }
                        V_sub -= V;
                        integralBy += V * (subdiv - window.centreOfMass);
                    }
                }
            }
        }
        if (V_sub == 0) {
            B_x = 0;
            B_y = 0;
            R = 0;
        }
        else {
            B_x = integralBx / V_sub;
            B_y = integralBy / V_sub;
            R = -Math.sin(boat_theta) * B_y - Math.cos(boat_theta) * B_x; //cw torque positive

        }
        var buoyant_force = V_sub * fluid_density;
        net_force = 10 * (buoyant_force - 2 * window.volume);
        accel_h = net_force / window.volume;
        net_torque = 200 * buoyant_force * R;
        accel_theta = net_torque / window.Izz;

        speed_h = speed_h + accel_h * delta_t;
        speed_theta = (speed_theta + accel_theta * delta_t);
        speed_h = speed_h * (1 - damping * delta_t);
        speed_theta = speed_theta * (1 - damping * delta_t);
        h = h + water_h + speed_h * delta_t;
        boat_theta = boat_theta + water_theta + speed_theta * delta_t;
        //console.log(integralBy);
        //console.log(V_sub);
        //console.log(h);
        //console.log(water_h);
        //console.log(water_theta);
        //console.log(boat_theta);
        //console.log(window.volume);
    }
});
