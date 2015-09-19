/*

  CUBES

  TODO: change up this comment to reflect the new numbering scheme.
  
  A Cube is composed of 27 Cubelets (3x3x3 grid) numbered 0 through 26.
  Cubelets are numbered beginning from the top-left-forward corner of the
  Cube and proceeding left to right, top to bottom, forward to back:

             -----------------------
           /   18      19      20  /|
          /                       / |
         /   9      10       11  / 20
        /                       /   |
       /   0       1       2   / 11 |
       -----------------------     23
      |                       |2    |
      |   0       1       2   |  14 |
      |                       |    26
      |                       |5    |
      |   3       4       5   |  17 /
      |                       |    /
      |                       |8  /
      |   6       7       8   |  /
      |                       | /
       -----------------------

  Portions of the Cube are grouped (Groups):

    this.core
    this.centers
    this.edges
    this.corners
    this.crosses

  Portions of the Cube are grouped and rotatable (Slices):

  Rotatable around the Z axis:
    this.front
    this.standing
    this.back

  Rotatable around the X axis:
    this.left
    this.middle
    this.right

  Rotatable around the Y axis:
    this.up
    this.equator
    this.down

  A Cube may be inspected through its Faces (see Slices for more
  information on Faces vs Slices). From the browser's JavaScript console:

    this.inspect()

  This will reveal each Face's Cubelet indexes and colors using the Face's
  compact inspection mode. The non-compact mode may be accessed by passing
  a non-false value as an argument:

    this.inspect( true )

  --

  @author Mark Lundin - http://www.mark-lundin.com
  @author Stewart Smith

*/

