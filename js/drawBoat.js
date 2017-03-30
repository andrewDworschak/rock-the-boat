function drawBoat() {
    var subdivs = 50, subdiv;
    var centreOfMass = 0;
    var Izz = 0;

    var mouse = {x: 0, y: 0};
    var canvas = document.getElementById('boat-canvas');

    var ymatx = Array(subdivs).fill(-1);
    var coors = [];

    $('#boat-canvas').show();
    $('#webGL-canvas').css('zIndex', '-1');

    canvas.addEventListener('mousedown', dbOnMouseDown, false);
    if (window.boat != undefined) {
        window.scene.remove(window.boat);
        delete window.boat;
		delete window.ymatx;
		delete window.centreOfMass
		delete window.Izz;
		delete window.volume;
        console.log(window.scene);
        console.log(window.boat);
    }

    function dbOnMouseDown(event) {
        event.preventDefault();
        event.stopPropagation();
        mouse.x = event.clientX;
        mouse.y = event.clientY;

        canvas.addEventListener('mousemove', dbOnMouseMove, false);
        //canvas.addEventListener('mouseout', dbOnMouseOut, false);
        canvas.addEventListener('mouseup', dbOnMouseUp, false);

        ymatx = Array(subdivs).fill(-1);
        coors = [];
        var subdiv = Math.round(mouse.y * subdivs / window.innerHeight);
        if (ymatx[subdiv] == -1) {
            ymatx[subdiv] = Math.abs((mouse.x - window.innerWidth / 2) * subdivs / window.innerHeight);
        }
    }

    function dbOnMouseMove(event) {
        mouse.x = event.clientX;
        mouse.y = event.clientY;

        subdiv = Math.round(mouse.y * subdivs / window.innerHeight);
        if (ymatx[subdiv] == -1) {
            ymatx[subdiv] = Math.abs((mouse.x - window.innerWidth / 2) * subdivs / window.innerHeight);
            if (ymatx[subdiv + 1] != -1) {
                canvas.appendChild(createLine(ymatx[subdiv + 1] * window.innerHeight / subdivs + window.innerWidth / 2, (subdiv + 1) * window.innerHeight / subdivs, ymatx[subdiv] * window.innerHeight / subdivs + window.innerWidth / 2, (subdiv) * window.innerHeight / subdivs));
                canvas.appendChild(createLine(-ymatx[subdiv + 1] * window.innerHeight / subdivs + window.innerWidth / 2, (subdiv + 1) * window.innerHeight / subdivs, -ymatx[subdiv] * window.innerHeight / subdivs + window.innerWidth / 2, (subdiv) * window.innerHeight / subdivs));
            }
            if (ymatx[subdiv - 1] != -1) {
                canvas.appendChild(createLine(ymatx[subdiv - 1] * window.innerHeight / subdivs + window.innerWidth / 2, (subdiv - 1) * window.innerHeight / subdivs, ymatx[subdiv] * window.innerHeight / subdivs + window.innerWidth / 2, (subdiv) * window.innerHeight / subdivs));
                canvas.appendChild(createLine(-ymatx[subdiv - 1] * window.innerHeight / subdivs + window.innerWidth / 2, (subdiv - 1) * window.innerHeight / subdivs, -ymatx[subdiv] * window.innerHeight / subdivs + window.innerWidth / 2, (subdiv) * window.innerHeight / subdivs));
            }
        }
    }

    function dbOnMouseUp() {
        var sumxy = 0;
        var sumx = 0;
        var integralX = 0;
        var integralY = 0;

        for (subdiv = 0; subdiv < subdivs - 1; subdiv++) {

            if (ymatx[subdiv] != -1) {
                sumxy += ymatx[subdiv] * subdiv;
                sumx += ymatx[subdiv];
                integralX += 2 * Math.pow(ymatx[subdiv], 3) / 3;
            }
            if (ymatx[subdiv] != -1 && ymatx[subdiv + 1] != -1) {
                canvas.appendChild(createLine(ymatx[subdiv + 1] * window.innerHeight / subdivs + window.innerWidth / 2, (subdiv + 1) * window.innerHeight / subdivs, ymatx[subdiv] * window.innerHeight / subdivs + window.innerWidth / 2, (subdiv) * window.innerHeight / subdivs));
                canvas.appendChild(createLine(-ymatx[subdiv + 1] * window.innerHeight / subdivs + window.innerWidth / 2, (subdiv + 1) * window.innerHeight / subdivs, -ymatx[subdiv] * window.innerHeight / subdivs + window.innerWidth / 2, (subdiv) * window.innerHeight / subdivs));
            }
        }
        centreOfMass = sumxy / sumx;
		window.centreOfMass = centreOfMass;
        window.volume = sumx;

        canvas.appendChild(createPointElement(window.innerWidth / 2, centreOfMass * window.innerHeight / subdivs));
        for (subdiv = 0; subdiv < subdivs; subdiv++) {

            if (ymatx[subdiv] != -1) {
                integralY += 2 * ymatx[subdiv] * Math.pow((subdiv - centreOfMass), 2);
            }
        }
        Izz = integralX + integralY;
		window.Izz = Izz;

        for (var ii = 0; ii < ymatx.length; ++ii) {
            if (ymatx[ii] != -1) {
                coors.push(new THREE.Vector2(ymatx[ii], ii));
            }
        }

        for (var ii = coors.length - 1; ii > -1; --ii) {
            var blah = coors[ii];
            coors.push(new THREE.Vector2(-blah.x, blah.y));
        }

        coors.push(new THREE.Vector2(coors[0].x, coors[0].y));
        var shape = new THREE.Shape(coors);

        var boatGeo = new THREE.ExtrudeGeometry(shape, {amount: 200, bevelEnabled: true});
        var rotationMat = new THREE.Matrix4().makeRotationX(Math.PI);
        var translationMat = new THREE.Matrix4().makeTranslation(0, centreOfMass, 100);
        var transformation = new THREE.Matrix4().multiplyMatrices(translationMat, rotationMat);
        boatGeo.applyMatrix(transformation);
        var boatMesh = new THREE.Mesh(boatGeo, new THREE.MeshPhongMaterial({color: '#8B4513', shininess: 100}));
        var boat = new THREE.Object3D();
        boat.add(boatMesh);
        window.boat = boat;
        window.scene.add(boat);
		
		window.ymatx = ymatx;
        console.log(window.scene);
        console.log(window.boat);

        $('#boat-canvas').hide();
        $('#webGL-canvas').css('zIndex', '1');

        $('#boat-canvas').html(' Draw, draw, draw your boat ... gently ');

        canvas.removeEventListener('mousemove', dbOnMouseMove, false);
        canvas.removeEventListener('mouseup', dbOnMouseUp, false);
        canvas.removeEventListener('mousedown', dbOnMouseDown, false);
    }

    function createLineElement(x, y, length, angle) {
        var line = document.createElement("div");
        var styles = 'border: 3px solid brown; '
            + 'width: ' + length + 'px; '
            + 'height: 0px; '
            + '-moz-transform: rotate(' + angle + 'rad); '
            + '-webkit-transform: rotate(' + angle + 'rad); '
            + '-o-transform: rotate(' + angle + 'rad); '
            + '-ms-transform: rotate(' + angle + 'rad); '
            + 'position: absolute; '
            + 'top: ' + y + 'px; '
            + 'left: ' + x + 'px; ';
        line.setAttribute('style', styles);
        return line;
    }

    function createPointElement(x, y) {
        var point = document.createElement("div");
        var styles = 'border: 5px solid red; '
            + 'width: 0px; '
            + 'height: 0px; '
            + 'position: absolute; '
            + 'top: ' + y + 'px; '
            + 'left: ' + x + 'px; ';
        point.setAttribute('style', styles);
        return point;
    }

    function createLine(x1, y1, x2, y2) {
        var a = x1 - x2,
            b = y1 - y2,
            c = Math.sqrt(a * a + b * b);

        var sx = (x1 + x2) / 2,
            sy = (y1 + y2) / 2;

        var x = sx - c / 2,
            y = sy;

        var alpha = Math.PI - Math.atan2(-b, a);

        return createLineElement(x, y, c, alpha);
    }
}