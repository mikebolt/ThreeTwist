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
  this.colors = parameters.colors === undefined ? [W, O, B, R, G, Y] : parameters.colors;

  var renderFactory = parameters.renderer || ThreeTwist.renderers.CSS3D;

  //  Some important booleans.

  this.isShuffling = false;
  this.isSolving = false;
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

  this.camera = new THREE.PerspectiveCamera( FIELD_OF_VIEW, ASPECT_RATIO, NEAR, FAR );
  this.camera.position.z = this.size * 4;

  //  To do all the things normally associated with a 3D object
  //  we'll need to borrow a few properties from Three.js.
  //  Things like position rotation and orientation.
  this.object3D = new THREE.Object3D();
  this.autoRotateObj3D = new THREE.Object3D();
  this.rotation = this.object3D.rotation;
  this.quaternion = this.object3D.quaternion;
  this.position = this.object3D.position;
  this.matrix = this.object3D.matrix;
  this.matrixWorld = this.object3D.matrixWorld;

  this.rotation.set(
    25  * Math.PI / 180,
    -30 * Math.PI / 180,
    0
  );

  //  If we enable Auto-Rotate then the cube will spin (not twist!) in space
  //  by adding the following values to the Three object on each frame.
  this.rotationDelta = new THREE.Euler( 0.1 * Math.PI / 180, 0.15 * Math.PI / 180, 0 );

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

  this.renderer = renderFactory( this );
  this.domElement = this.renderer.domElement;
  this.domElement.classList.add( 'cube' );
  this.domElement.style.fontSize = this.cubeletSize + 'px';

  this.autoRotateObj3D.add( this.object3D );

  if( this.hideInvisibleFaces ) {
    this.hideIntroverts( null, true );
  }
  
  // Set the size of the cube's display area.
  this.setSize(WIDTH, HEIGHT);

  //  The Interaction class provides all the nifty mouse picking stuff.
  //  It's responsible for figuring out what cube slice is supposed to rotate
  //  and in what direction.

  // TODO: interaction.js will need work
  this.mouseInteraction = new ThreeTwist.Interaction( this, this.camera, this.domElement );

  this.mouseInteraction.addEventListener( 'click', function( evt ){

    this.dispatchEvent( new CustomEvent("click", { detail: evt.detail  }));

  }.bind( this ));

  //  set up interactive controls
  //  The Controls class rotates the entire cube around using an arcball implementation.
  //  You could override this with a different style of control
  var controlsConstructor = parameters.controls || ThreeTwist.Controls;
  this.controls = new controlsConstructor( this, this.camera, this.domElement );

  //  Get ready for major loop-age.
  //  Our Cube checks these booleans at 60fps.
  this.loop = this.loop.bind( this );
  requestAnimationFrame( this.loop );

  //  The cube needs to respond to user interaction and react accordingly.
  //  We'll set up a few event below to listen for specific commands,

  //  Enable key commands for our Cube.
  /*
  document.addEventListener( 'keypress', function( event ){
    if( event.target.tagName.toLowerCase() !== 'input' &&
        event.target.tagName.toLowerCase() !== 'textarea' &&
        !this.mouseInteraction.active &&
        this.keyboardControlsEnabled ){

      var key = String.fromCharCode( event.which );
      if( 'XxRrMmLlYyUuEeDdZzFfSsBb'.indexOf( key ) >= 0 ) {
        this.twist( key ); // TODO: retrofit this.twist()
      }

    }
  }.bind( this ));
  */
};