ThreeTwist.Cube = function( parameters ){

  ThreeTwist.Group.call( this );

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
    
  this.numCubelets = this.order * this.order * this.order;
  
  // The colors parameter maps directions to colors.
  this.colors = parameters.colors === undefined ? [W, O, B, R, G, Y] : parameters.colors;

  var renderFactory = parameters.renderer || ThreeTwist.renderers.CSS3D;

  //  Some important booleans.

  //  The textureSize sets the physical size of the cublets in pixels.
  //  This is useful for rendering purposes as browsers don't downsample textures very well,
  //  nor is upsampling pretty either. In general, it's best to set the texture size to
  //  roughly the same size they'll appear on screen.
  parameters.textureSize = parameters.textureSize === undefined ? 120 : parameters.textureSize;

  this.isShuffling = false;
  this.isReady = true;
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
  this.twistQueue = new ThreeTwist.Queue( ThreeTwist.Twist.validate );

  //  Although we have a queue containing all our twists
  //  we also need a way to collect any undo requests into a similar queue
  this.historyQueue = new ThreeTwist.Queue( ThreeTwist.Twist.validate );

  //  How long should a Cube.twist() take?
  this.twistDuration = parameters.twistDuration !== undefined ? parameters.twistDuration : 500;

  //  If we shuffle, how shall we do it?
  this.shuffleMethod = this.PRESERVE_LOGO;

  //  Size matters? Cubelets will attempt to read these values.
  this.size = parameters.textureSize * 3;
  this.cubeletSize = this.size / 3;

  //  To display our cube, we'll need some 3D specific attributes, like a camera
  var
  FIELD_OF_VIEW = 35,
  WIDTH         = window.innerWidth,
  HEIGHT        = window.innerHeight,
  ASPECT_RATIO  = WIDTH / HEIGHT,
  NEAR          = 1,
  FAR           = 6000;

  this.camera = new THREE.PerspectiveCamera( FIELD_OF_VIEW, ASPECT_RATIO, NEAR, FAR );
  this.camera.position.z = this.size * 4;

  //  To do all the things normally associated with a 3D object
  //  we'll need to borrow a few properties from Three.js.
  //  Things like position rotation and orientation.
  this.object3D = new THREE.Object3D();
  this.autoRotateObj3D = new THREE.Object3D();
  this.rotation   = this.object3D.rotation;
  this.quaternion = this.object3D.quaternion;
  this.position   = this.object3D.position;
  this.matrix   = this.object3D.matrix;
  this.matrixWorld= this.object3D.matrixWorld;

  this.rotation.set(

    25  * Math.PI / 180,
    -30 * Math.PI / 180,
    0
  );

  //  If we enable Auto-Rotate then the cube will spin (not twist!) in space
  //  by adding the following values to the Three object on each frame.
  this.rotationDelta = new THREE.Euler( 0.1 * Math.PI / 180, 0.15 * Math.PI / 180, 0 );

  // Create all the cubelets. In order to construct a cubelet, we need to know which of its
  // faces are visible.
  
  this.cubelets = [];
  
  var cubeletId = 0; // We're not using the same numbering scheme.
  
  for (var xIndex = 0; xIndex < this.order; ++xIndex) {
    for (var yIndex = 0; yIndex < this.order; ++yIndex) {
      for (var zIndex = 0; zIndex < this.order; ++zIndex) {
        // Figure out in which directions this cubelet has a visible sticker.
        
        // Right --> +X
        // Up    --> +Y
        // Front --> +Z
        
        // Left  --> -X
        // Down  --> -Y
        // Back  --> -Z
        
        var visibleDirections = new Array();
        
        if (xIndex === this.order - 1) {
          visibleDirections.push(ThreeTwist.Direction.RIGHT);
        }
        if (yIndex === this.order - 1) {
          visibleDirections.push(ThreeTwist.Direction.UP);
        }
        if (zIndex === this.order - 1) {
          visibleDirections.push(ThreeTwist.Direction.FRONT);
        }
        
        if (xIndex === 0) {
          visibleDirections.push(ThreeTwist.Direction.LEFT);
        }
        if (yIndex === 0) {
          visibleDirections.push(ThreeTwist.Direction.DOWN);
        }
        if (zIndex === 0) {
          visibleDirections.push(ThreeTwist.Direction.BACK);
        }
        
        this.cubelets.push(new ThreeTwist.Cubelet(this, cubeletId, visibleDirections));
        ++cubeletId;
      }
    }
  }
  
  //  Mapping the Cube creates all the convenience shortcuts
  //  that we will need later. (Demonstrated immediately below!)

  //  A Rubik's Cube is composed of 27 cubelets arranged 3 x 3 x 3.
  //  > A canonical cubic twisty puzzle of order N has N^3 cubelets.
  //  > Of these N^3 cubelets, 6*(N-2)^2+12*(N-2)+8 are visible for N >= 2.
  //  We need a map that relates these 27 locations to the 27 cubelets
  //  such that we can ask questions like:
  //  What colors are on the Front face of the cube? Etc.

  //  Groups are simple collections of Cubelets.
  //  Their position and rotation is irrelevant.

  this.core        = new ThreeTwist.Group(); // Literally the very center cubelet, if one exists. TODO
  this.introverts  = new ThreeTwist.Group(); // All cubelets without exposed facelets.
  this.coreCenters = new ThreeTwist.Group(); // Any cubelets at the very center of their face. TODO
  this.centers     = new ThreeTwist.Group(); // Any cubelets with only one exposed face.
  this.edges       = new ThreeTwist.Group(); // Any cubelets with exactly two exposed faces.
  this.corners     = new ThreeTwist.Group(); // All cubelets with exactly three exposed faces.
  this.crosses     = new ThreeTwist.Group(); // TODO: this should be a list of groups.
  this.unitary     = new ThreeTwist.Group(); // Any cubelet with exactly six exposed faces (N=1).
  
  this.cubelets.forEach( function( cubelet ){
    if( cubelet.type === ThreeTwist.Cubelet.types[0] ) {
      this.introverts.add( cubelet );
    }
    if( cubelet.type === ThreeTwist.Cubelet.types[1] ) {
      this.centers.add( cubelet );
    }
    if( cubelet.type === ThreeTwist.Cubelet.types[2] ) {
      this.edges.add( cubelet );
    }
    if( cubelet.type === ThreeTwist.Cubelet.types[3] ) {
      this.corners.add( cubelet );
    }
    if (cubelet.type === ThreeTwist.Cubelet.types[6]) {
      this.unitary.add(cubelet);
    }
    if( cubelet.type === ThreeTwist.Cubelet.types[1] ||
        cubelet.type === ThreeTwist.Cubelet.types[2] ) {
      this.crosses.add( cubelet );
    }
  }.bind( this ));

  //  Now we'll create some slices. A slice represents an NxN grid of cubelets.
  //  Slices are Groups with purpose; they are rotate-able!

  // Create a list of slices for each face and a single slice for each slice
  // that is halfway between two faces (for odd-ordered cubes).
  
  function cubeletCoordinatesToIndex(x, y, z) {
    return (x * this.order + y) * this.order + z;
  }
  
  // Depth starts at 0. A depth of 0 corresponds to the outermost slice
  // on the given direction's face of the cube. Incrementing depth gives slices
  // that are successively further away from that face, but which are still
  // parallel to it and which turn on the same axis.
  function makeSlice(depth, axisDirection) {
    if (depth < 0 || depth >= this.order) {
      return null;
    }
    
    // For now just get a set of all the cubelets in the slice.
    // TODO: get the cubelets in a standard order.
    
    var cubeletIndices = [];
    var positiveFacing, constantCoordinate, iterationCoordinates;
    
    if (axisDirection.normal.x !== 0) {
      positiveFacing = axisDirection.normal.x > 0;
      constantCoordinate = 'x';
      iterationCoordinates = ['y', 'z'];
    }
    if (axisDirection.normal.y !== 0) {
      positiveFacing = axisDirection.normal.y > 0;
      constantCoordinate = 'y';
      iterationCoordinates = ['x', 'z'];
    }
    if (axisDirection.normal.z !== 0) {
      positiveFacing = axisDirection.normal.z > 0;
      constantCoordinate = 'z';
      iterationCoordinates = ['x', 'y'];
    }
    
    var cubeletCoordinate = {
      x: 0,
      y: 0,
      z: 0
    };
    
    if (positiveFacing) {
      cubeletCoordinate[constantCoordinate] = this.order - depth - 1;
    }
    else {
      cubeletCoordinate[constantCoordinate] = depth;
    }
    
    // Loop the iteration coordinates over each possible value. 
    for (; cubeletCoordinate[iterationCoordinates[0]] < this.order;
         ++cubeletCoordinate[iterationCoordinates[0]]) {
      for (; cubeletCoordinate[iterationCoordinates[1]] < this.order;
           ++cubeletCoordinate[iterationCoordinates[1]]) {
        var index = cubeletCoordinatesToIndex(cubeletCoordinate.x,
          cubeletCoordinate.y, cubeletCoordinate.z);
        cubeletIndices.push(index);
      }
    }
    
    // TODO: pass slice the direction.
    return new Slice(cubeletIndices, this);
  }
  
  // TODO: slices used to have their 'name' property set, but not anymore.
  // Figure out what to do about that.
  // TODO: also figure out what to do about the 'neighbor' properties that were assigned here.
  
  var depth, slicesPerFace = Math.floor(this.order / 2);
  var isOddOrder = this.order % 2 === 1;
  
  //  Slices that can rotate about the X-axis:
  this.left = [];
  this.right = [];
  if (isOddOrder) {
    // Middle turns with Left. Not my decision.
    this.middle = makeSlice(slicesPerFace, ThreeTwist.Direction.LEFT);
  }
  
  //  Slices that can rotate about the Y-axis:
  this.up = [];
  this.down = [];
  if (isOddOrder) {
    // Equator turns with Down. Also not my decision.
    this.equator = makeSlice(slicesPerFace, ThreeTwist.Direction.DOWN);
  }
  
  //  These are Slices that can rotate about the Z-axis:
  this.front = [];
  this.back = [];
  if (isOddOrder) {
    // Standing turns with Front. A good decision.
    this.standing = makeSlice(slicesPerFace, ThreeTwist.Direction.FRONT);
  }
  
  // Add the slices to the face slice lists.
  for (depth = 0; depth < slicesPerFace; ++depth) {
    this.left.push(makeSlice(depth, ThreeTwist.Direction.LEFT));
    this.right.push(makeSlice(depth, ThreeTwist.Direction.RIGHT));
    
    this.up.push(makeSlice(depth, ThreeTwist.Direction.UP));
    this.down.push(makeSlice(depth, ThreeTwist.Direction.DOWN));
    
    this.front.push(makeSlice(depth, ThreeTwist.Direction.FRONT));
    this.back.push(makeSlice(depth, ThreeTwist.Direction.BACK));
  }

  //  Faces .... special kind of Slice!
  // TODO: make faces lists of slices

  // FURDLB
  // These are in the same order as the corresponding directions.
  this.faces = [ this.front, this.up, this.right, this.down, this.left, this.back ];

  // In no particular order.
  this.slices = this.left
                .concat(this.right)
                .concat(this.up)
                .concat(this.down)
                .concat(this.front)
                .concat(this.back);
  
  if (this.middle) {
    this.slices.push(this.middle);
  }
  if (this.equator) {
    this.slices.push(this.equator);
  }
  if (this.standing) {
    this.slices.push(this.standing);
  }

  //  We also probably want a handle on any update events that occur,
  //  for example, when a slice is rotated.
  var onSliceRotated = function( evt ){
    this.dispatchEvent( new CustomEvent( 'onTwistComplete', {detail: { slice : evt.target }}));
  }.bind( this );

  this.slices.forEach( function( slice ){
    slice.addEventListener( 'change', onSliceRotated );
  });

  // Dictionary to lookup slice
  var allIndices = [];
  for (var index = 0; index < this.numCubelets; ++index) {
    allIndices.push(index);
  }

  // TODO: the fact that only some of these are arrays now will probably break something.
  this.slicesDictionary = {
    'f': this.front,
    's': this.standing,
    'b': this.back,

    'u': this.up,
    'e': this.equator,
    'd': this.down,

    'r': this.right,
    'm': this.middle,
    'l': this.left,

    //  Here we defined some arbitrary groups.
    //  Technically they're not really slices in the usual sense,
    //  there are however a few things about slices that we need,
    //  like the ability to rotate about an axis, therefore for all
    //  intents and purposes, we'll call them a slice.

    'x': new ThreeTwist.Slice( allIndices, this ),
    'y': new ThreeTwist.Slice( allIndices, this ),
    'z': new ThreeTwist.Slice( allIndices, this )
  };

  // Internally we have the ability to hide any invisible faces,
  // When a slice is rotated we determine what faces should be visible
  // so the cube doesn't look broken. This happens every time a slice is rotated.
  // Rotating Certain slices, such as the group slices never show internal faces.

  // TODO: I have a suspicion that these are never used anywhere.
  this.slicesDictionary.x.ableToHideInternalFaces = false;
  this.slicesDictionary.y.ableToHideInternalFaces = false;
  this.slicesDictionary.z.ableToHideInternalFaces = false;

  //  For the x,y and z groups we've defined above,
  //  we'll need to manually set an axis since one can't be automatically computed.

  this.slicesDictionary.x.axis.set( -1, 0, 0 );
  this.slicesDictionary.y.axis.set( 0, -1, 0 );
  this.slicesDictionary.z.axis.set( 0, 0, -1 );

  //  Good to let each Cubelet know where it exists.

  this.cubelets.forEach( function( cubelet, i ){
    cubelet.setAddress( i );
  });

  //   RENDERER
  //  Create a renderer object from the renderer factory.
  //   The renderFactory is a function that creates a renderer object

  this.renderer = renderFactory( this.cubelets, this );
  this.domElement = this.renderer.domElement;
  this.domElement.classList.add( 'cube' );
  this.domElement.style.fontSize = this.cubeletSize + 'px';

  this.autoRotateObj3D.add( this.object3D );

  if( this.hideInvisibleFaces ) {
    this.hideIntroverts( null, true );
  }

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

  //  We need to map our folds separately from Cube.map()
  //  because we only want folds mapped at creation time.
  //  Remapping folds with each Cube.twist() would get weird...
  
  // TODO: get folds working later. They're not super important.
  
  /*
  this.folds = [
    new ThreeTwist.Fold( this.front, this.right ),
    new ThreeTwist.Fold( this.left,  this.up    ),
    new ThreeTwist.Fold( this.down,  this.back  )
  ];
  */

  //   Define a default size for our cube, this will be resized to 100%
  //  of it's containing dom element during the render.
  
  // TODO: this is incredibly annoying and I haven't figured out a good
  // way to get the cube to actually resize properly. I think this would
  // be better left in the hands of the users to resize dynamically as they wish.

  this.setSize( 400, 200 );

  //  Get ready for major loop-age.
  //  Our Cube checks these booleans at 60fps.
  this.loop = this.loop.bind( this );
  requestAnimationFrame( this.loop );

  //  The cube needs to respond to user interaction and react accordingly.
  //  We'll set up a few event below to listen for specific commands,

  //  Enable key commands for our Cube.
  document.addEventListener( 'keypress', function( event ){
    if( event.target.tagName.toLowerCase() !== 'input' &&
        event.target.tagName.toLowerCase() !== 'textarea' &&
        !this.mouseInteraction.active &&
        this.keyboardControlsEnabled ){

      var key = String.fromCharCode( event.which );
      if( 'XxRrMmLlYyUuEeDdZzFfSsBb'.indexOf( key ) >= 0 ) {
        this.twist( key );
      }

    }
  }.bind( this ));

};

