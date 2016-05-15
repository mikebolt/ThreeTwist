/*

  CUBES

  @author Mark Lundin - http://www.mark-lundin.com
  @author Stewart Smith
  @author Michael Casebolt : retrofitted for bigcubes

*/

ThreeTwist.Cube = function(parameters) {

  // Constructor parameters

  parameters = parameters || {};

  this.paused = parameters.paused === undefined ? false : parameters.paused;
  this.autoRotate = parameters.autoRotate === undefined ? false : parameters.autoRotate;
  this.keyboardControlsEnabled = parameters.keyboardControlsEnabled === undefined ? true :
    parameters.keyboardControlsEnabled;
  this.mouseControlsEnabled = parameters.mouseControlsEnabled === undefined ? true :
    parameters.mouseControlsEnabled;

  // The order must be a nonnegative integer.
  this.order = typeof parameters.order === 'number' &&
    parameters.order >= 0 ? parameters.order|0 : 3;
  
  // The colors parameter maps directions to colors.
  // This is the WCA standard starting orientation for FMC.
  //                                               F  U  R  D  L  B
  this.colors = parameters.colors === undefined ? [G, W, R, Y, O, B] : parameters.colors;

  var renderFactory = parameters.renderer || ThreeTwist.renderers.CSS3D;

  //  Some important booleans.

  this.isShuffling = false;
  this.isSolving = false;
  this.isTweening = false;
  this.stable = true;
  this.undoing = false;
  this.render = true;
  this.finalShuffle = null;
  this.hideInvisibleFaces = parameters.hideInvisibleFaces === undefined ? false :
    parameters.hideInvisibleFaces;

  //  The amount of time we've been running
  this.time = 0;

  //   We'll keep an record of the number of moves we've made
  //   Useful for keeping scores.
  this.moveCounter = 0;

  //  Every fire of this.loop() will attempt to complete our tasks
  //  which can only be run if this.isReady === true.
  this.taskQueue = new ThreeTwist.Queue();

  //  We need the ability to gang up twist commands.
  //  Every fire of this.loop() will attempt to empty it.
  this.twistQueue = new ThreeTwist.Queue();

  //  Although we have a queue containing all our twists
  //  we also need a way to collect any undo requests into a similar queue
  this.historyQueue = new ThreeTwist.Queue();

  //  How long should a Cube.twist() take?
  this.twistDuration = parameters.twistDuration !== undefined ? parameters.twistDuration : 500;

  //  Size matters? Cubelets will attempt to read these values.
  this.size = 360;
  this.cubeletSize = this.size / this.order;

  //  To display our cube, we'll need some 3D specific attributes, like a camera
  var FIELD_OF_VIEW = 35;
  var WIDTH         = window.innerWidth;
  var HEIGHT        = window.innerHeight;
  var ASPECT_RATIO  = WIDTH / HEIGHT;
  var NEAR          = 1;
  var FAR           = 6000;

  this.camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, ASPECT_RATIO, NEAR, FAR);
  this.camera.position.z = this.size * 4;

  // This is the scene hierarchy:
  // Scene <- rotationTransformer <- scaleTransformer <- centerTransformer <- cube.object3D <- (cubelets)
  
  this.object3D = new THREE.Object3D();
  this.centerTransformer = new THREE.Object3D();
  this.scaleTransformer = new THREE.Object3D();
  this.rotationTransformer = new THREE.Object3D();

  // Construct a matrix that translates the cube's center to (0, 0, 0):
  this.centerTransformer.matrixAutoUpdate = false;
  var halfCenter = (this.order - 1) / 2;
  this.centerTransformer.matrix.makeTranslation(-halfCenter, -halfCenter, -halfCenter);
  this.decenteringMatrix = new THREE.Matrix4().makeTranslation(halfCenter, halfCenter, halfCenter);
  
  // Save the cube's center as a vector.
  var centerAmount = (this.order - 1) / 2;
  this.center = new THREE.Vector3(centerAmount, centerAmount, centerAmount);
  
  // Construct a matrix that scales the cube to display-size and mirrors the z-axis:
  this.scaleTransformer.matrixAutoUpdate = false;
  this.scaleTransformer.matrix.makeScale(this.cubeletSize, this.cubeletSize, -1 * this.cubeletSize);
  
  this.rotationTransformer.rotation.set(
    25  * Math.PI / 180,
    -30 * Math.PI / 180,
    0
  );
  
  // Slap it all together
  this.rotationTransformer.add(this.scaleTransformer);
  this.scaleTransformer.add(this.centerTransformer);
  this.centerTransformer.add(this.object3D);

  //  If we enable Auto-Rotate then the cube will spin (not twist!) in space
  //  by adding the following values to the Three object on each frame.
  this.rotationDelta = new THREE.Euler( 0.1 * Math.PI / 180, 0.15 * Math.PI / 180, 0 );
  
  // Add all the cubelets
  this.numCubelets = this.order * this.order * this.order;
  this.cubelets = [];
  for (var i = 0; i < this.order; ++i) {
    for (var j = 0; j < this.order; ++j) {
      for (var k = 0; k < this.order; ++k) {
        this.cubelets.push(new ThreeTwist.Cubelet(this, i, j, k));
      }
    }
  }
  
  //   RENDERER
  //  Create a renderer object from the renderer factory.
  //   The renderFactory is a function that creates a renderer object
  this.renderer = renderFactory(this);
  this.domElement = this.renderer.domElement;
  this.domElement.classList.add('cube');
  this.domElement.style.fontSize = this.cubeletSize + 'px';

  if (this.hideInvisibleFaces) {
    this.hideIntroverts(null, true);
  }
  
  // Set the size of the cube's display area.
  this.setSize(400, 300);

  //  The Interaction class provides all the nifty mouse picking stuff.
  //  It's responsible for figuring out what cube slice is supposed to rotate
  //  and in what direction.

  // TODO: interaction.js will need work
  this.mouseInteraction = new ThreeTwist.Interaction(this, this.camera, this.domElement);

  //  set up interactive controls
  //  The Controls class rotates the entire cube around using an arcball implementation.
  //  You could override this with a different style of control
  var controlsConstructor = parameters.controls || ThreeTwist.Controls;
  this.controls = new controlsConstructor(this.rotationTransformer, this.camera, this.domElement, this);

  //  Get ready for major loop-age.
  //  Our Cube checks these booleans at 60fps.
  this.loop = this.loop.bind(this);
  requestAnimationFrame(this.loop);
};