ThreeTwist.Cube.prototype = {};
ThreeTwist.Cube.prototype.constructor = ThreeTwist.Cube;
ThreeTwist.extend( ThreeTwist.Cube.prototype, {
  
  undo: function(){
    if( this.twistQueue.history.length > 0 ){
      this.historyQueue.add( this.twistQueue.undo().getInverse() );
      this.undoing = true;
    }
  },

  redo: function(){
    if( this.twistQueue.future.length > 0  ){
      this.undoing = true;
      this.historyQueue.empty();
      this.historyQueue.add( this.twistQueue.redo() );
    }
  },

  twist: function(twist){
    if( this.undoing ) {
      this.twistQueue.empty();
    }
    this.historyQueue.empty();
    this.undoing = false;
    this.twistQueue.add(twist);
  },
  
  getAffectedPieces: function(move) {
    var affectedPieces = [];
    this.cubelets.forEach(function(cubelet) {
      var directionId = ThreeTwist.Direction.getDirectionByInitial(move.base).id;
      if (ThreeTwist.selector.sliceSelector(cubelet, directionId, move.startLayer, move.endLayer)) {
        affectedPieces.push(cubelet);
      }
    });
    return affectedPieces;
  },
  
  // 'twist' should now be a "move" from alg.js
  // format:
  // twist = {
  //   type: "move",
  //   base: "l", // example
  //   amount: 2, // 2 means 180 deg clockwise
  //   startLayer: 1, // layer 1 is the outermost layer, increasing inwards
  //   endLayer: 1, // 1 to 1 means just the outermost layer
  // }
  immediateTwist: function( twist ){

    //   We now need to find the slice to rotate and figure out how much we need to rotate it by.
    
    var rotation = twist.amount * 90;
    var radians = rotation.degreesToRadians();
    var duration = Math.abs(radians) * Math.PI * 0.5 * this.twistDuration;
    var dummy = { rotation: 0 };
    
    // Invert the rotation if necessary.
    var adjustedRadians = radians;
    if (twist.base === 'l' || twist.base === 'd' || twist.base === 'b') {
      adjustedRadians *= -1;
    }
    
    // Figure out which function to use to create the rotation matrices.
    // Bind them to THREE.Matrix4 in case that's necessary.
    var makeRotation;
    if (twist.base === 'l' || twist.base === 'r') {
      makeRotation = THREE.Matrix4.makeRotationX.bind(THREE.Matrix4);
    }
    else if (twist.base === 'd' || twist.base === 'u') {
      makeRotation = THREE.Matrix4.makeRotationY.bind(THREE.Matrix4);
    }
    else if (twist.base === 'f' || twist.base === 'b') {
      makeRotation = THREE.Matrix4.makeRotationZ.bind(THREE.Matrix4);
    }
    
    var slice = this.getAffectedPieces(twist);

    this.isTweening = true;
    
    //  Boom! Rotate a slice
    new TWEEN.Tween(dummy)
    .to({
      rotation: adjustedRadians
    }, duration)
    .easing( TWEEN.Easing.Quartic.Out )
    .onUpdate(function() {
    
      var rotationMatrix = makeRotation(dummy.rotation);
    
      slice.forEach(function(cubelet) {
        cubelet.matrix = cubelet.stableMatrix.multiply(rotationMatrix);
      });
      
    })
    .onComplete(function() {

      var completeRotationMatrix = makeRotation(adjustedRadians);
      
      // Round all the elements of the matrix.
      // This only works properly because it's a cube.
      for (var i = 0; i < completeRotationMatrix.elements.length; ++i) {
        completeRotationMatrix.elements[i] = Math.round(completeRotationMatrix.elements[i]);
      }
    
      slice.forEach(function(cubelet) {
        // Update the visual position and rotation.
        cubelet.applyMatrix(completeRotationMatrix);
        cubelet.stableMatrix = cubelet.matrix;
        
        // Now update the local position, too.
        var centeredLocalPosition = cubelet.localPosition.sub(cubelet.localCenter);
        var rotatedLocalPosition = centeredLocalPosition.applyMatrix4(completeRotationMatrix)
                                                        .add(centeredLocalPosition);
        cubelet.localPosition = rotatedLocalPosition;
      });

      this.isTweening = false;
      
    }.bind( this ))
    .start( this.time ); // this.time is *now*.
  },

  setSize: function ( width, height ) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize( width, height );
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

      var frameDelta = localTime - ( time || localTime );
      time = localTime;

      if( !this.paused ){
        //  Update the internal animation frame
        this.time += frameDelta;

        TWEEN.update( this.time );

        if( this.autoRotate ){
          this.rotation.x += this.rotationDelta.x;
          this.rotation.y += this.rotationDelta.y;
          this.rotation.z += this.rotationDelta.z;
        }

        if (this.isTweening === false) {
          var queue = this.undoing ? this.historyQueue : this.twistQueue;

          if (queue.future.length > 0) {
            var twist = queue.dequeue();
            this.immediateTwist(twist);
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