ThreeTwist.Cube.prototype = Object.create( ThreeTwist.Group.prototype );
ThreeTwist.Cube.prototype.constructor = ThreeTwist.Cube;
ThreeTwist.extend( ThreeTwist.Cube.prototype, {

  // TODO: make this shuffle big cubes properly.
  shuffle: function( amount, sequence ){

    //  How many times should we shuffle?
    // TODO: calculate a sufficient default shuffle number based on the
    // order of the cube.
    amount = amount || 30;

    //  Optional sequence of moves to execute instead of picking
    //  random moves from this.shuffleMethod.
    sequence = sequence || '';

    var moves = this.shuffleMethod.slice(),
      move, inverseOfLastMove = new ThreeTwist.Twist(), allowedMoves,
      sequenceLength = sequence.length, sequenceIndex = 0;

    //  We're shuffling the cube so we should clear any history
    this.twistQueue.empty( true );
    this.historyQueue.empty( true );

    //  Create some random rotations based on our shuffle method
    while( amount-- > 0 ){
      if (sequence){
        move.set(sequence[sequenceIndex]);
        sequenceIndex = (sequenceIndex + 1) % sequenceLength;
      } else {

        // Create a copy of all possible moves
        allowedMoves = moves.split('');
        move = new ThreeTwist.Twist().copy( inverseOfLastMove );

        //  We don't want to chose a move that reverses the last shuffle, it just looks odd,
        //  so we should only select a move if it's a new one.
        while( move.equals( inverseOfLastMove )){

          move.set( allowedMoves.splice( Math.floor( Math.random() *
            allowedMoves.length  ), 1 )[0] );

        }
      }

      //  If we flag this move as a shuffle, then we can remove it from the history
      //  once we've executed it.
      move.isShuffle = true;

      //  execute the shuffle
      this.twist( move );

      //  Store a reference to the reverse of the move ( a twist that undoes the shuffle )
      inverseOfLastMove = move.getInverse();

    }

    //  By stashing the last move in our shuffle sequence, we can
    //   later check if the shuffling is complete
    this.finalShuffle = move;

  },

  solve: function(){

    this.isSolving = true;
  },

  // TODO: this is broken ATM
  isSolved: function(){

    return this.front.isSolved( ThreeTwist.Direction.FRONT ) &&
           this.up.isSolved(    ThreeTwist.Direction.UP    ) &&
           this.right.isSolved( ThreeTwist.Direction.RIGHT ) &&
           this.down.isSolved(  ThreeTwist.Direction.DOWN  ) &&
           this.left.isSolved(  ThreeTwist.Direction.LEFT  ) &&
           this.back.isSolved(  ThreeTwist.Direction.BACK  );

  },

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

  twist: function( command ){

    if( this.undoing ) {
      this.twistQueue.empty();
    }
    this.historyQueue.empty();
    this.undoing = false;
    this.twistQueue.add( command );

  },

  immediateTwist: function( twist ){

    if( this.verbosity >= 0.8 ){

      console.log(

        'Executing a twist command to rotate the '+
         twist.group +' '+ twist.wise +' by',
         twist.degrees, 'degrees.'
      );
    }

    //   We now need to find the slice to rotate and figure out how much we need to rotate it by.
    var slice    = this.slicesDictionary[ twist.command.toLowerCase() ], // FIXME
      rotation = ( twist.degrees === undefined ? 90 : twist.degrees ) * twist.vector,
      radians  = rotation.degreesToRadians(),
      duration = Math.abs( radians - slice.getRotation() ) /
        ( Math.PI * 0.5 ) * this.twistDuration;

    var l = slice.indices.length, cubelet;
    
    while( l-- > 0 ){
      slice.getCubelet( l ).isTweening = true;
    }

    //  Boom! Rotate a slice
    var dummySlice = {
      rotation: slice.getRotation()
    };

    new TWEEN.Tween( dummySlice )
    .to({

      rotation: radians

    }, duration )
    .easing( TWEEN.Easing.Quartic.Out )
    .onUpdate( function(){
      slice.setRotation( this.rotation );
    })
    .onComplete( function(){

      slice.setRotation( radians );
      slice.axis.rotation = 0;

      // Invalidate our cubelet tweens
      l = slice.indices.length;
      while( l-- > 0 ){

        cubelet = slice.getCubelet( l );
        cubelet.isTweening = false;
        cubelet.updateMatrix();
        cubelet.matrixSlice.copy( cubelet.matrix );

      }

      //  If the rotation changes the cube then we should update the cubelet mapping

      if( rotation !== 0 ){

        slice.rotateGroupMappingOnAxis( radians );

        // Also, since everything's changed, we might as well tell everyone.
        this.dispatchEvent( new CustomEvent( 'onTwistComplete', { detail: {
          slice : slice,
          twist : twist
        }}));
      }

      //  If we're on the final twist of a shuffle
      if( twist === this.finalShuffle ){

        this.finalShuffle = null;

        this.dispatchEvent( new CustomEvent( 'onShuffleComplete', { detail: {
          slice : slice,
          twist : twist
        }}));

      }

    }.bind( this ))
    .start( this.time );

  },

  //  We can read and write text to the Cube.
  //  This is handled by Folds which are composed of two Faces.
  // TODO: get folds working again
  getText: function( fold ){
    return "ASDF LOL";
    
    /*
    if( fold === undefined ){

      return [
        this.folds[ 0 ].getText(),
        this.folds[ 1 ].getText(),
        this.folds[ 2 ].getText()
      ];
    }
    else if( _.isNumeric( fold ) && fold >= 0 && fold <= 2 ){

      return this.folds[ fold ].getText();
    }
    */
  },
  setText: function( text, fold ){
    /*
    if( fold === undefined ){

      this.folds[ 0 ].setText( text );
      this.folds[ 1 ].setText( text );
      this.folds[ 2 ].setText( text );
    }
    else if( _.isNumeric( fold ) && fold >= 0 && fold <= 2 ){

      this.folds[ fold ].setText( text );
    }
    */
  },

  setSize: function ( width, height ){

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize( width, height );

  },

  //  Shuffle methods.

  // TODO: this would be better implemented using either a set of allowed
  // slices to rotate or a set of allowed moves or algorithms to perform.
  
  //  Preserve the logo position and rotation.
  PRESERVE_LOGO: 'RrLlUuDdSsBb',

  //  Allow all slices to rotate.
  ALL_SLICES:    'RrMmLlUuEeDdFfSsBb',

  //  Allow all slices, and also full cube X, Y, and Z rotations.
  EVERYTHING:    'XxRrMmLlYyUuEeDdZzFfSsBb',

  //  The cube does its own loopage.
  //  It attempts to execute twists in the twistQueue
  //  and then tasks in the taskQueue.
  //  This is how shuffling and solving are handled.

  loop: (function(){

    var time = 0;

    return function(){

      requestAnimationFrame( this.loop );

      //  Kick off the next animation frame

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

        //  If the Cube is "ready"
        //  and not a single cubelet is currently tweening
        //  regardless of it's resting state (engagement;
        //  meaning it could in theory not be tweening but
        //  has come to rest at where rotation % 90 !== 0.

        if( this.isReady && this.isTweening() === 0 ){

          var queue = this.undoing ? this.historyQueue : this.twistQueue;

          //  We have zero twists in the queue
          //  so perhaps we'd like to add some?
          if( queue.future.length === 0 ){

            //  If the cube ought to be solving and a solver exists
            //  and we're not shuffling, tweening, etc.

            if( this.isSolving && window.solver ){

              this.isSolving = window.solver.consider( this );

            }

            //  If we are doing absolutely nothing else
            //  then we can can try executing a task.
            else if( this.taskQueue.isReady === true ){

              var task = this.taskQueue.dequeue();
              if( task instanceof Function ) {

                task();

              }

            }

          }

          //  Otherwise, we have some twists in the queue
          //  and we should put everything else aside and tend to those.

          else {

            var twist = queue.dequeue();

            // Only count moves that actually change the puzzle's state.
            if( twist.command.toLowerCase() !== 'x' &&
                twist.command.toLowerCase() !== 'y' &&
                twist.command.toLowerCase() !== 'z' &&
                twist.degrees % 360 !== 0  ) {
              this.moveCounter += this.undoing ? -1 : 1;
            }

            //  If the twist we're about to execute does not actually
            //  change any slices, ie, we're rotating back to 0,
            //  then we don't need to remember it.
            // Also, don't remember the shuffle moves, because then
            // one could cheat by just undoing them.
            if( twist.degrees % 360 === 0 || twist.isShuffle ) {

              queue.purge( twist );

            }

            this.immediateTwist( twist );

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
