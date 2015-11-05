 function Cloth(numPoints, damping, stepSize){
	this.numPoints = numPoints; 
	this.restLength = 15;
	this.partSize = 10;
	this.mass=2;
	this.damping = damping;
	this.stepSize = stepSize;
	this.numConstraints = 5; 
	this.gravity = new THREE.Vector3(0, -10, 0);
	this.wind = new THREE.Vector3(5, 0, 1);
	this.struct = this.bend = this.shear = true;

	this.createPoints = function(left, bottom){
		this.points = [];

	
		for (var i = -(this.numPoints / 2); i < this.numPoints / 2; i++){
			var row = [];

			for (var j = 0; j < this.numPoints; j++){
				var pos = new THREE.Vector3(i * this.restLength  , j * this.restLength + 100, 0),
					point = new Point(pos, true, this.damping, this.stepSize);

				if (this.cornerCheck(i, j)){
					point.movable = false;
				}

				row.push(point);
			}
			this.points.push(row);
		}
	};

	this.removePointsFromScene = function(scene){
		for (var i = this.points.length - 1; i >= 0; i--){
			for (var j = this.points[0].length - 1; j >= 0; j--){
				scene.remove(this.points[i][j].sphere);
			}
		}
	};

	
	this.createTriangles = function(){
		var rows = this.points.length,
			cols = this.points[0].length;

		this.triangles = [];
		for (var i = 0; i < rows; i ++){
			for (var j = 0; j < cols; j ++){
				if ((i < rows - 1) && (j < cols - 1)){

					
					var p1 = this.points[i][j],
						p2 = this.points[i][j + 1],
						p3 = this.points[i+1][j];

					var triangle = new Triangle(p1, p2, p3);
					this.triangles.push(triangle);

					
					p1 = p2;
					p2 = this.points[i + 1][j + 1];

					triangle = new Triangle(p1, p2, p3);
					this.triangles.push(triangle);
				}
			}
		}
	};

	this.calculateRestLengths = function(){
		this.shearLength = Math.sqrt(this.restLength * this.restLength +
									this.restLength * this.restLength);

		this.bendDiagLength = 2 * this.shearLength; 
		this.hvLength = 2 * this.restLength; 
	};
	this.calculateRestLengths();


	
	this.cornerCheck = function(i, j){
		if ((i === -(this.numPoints / 2)) && (j === (this.numPoints - 1))){
			return true;
		}

		if ((i === (this.numPoints / 2 - 1)) && (j === (this.numPoints - 1))){
			return true;
		}

		return false;
	};


	this.getClosestPoint = function(mousePos){
		var minDist = this.points[0][0].position.distanceTo(mousePos),
			minPoint = [0,0],
			rows = this.points.length, 
			cols = this.points[0].length;

		for (var i = 0; i < rows; i++){
			for (var j = 0; j < cols; j++){
				var dist = this.points[i][j].position.distanceTo(mousePos);
				if (dist < minDist){
					minDist = dist;
					minPoint = [i,j];
				}
			}
		}

		return this.points[minPoint[0]][minPoint[1]];
	};

	this.addPointsToScene = function(scene){
		var rows = this.points.length,
			cols = this.points[0].length;

		for (var i = 0; i < rows; i++){
			for (var j = 0; j < cols; j++){
				scene.add(this.points[i][j].sphere);
				
			}
		}
	};

	this.timeStep = function(){
		var rows = this.points.length,
			cols = this.points[0].length;

		for (var i = 0; i < rows; i++){
			for (var j = 0; j < cols; j++){
				if (this.points[i][j].movable){
						this.points[i][j].addForce(this.gravity);
				}
				this.points[i][j].timeStep();
			}
		}

		for (i = 0; i < this.triangles.length; i++){
			this.addWind(this.triangles[i]);
		}
	};

	
	this.addWind = function(triangle){
		
		var side1 = new THREE.Vector3(0, 0, 0);
		side1.subVectors(triangle.p2.position, triangle.p1.position);

		var side2 = new THREE.Vector3(0, 0, 0);
		side2.subVectors(triangle.p3.position, triangle.p1.position);

		side1.cross(side2);

		
		var normal = side1;
		normal.normalize();

		var d = normal.dot(this.wind);

		normal.multiplyScalar(d);
		normal.multiplyScalar(5);

		
		if (triangle.p1.movable) triangle.p1.addForce(normal);
		if (triangle.p2.movable) triangle.p2.addForce(normal);
		if (triangle.p3.movable) triangle.p3.addForce(normal);
	};

	
	this.satisfyConstraints = function(){
		var rows = this.points.length,
			cols = this.points[0].length;

		for (var a = 0; a < this.numConstraints; a++){
			for (var i = 0; i < rows; i++){
				for (var j = 0; j < cols; j++){

					if (this.shear) this.shearConstraints(i, j);
					if (this.bend) this.bendConstraints(i, j);
					if (this.struct) this.structConstraints(i, j);
				}
			}
		}
	};

	
	this.structConstraints = function(i, j){
		var rows = this.points.length,
			cols = this.points[0].length,
			p1, p2;

		if (j < cols - 1){
			p1 = this.points[i][j];
			p2 = this.points[i][j + 1];

			this.constrainPoints(p1, p2, this.restLength);

		}

		if (j > 0){
			p1 = this.points[i][j];
			p2 = this.points[i][j - 1];

			this.constrainPoints(p1, p2, this.restLength);
		}

		if (i < rows - 1){
			p1 = this.points[i][j];
			p2 = this.points[i + 1][j];

			this.constrainPoints(p1, p2, this.restLength);
		}

		if (i > 0){
			p1 = this.points[i][j];
			p2 = this.points[i - 1][j];

			this.constrainPoints(p1, p2, this.restLength);
		}
	};

	this.shearConstraints = function(i, j){
		var rows = this.points.length,
			cols = this.points[0].length,
			p1, p2;

		if (j > 0){
			if (i > 0){
				
				p1 = this.points[i][j];
				p2 = this.points[i - 1][j - 1];

				this.constrainPoints(p1, p2, this.shearLength);
			}
			if (i < rows - 1){
				
				p1 = this.points[i][j];
				p2 = this.points[i + 1][j - 1];

				this.constrainPoints(p1, p2, this.shearLength);
			}
		}

		if (j < cols - 1){
			if (i > 0){
				
				p1 = this.points[i][j];
				p2 = this.points[i - 1][j + 1];

				this.constrainPoints(p1, p2, this.shearLength);
			}
			if (i < rows - 1){
				
				p1 = this.points[i][j];
				p2 = this.points[i + 1][j + 1];

				this.constrainPoints(p1, p2, this.shearLength);
			}
		}
	};


	this.bendConstraints = function(i, j){
		var rows = this.points.length,
			cols = this.points[0].length,
			p1, p2;

		if (j > 1){
		
			p1 = this.points[i][j];
			p2 = this.points[i][j - 2];

			this.constrainPoints(p1, p2, this.hvLength);

			if (i > 1){
				
				p1 = this.points[i][j];
				p2 = this.points[i - 2][j - 2];

				this.constrainPoints(p1, p2, this.bendDiagLength);
			}

			if (i < rows - 2){
				
				p1 = this.points[i][j];
				p2 = this.points[i + 2][j - 2];

				this.constrainPoints(p1, p2, this.bendDiagLength);
			}
		}

		if (j < cols - 2){
		
			p1 = this.points[i][j];
			p2 = this.points[i][j + 2];

			this.constrainPoints(p1, p2, this.hvLength);

			if (i > 1){
			
				p1 = this.points[i][j];
				p2 = this.points[i - 2][j + 2];

				this.constrainPoints(p1, p2, this.bendDiagLength);
			}

			if (i < rows - 2){
				
				p1 = this.points[i][j];
				p2 = this.points[i + 2][j + 2];

				this.constrainPoints(p1, p2, this.bendDiagLength);
			}
		}

		if (i > 1){
			p1 = this.points[i][j];
			p2 = this.points[i - 2][j];

			this.constrainPoints(p1, p2, this.hvLength);
		}

		if (i < cols - 2){
			
			p1 = this.points[i][j];
			p2 = this.points[i + 2][j];

			this.constrainPoints(p1, p2, this.hvLength);
		}
	};

	
	this.constrainPoints = function(p1, p2, restLength){
		var dist = p1.position.distanceTo(p2.position),
			newVect = new THREE.Vector3(0, 0, 0);

		newVect.subVectors(p2.position, p1.position);
		newVect.multiplyScalar(1 - restLength / dist);

		if (p1.movable && p2.movable){
			newVect.multiplyScalar(0.5);
			p1.position.add(newVect);

			newVect.negate();
			p2.position.add(newVect);
		}
		else{
			if (p1.movable){
				p1.position.add(newVect);
			}

			if (p2.movable){
				newVect.negate();
				p2.position.add(newVect);
			}
		}
	};

	this.updateGravity = function(val){
		this.gravity.setY(val);
	};

	this.updateWind = function(x, y, z){
		if (x !== null) this.wind.setX(x);
		if (y !== null) this.wind.setY(y);
		if (z !== null) this.wind.setZ(z);
	};

	this.updateNumPoints = function(val){
		this.numPoints = val;
	};

	this.updateShear = function(bool){
		this.shear = bool;
	};

	this.updateStruct = function(bool){
		this.struct = bool;
	};

	this.updateBend = function(bool){
		this.bend = bool;
	};

	this.updateIter = function(val){
		this.numConstraints = val;
	};
}
