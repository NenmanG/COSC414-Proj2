const { vec2, vec3, mat3, mat4 } = glMatrix;

var vertexShaderText = [
'precision mediump float;',

'attribute vec3 position;',
'attribute vec3 color;',
'uniform mat4 world;',
'uniform mat4 view;',
'uniform mat4 proj;',
'varying vec3 fragColor;',

'void main()',
'{',
'   mat4 mvp = proj*view*world;',
'	fragColor = color;',
'	gl_Position = mvp*vec4(position,1.0);',
'	gl_PointSize = 10.0;',
'}'
].join('\n');

var fragmentShaderText =
[
'precision mediump float;',

'varying vec3 fragColor;',

'void main()',
'{',
	
'	gl_FragColor = vec4(fragColor,1.0);',
'}',
].join('\n')


var app = function() {

    var bacteriaColours = [
        [0.64,0.56,0.83],
        [0.77,0.86,0.64],
        [0.55,0.02,0.24],
        [0.96,0.94,0.72],
        [0.97,0.34,0.22],
        [0.06,0.64,0.69],
        [0.88,0.55,0.47],
        [0.23,0.27,0.36],
        [0.94,0.55,0.29],
        [0.65,0.27,0.34]
    
    ];

	var radius = 1;
	var points = 0;
	var consumed = 0;
    var bacteria = [];
    var chance = 2;

    var down = false;
	var startX = 0;
	var startY = 0;

	var worldX = 0;
	var worldY = 0;

    //intialize webgl
	var canvas = document.getElementById('canvas');
	var gl = canvas.getContext('webgl', {preserveDrawingBuffer: true});

	if (!gl){
		throw new Error('WebGL not supported');
	}

	canvas.width = window.innerWidth/1.3;
	canvas.height = window.innerHeight/1.3;

	gl.viewport(0,0,canvas.width,canvas.height);

    //setup shaders
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

	gl.shaderSource(vertexShader,vertexShaderText);
	gl.shaderSource(fragmentShader,fragmentShaderText);

	gl.compileShader(vertexShader);
	gl.compileShader(fragmentShader);
		
    //create program
	var program = gl.createProgram();

    //attach shaders to program
	gl.attachShader(program,vertexShader);
	gl.attachShader(program,fragmentShader);

	gl.linkProgram(program);

    //calculate distance between 2 spheres. combine this distance with the radius to determine if circles clash with one another
    function clash(x1, y1, z1, r1, x2, y2, z2, r2){

        let xDist = x2-x1;
        let yDist = y2-y1;
        let zDist = z2-z1;
        let radii = r1+r2;
		
        let totalDistance = Math.sqrt(Math.pow(xDist, 2) + Math.pow(yDist, 2) + Math.pow(zDist, 2)); 

		if(totalDistance-radii< 0){
			return true;
		}
		
		return false;
		
	};

    // function to draw a sphere
	function drawSphere(x,y,z,r,color, surface) {

		var vertexPositionData = [];
		var colors = [];
		var indexData = [];

		latitudeBands = 100;
		longitudeBands = 100;

		for (var latNumber=0; latNumber <= latitudeBands; latNumber++) {
			var theta = latNumber * Math.PI / latitudeBands;
			var sinTheta = Math.sin(theta);
			var cosTheta = Math.cos(theta);

			for (var longNumber=0; longNumber <= longitudeBands; longNumber++) {
				var phi = longNumber * 2 * Math.PI / longitudeBands;
				var sinPhi = Math.sin(phi);
				var cosPhi = Math.cos(phi);

				var x1 = x + (r * cosPhi * sinTheta);
				var y1 = y + (r * cosTheta);
				var z1 = z + (r * sinPhi * sinTheta);

				colors.push(color[0]);
				colors.push(color[1]);
				colors.push(color[2]);

				vertexPositionData.push(x1);
				vertexPositionData.push(y1);
				vertexPositionData.push(z1);

				var first = (latNumber * (longitudeBands + 1)) + longNumber;
				var second = first + longitudeBands + 1;
				indexData.push(first);
				indexData.push(second);
				indexData.push(first + 1);

				indexData.push(second);
				indexData.push(second + 1);
				indexData.push(first + 1);
			}

		}

         // Create and store data into vertex buffer
         gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);

         // Create and store data into color buffer
         gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

         // Create and store data into index buffer
         gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
         gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);

         //draw sphere
	     gl.drawElements(gl.TRIANGLES, indexData.length, gl.UNSIGNED_SHORT, 0);

	};

	class Bacteria {

		//constructor for when id is specified
		constructor(id, colour){
			this.id = id;
			this.alive = true;
            this.color = colour;
		}

		genSphereValue(){
            this.genTheta = Math.floor(Math.random() * 100);
			this.genPhi = Math.floor(Math.random() * 100);

			var theta =  this.genTheta * Math.PI / 100;
			var sinTheta = Math.sin(theta);
			var cosTheta = Math.cos(theta);
			var phi = this.genPhi * 2 * Math.PI / 100;
			var sinPhi = Math.sin(phi);
			var cosPhi = Math.cos(phi);

			this.x = ((radius-0.1) * cosPhi * sinTheta);
			this.y = ((radius-0.1) * cosTheta);
			this.z = ((radius-0.1) * sinPhi * sinTheta);
		}

		//method for generating new bacteria spheres
		initialise(){
			
			//new x and y values along the game sphere
			this.genSphereValue();

			this.r = 0.1; //starting radius of all bacteria

            //variable to ensure no infinite loop is created
			let trial= 0;

			//loop through all bacteria to ensure no clash on initialisation
			for(let i = 0; i < bacteria.length; i++){
				
				if(trial > 500){
					console.log("Not enough area for new bacteria");
					break;
				}

				//if there's a collision with a specific object, the variables need to be randomized again
				if(clash(this.x, this.y, this.z, this.r, bacteria[i].x, bacteria[i].y, bacteria[i].z, bacteria[i].r)){
					
					this.genSphereValue(); //get random points on the sphere
					trial++;
					i = -1;
				}
			}

            this.r = 0.1;
            this.alive = true;

		}

        update(){
			
			if (this.alive){ 
                //at max radius of 0.4 poison the bacteria and player loses a chance 
                if (this.r >= 0.4) {
                    chance --;
                    this.poison(bacteria.indexOf(this));
                }else {
                    
                    //increase the size of each bacteria by 0.001 each loop
                    this.r += 0.001; 
                }
                
            }

            //function for bacteria consuming one another
            for (i in bacteria) {
				
                if (this.id != bacteria[i].id && clash(this.x, this.y, this.z, this.r, bacteria[i].x, bacteria[i].y, bacteria[i].z, bacteria[i].r)) {
                    this.r += (bacteria[i].r/4); //increase the radius of the bacteria doing the consuming
                    bacteria[i].poison(i); //destroy the consumed bacteria
        
                    consumed++;
                }
        
            }
            //create bacteria
			drawSphere(this.x, this.y, this.z, this.r, this.color, true);
		}

		poison(i){
			this.r = 0;
			this.x = 0;
			this.y = 0;
			this.alive = false;
			
            bacteria.splice(i,1);
			
		}

	};

    //create triangle buffer
	//all arrays in JS is Float64 by default
	
	var vertex_buffer = gl.createBuffer ();
	var color_buffer = gl.createBuffer ();
	var index_buffer = gl.createBuffer ();

	var positionAttribLocation = gl.getAttribLocation(program,'position');
	var colorAttribLocation = gl.getAttribLocation(program,'color');
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.vertexAttribPointer(
		positionAttribLocation, //attribute location
		3, //number of elements per attribute
		gl.FLOAT, 
		gl.FALSE,
		0,
		0
		);
	gl.enableVertexAttribArray(positionAttribLocation);

	gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
	gl.vertexAttribPointer(
		colorAttribLocation, //attribute location
		3, //number of elements per attribute
		gl.FLOAT, 
		gl.FALSE,
		0,
		0
		);
	gl.enableVertexAttribArray(colorAttribLocation);
	gl.useProgram(program);
	gl.enable(gl.DEPTH_TEST);

	
	//matrices
	var world = new Float32Array(16);
	mat4.identity(world);

	var view = new Float32Array(16);
	mat4.lookAt(view, [0,0,5], [0,0,0],[0,1,0])

	var proj = new Float32Array(16);
	mat4.perspective(proj,glMatrix.glMatrix.toRadian(45),canvas.width/canvas.height,0.1,100);
	
	//get the address of each matrix in the vertex shader
	var matWorldUniformLocation = gl.getUniformLocation(program, 'world');
	var matViewUniformLocation = gl.getUniformLocation(program, 'view');
	var matProjUniformLocation = gl.getUniformLocation(program, 'proj');

	//send each matrix to the correct location in vertex shader
	gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, world);
	gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, view);
	gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, proj);

	var angle = 0;
	var rotz = new Float32Array(16);
	var rotx = new Float32Array(16);
	
	mat4.identity(rotx);
	mat4.identity(rotx);
	
    //create bacteria and load them into array
	for (i = 0; i < 10; i++) {
		bacteria.push(new Bacteria(i, bacteriaColours[i]))
		bacteria[i].initialise();
	};

    //event to click on bacteria and poison them
    canvas.onmousedown = function(event) {
		if (event.button == 0) {
			down = true;
			startX = event.clientX;
			startY = event.clientY;
		} 

        //use pixel values to select bacteria on sphere 
		var pixelValues = new Uint8Array(4);
		gl.readPixels(event.clientX, canvas.height - event.clientY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelValues);

        //loop through all bacteria and check if you clicked within the radius of any
		for (i in bacteria) {
			if (bacteria[i].color[0] == (pixelValues[0]/255).toFixed(2) && bacteria[i].color[1] == (pixelValues[1]/255).toFixed(2)){
				
				points += Math.round(2/bacteria[i].r);
				bacteria[i].poison(i);

                //break ensures you can't click multiple bacteria at once
                break;
				
			}
		}

	}

    //event to move sphere and change view 
	canvas.onmousemove = function(ev){

		this.onmouseup = function(ev) {
			down = false;
		}

		if (down) {

			worldX += (startX - ev.clientX)/400;
			worldY += (startY - ev.clientY)/400;
  
			if ( worldX > 360) worldX = 0
			if ( worldY > 360) worldY = 0

		  	mat4.fromRotation(rotx,worldY,[0,0,1]);
		  	mat4.fromRotation(rotz,worldX,[0,1,0]);
		  	mat4.multiply(world,rotz,rotx);
		  	gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, world);  
		}
		
	};


	function loop(){

        gl.clearColor(0.0,0.0,0.0,0.0);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        drawSphere(0,0,0,radius,[0, 0, 0], false); // draw game sphere 
		
        document.getElementById('score').innerHTML = points;
        document.getElementById('chances').innerHTML = chance;
        document.getElementById('remaining').innerHTML = bacteria.length;
        document.getElementById('consumed').innerHTML = consumed;


		if (chance > 0) {

			for (i in bacteria) {
				bacteria[i].update();

                if(chance <= 0){ //game lose condition
                    document.getElementById('win-lose').style.color = "red";
                    document.getElementById('win-lose').innerHTML = "LOSER! BACTERIA GREW TOO BIG!";
                    break;
                }

			}

            if (bacteria.length===0){ //game win condition
                document.getElementById('win-lose').style.color = "green";
                document.getElementById('win-lose').innerHTML = "WINNER! YOU POISONED ALL THE BACTERIA BEFORE THEY GREW TOO BIG!";
            }
			
		}
        requestAnimationFrame(loop);
	}		
	requestAnimationFrame(loop);
	
	
};