ThreeTwist.Cube.prototype = {};
ThreeTwist.Cube.prototype.constructor = ThreeTwist.Cube;
ThreeTwist.extend(ThreeTwist.Cube.prototype, {
  
  undo: function() {
    if (this.twistQueue.history.length > 0) {
      this.historyQueue.add(this.twistQueue.undo().getInverse());
      this.undoing = true;
    }
  },

  redo: function() {
    if (this.twistQueue.future.length > 0) {
      this.undoing = true;
      this.historyQueue.empty();
      this.historyQueue.add(this.twistQueue.redo());
    }
  },
  
  getCubeletClosestToPoint: function(point) {
    var closestDistance = Infinity;
    var closestCubelet = null;
    
    this.cubelets.forEach(function(cubelet) {
      var cubeletDistance = cubelet.getDistanceTo(point);
      if (cubeletDistance < closestDistance) {
        closestDistance = cubeletDistance;
        closestCubelet = cubelet;
      }
    });
    
    return closestCubelet;
  },
  
  // Use alg.js to make a list of moves, then queue them to be performed in order.
  performStringAlgorithm: function(algorithm) {
    var algorithmMoves = alg.cube.fromString(algorithm);
    
    //console.log(algorithmMoves);
    
    var thisCube = this;
    algorithmMoves.forEach(function(move) {
      
      if (move.startLayer === undefined && move.endLayer === undefined) {
        if (move.layer === undefined) {
          move.startLayer = 1;
          move.endLayer = 1;
        }
        else {
          move.startLayer = move.layer;
          move.endLayer = move.layer;
          delete move.layer;
        }
      }
      
      move.base = move.base.toLowerCase();
      
      thisCube.twist(move);
    });
  },

  twist: function(twist){
    if (this.undoing) {
      this.twistQueue.empty();
    }
    this.historyQueue.empty();
    this.undoing = false;
    this.twistQueue.add(twist);
  },
  
  getAffectedPieces: function(twist) {
    var affectedPieces = [];
    this.cubelets.forEach(function(cubelet) {
      var directionId = ThreeTwist.Direction.getDirectionByInitial(twist.base).id;
      if (ThreeTwist.selectors.sliceSelector(cubelet, directionId, twist.startLayer, twist.endLayer)) {
        affectedPieces.push(cubelet);
      }
    });
    return affectedPieces;
  },
  
  // Returns a list of "slices" containing the given cubelet.
  // Each "slice" is an object containing the "base" and depth.
  // By adding an "amount" to the "slice", a "twist" is created
  // that may be used to perform a twist on the cube model.
  getTwistsAffectingCubelet: function(cubelet) {
    var cubeletPosition = new THREE.Vector3().setFromMatrixPosition(cubelet.matrix);
    
    // On a cubic puzzle each cubelet is contained by exactly three slices, one for each axis.
    var slices = [];
    
    // 'base' is the negative-direction face.
    // 'oppositeBase' is the positive-direction face.
    axes = [{coordinate: 'x', base: 'l', oppositeBase: 'r'},
            {coordinate: 'y', base: 'd', oppositeBase: 'u'},
            {coordinate: 'z', base: 'f', oppositeBase: 'b'}];
    
    var thisCube = this;
    axes.forEach(function(axis) {
      var coordinateValue = cubeletPosition[axis.coordinate]|0;
      var layer = coordinateValue + 1;
      
      //console.log("layer for " + axis.coordinate + " is " + layer);
      
      var base = axis.base;
      if (layer > (thisCube.order + 1) / 2) {
        base = axis.oppositeBase;
        layer = thisCube.order - coordinateValue;
      }
      slices.push({
        base: base,
        startLayer: layer,
        endLayer: layer
      });
    });
    
    //console.log("slices:", slices);
    
    return slices;
  },
  
  resetToStableState: function(slice) {
    slice.forEach(function(cubelet) {
      cubelet.matrix.copy(cubelet.stableMatrix);
    });
  },
  
  isStable: function() {
    return this.stable;
  },
  
  stabilize: function(cubelets) {
    cubelets.forEach(function(cubelet) {
      // Round all the elements of the matrix to avoid cumulative inaccuracies.
      // This only works properly because it's a cube.
      for (var i = 0; i < cubelet.matrix.elements.length; ++i) {
        cubelet.matrix.elements[i] = Math.round(cubelet.matrix.elements[i]);
      }
      
      // Copy the current matrix into the 'stable' matrix.
      cubelet.stableMatrix.copy(cubelet.matrix);
    });

    this.stable = true; // not really
  },
  
  // This function rotates a single cubelet about the cube's center, 
  // using the given 4x4 rotation matrix.
  rotateCubelet: function(cubelet, rotationMatrix) {
    // Copy the cubelet's stable (pre-rotated) matrix.
    var matrix = new THREE.Matrix4().copy(cubelet.stableMatrix);
    
    // Calculate the centered version of the cubelet's current matrix.
    matrix.multiplyMatrices(this.centerTransformer.matrix, matrix);
    
    // Apply the rotation to the centered matrix.
    matrix.multiplyMatrices(rotationMatrix, matrix);
    
    // Convert the cubelet's new matrix back to local cube coordinates.
    cubelet.matrix.multiplyMatrices(this.decenteringMatrix, matrix);
  },
  
  makeRotationMatrixForTwist: function(twist) {
    // Figure out which function to use to create the rotation matrices.
    var makeRotation;
    if (twist.base === 'l' || twist.base === 'r') {
      makeRotation = 'makeRotationX';
    }
    else if (twist.base === 'd' || twist.base === 'u') {
      makeRotation = 'makeRotationY';
    }
    else if (twist.base === 'f' || twist.base === 'b') {
      makeRotation = 'makeRotationZ';
    }
    
    return new THREE.Matrix4()[makeRotation](twist.amount * Math.PI / 2);
  },
  
  // "reset" the cube, then perform a partial twist without "saving" the state.
  partialTwist: function(twist) {
    var slice = this.getAffectedPieces(twist);
    this.resetToStableState(slice);
    var rotationMatrix = this.makeRotationMatrixForTwist(twist);
    var thisCube = this;
    slice.forEach(function(cubelet) {
      thisCube.rotateCubelet(cubelet, rotationMatrix);
    });
  },
  
  // 'twist' should now be a "move" from alg.js
  // format:
  // twist = {
  //   type: "move",
  //   base: "l", // example
  //   amount: 2, // 2 means 180 deg clockwise
  //   startLayer: 1, // layer 1 is the outermost layer, increasing inwards
  //   endLayer: 1 // 1 to 1 means just the outermost layer
  // }
  
  // 'startAngle' is optional, and it is in degrees.
  animateTwist: function(twist, startAngle) {
    
    //console.log("animateTwist called with twist: ", twist);
    
    var rotation = twist.amount * 90;
    var duration = Math.abs(rotation - startAngle) / 90 * this.twistDuration;
    
    var dummy;
    if (startAngle === undefined) {
      dummy = {amount: 0};
    }
    else {
      dummy = {amount: startAngle / 90};
    }
    
    // Invert the rotation if necessary.
    if (twist.base === 'l' || twist.base === 'd' || twist.base === 'b') {
      rotation *= -1;
    }

    var targetAmount = Math.round(twist.amount); // The destination should be stable.
    this.isTweening = true;
    var thisCube = this;
    
    //  Boom! Rotate a slice
    new TWEEN.Tween(dummy)
    .to({amount: targetAmount}, duration)
    .easing(TWEEN.Easing.Quartic.Out)
    .onUpdate(function() {
      twist.amount = dummy.amount;
      thisCube.partialTwist(twist);
    })
    .onComplete(function() {
      twist.amount = targetAmount;
      thisCube.partialTwist(twist);
      var cubelets = thisCube.getAffectedPieces(twist);
      thisCube.stabilize(cubelets);
      thisCube.isTweening = false;
    })
    .start(this.time); // this.time is *now*.
  },

  setSize: function (width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  },

  //  The cube does its own loopage.
  //  It attempts to execute twists in the twistQueue.

  loop: (function(){

    var time = 0;

    return function(){

      //  Kick off the next animation frame
      requestAnimationFrame( this.loop );

      var localTime = ( typeof window !== 'undefined' && window.performance !== undefined &&
        window.performance.now !== undefined ? window.performance.now() : Date.now() );

      var frameDelta = localTime - (time || localTime);
      time = localTime;

      if( !this.paused ){
        //  Update the internal animation frame
        this.time += frameDelta;

        TWEEN.update( this.time );

        if( this.autoRotate ){
          this.rotation.add(this.rotationDelta);
        }

        if (this.isTweening === false) {
          var queue = this.undoing ? this.historyQueue : this.twistQueue;
          
          if (queue.future.length > 0) {
            var twist = queue.dequeue();
            this.animateTwist(twist, 0);
          }
        }

        // Our mouse controls should only be active if we are not rotating
        this.mouseInteraction.enabled = this.mouseControlsEnabled && !this.finalShuffle;
        this.mouseInteraction.update();

        this.controls.enabled = this.mouseControlsEnabled && !this.mouseInteraction.active;
        this.controls.update();
      }
    };
  }())
});
