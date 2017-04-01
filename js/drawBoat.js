function drawBoat() {
    var subdivs = 50, subdiv;
    var centreOfMass = 0;
    var Izz = 0;

    var mouse = {x: 0, y: 0};
    var canvas = document.getElementById('boat-canvas');

    var ymatx = [];
    var coors = [];
	var crossovers = 10;
	window.crossovers = crossovers;
	var lastSubdiv = 0;
	var lastPos = 0;
	var newPos = 0;
	var drawOrder = [];

    $('#boat-canvas').show();
    $('#webGL-canvas').css('zIndex', '-1');

    canvas.addEventListener('mousedown', dbOnMouseDown, false);
    if (window.boat != undefined) {
        window.scene.remove(window.boat);
        window.scene.remove(window.CoM);
        window.scene.remove(window.BoM);
        delete window.boat;
        delete window.ymatx;
        delete window.centreOfMass;
        delete window.Izz;
        delete window.volume;
        delete window.CoM;
        delete window.BoM;
    }

    function dbOnMouseDown(event) {
        event.preventDefault();
        event.stopPropagation();
        mouse.x = event.clientX;
        mouse.y = event.clientY;

        canvas.addEventListener('mousemove', dbOnMouseMove, false);
        canvas.addEventListener('mouseleave', dbOnMouseLeave, false);
        canvas.addEventListener('mouseup', dbOnMouseUp, false);

        for (i=0; i<subdivs; i++){
			ymatx[i]= [];
		}
        coors = [];
        var subdiv = Math.round(mouse.y * subdivs / window.innerHeight);
        
		lastPos = Math.abs((mouse.x - window.innerWidth / 2) * subdivs / window.innerHeight);
		//ymatx[subdiv][ymatx[subdiv].length] = lastPos;
		lastSubdiv = subdiv;
		//drawOrder[drawOrder.length]=subdiv;
    }

    function dbOnMouseLeave() {
        dbOnMouseUp();
    }

    function dbOnMouseMove(event) {
        mouse.x = event.clientX;
        mouse.y = event.clientY;

        subdiv = Math.round(mouse.y * subdivs / window.innerHeight);
        if (subdiv != lastSubdiv) {
            newPos = Math.abs((mouse.x - window.innerWidth / 2) * subdivs / window.innerHeight);
			if(lastSubdiv>subdiv){
				for(i=lastSubdiv-1; i>=subdiv; i--){
					ymatx[i][ymatx[i].length]=lastPos*(i-subdiv)/(lastSubdiv-subdiv) + newPos*(lastSubdiv-i)/(lastSubdiv-subdiv);
					drawOrder[drawOrder.length]=i;
				}
			}
			else{
				for(i=lastSubdiv+1; i<=subdiv; i++){
					ymatx[i][ymatx[i].length]=lastPos*(subdiv-i)/(subdiv-lastSubdiv) + newPos*(i-lastSubdiv)/(subdiv-lastSubdiv);
					drawOrder[drawOrder.length]=i;
				}
				
			}
            
            canvas.appendChild(createLine(newPos * window.innerHeight / subdivs + window.innerWidth / 2, subdiv * window.innerHeight / subdivs, lastPos * window.innerHeight / subdivs + window.innerWidth / 2, lastSubdiv * window.innerHeight / subdivs));
            canvas.appendChild(createLine(-newPos * window.innerHeight / subdivs + window.innerWidth / 2, subdiv * window.innerHeight / subdivs, -lastPos * window.innerHeight / subdivs + window.innerWidth / 2, lastSubdiv * window.innerHeight / subdivs));
			lastPos = newPos;
			lastSubdiv = subdiv;
        }
    }

    function dbOnMouseUp() {
        var sumxy = 0;
        var sumx = 0;
        var integralX = 0;
        var integralY = 0;
		
		for (i = 0; i < drawOrder.length; i++) {
            var numRepeats = 0;
			for(j=0; j<i; j++){
				if(drawOrder[i]==drawOrder[j]){
					numRepeats++;
				}
			}
			//console.log(ymatx);
			if(numRepeats!=0){
				//console.log(numRepeats);
			}
			//console.log(drawOrder.length);
            coors.push(new THREE.Vector2(ymatx[drawOrder[i]][numRepeats], drawOrder[i]));
        }
		//console.log(coors);
		//console.log(drawOrder);
		for (var ii = 0; ii > coors.length; ++ii) {
            for (var jj = 0; jj < i; ++jj) {
            if(coors[ii].y == coors[jj].y){
				coors.splice(ii,1);
				console.log("eep");
				break;
			}
			}			
        }
		
        for (var ii = coors.length - 1; ii > -1; --ii) {
            var blah = coors[ii];
            coors.push(new THREE.Vector2(-blah.x, blah.y));
        }
		
		coors.push(new THREE.Vector2(coors[0].x, coors[0].y));
        var shape = new THREE.Shape(coors);
		
		for (subdiv = 0; subdiv < subdivs - 1; subdiv++) {
			ymatx[subdiv] = ymatx[subdiv].sort(function (a, b) {  return b - a;  });
		}

        for (subdiv = 0; subdiv < subdivs - 1; subdiv++) {
			for(i=0; i<crossovers; i++){
				if(ymatx[subdiv].length>i){
					if(i%2==0){
						sumxy += ymatx[subdiv][i] * subdiv;
						sumx += ymatx[subdiv][i];
						integralX += 2 * Math.pow(ymatx[subdiv][i], 3) / 3;
					}
					else{
						sumxy -= ymatx[subdiv][i] * subdiv;
						sumx -= ymatx[subdiv][i];
						integralX -= 2 * Math.pow(ymatx[subdiv][i], 3) / 3;
					}
				}
			}
        }
        centreOfMass = sumxy / sumx;
        window.centreOfMass = centreOfMass;
        window.volume = sumx;

        for (subdiv = 0; subdiv < subdivs; subdiv++) {
			for(i=0; i<crossovers; i++){
				if(ymatx[subdiv].length>i){
					if(i%2==0){
						integralY += 2 * ymatx[subdiv][i] * Math.pow((subdiv - centreOfMass), 2);
					}
					else{
						integralY -= 2 * ymatx[subdiv][i] * Math.pow((subdiv - centreOfMass), 2);
					}
				}
			}
        }
        Izz = integralX + integralY;
        window.Izz = Izz;

        

        var boatGeo = new THREE.ExtrudeGeometry(shape, {amount: 200, bevelEnabled: true});
        var rotationMat = new THREE.Matrix4().makeRotationX(Math.PI);
        var translationMat = new THREE.Matrix4().makeTranslation(0, centreOfMass, 100);
        var transformation = new THREE.Matrix4().multiplyMatrices(translationMat, rotationMat);
        boatGeo.applyMatrix(transformation);
        var boatTexture = new THREE.TextureLoader().load('textures/boatTexture.jpg');
        boatTexture.wrapS = boatTexture.wrapT = THREE.RepeatWrapping;
        boatTexture.repeat.set(0.002, 0.002);
        var boatMesh = new THREE.Mesh(boatGeo, new THREE.MeshPhongMaterial({
            map: boatTexture,
            shininess: 75,
            specular: 0xaaaaaa
        }));
        var boat = new THREE.Object3D();
        boat.add(boatMesh);
        window.boat = boat;
        window.scene.add(boat);

        var geometry = new THREE.SphereGeometry(2, 32, 32);
        var com = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color: 0xffff00}));
        com.position.set(0, centreOfMass, 110);
        window.CoM = com;
        window.scene.add(window.CoM);

        var bom = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color: 0xffffff}));
        bom.position.set(0, 0, 110);
        window.BoM = bom;
        window.scene.add(window.BoM);

        window.ymatx = ymatx;

        $('#boat-canvas').hide();
        $('#webGL-canvas').css('zIndex', '1');

        $('#boat-canvas').html(' Draw, draw, draw your boat <br> Gently on the screen ');

        canvas.removeEventListener('mousemove', dbOnMouseMove, false);
        canvas.removeEventListener('mouseup', dbOnMouseUp, false);
        canvas.removeEventListener('mousedown', dbOnMouseDown, false);
        canvas.removeEventListener('mouseleave', dbOnMouseLeave, false);
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