/*

  SLICES

  Slices are thin layers sliced out of the Cube
  composed of 9 Cubelets (3x3 grid).
  The position of these Cubelets can be mapped as follows:


       ----------- ----------- -----------
      |           |           |           |
      | northWest |   north   | northEast |
      |     0     |     1     |     2     |
      |           |           |           |
       ----------- ----------- -----------
      |           |           |           |
      |    west   |   origin  |    east   |
      |     3     |     4     |     5     |
      |           |           |           |
       ----------- ----------- -----------
      |           |           |           |
      | southWest |   south   | southEast |
      |     6     |     7     |     8     |
      |           |           |           |
       ----------- ----------- -----------



  The cubelets[] Array is mapped to names for convenience:

    0  === this.northWest
    1  === this.north
    2  === this.northEast
    3  === this.west
    4  === this.origin
    5  === this.east
    6  === this.southWest
    7  === this.south
    8  === this.southEast

  Portions of Slices can be Grouped:

  Rows and columns as strips (1x3)
    this.up
    this.equator
    this.down
    this.left
    this.middle
    this.right

  Other combinations
    this.cross
    this.edges
    this.ex
    this.corners
    this.ring
    this.dexter
    this.sinister

  A Slice may be inspected from the browser's JavaScript console with:

    this.inspect()

  This will reveal the Slice's Cubelets, their Indices, and colors.
  A compact inspection mode is also available:

    this.inspect( true )

  This is most useful for Slices that are also Faces. For Slices that are
  not Faces, or for special cases, it may be useful to send a side
  argument which is usually by default the Slice's origin's only visible
  side if it has one.

    this.inspect( false, 'up' )
    this.inspect( true, 'up' )

  CUBE FACES vs CUBE SLICES

  All Cube faces are Slices, but not all Slices are Cube faces.
  For example, a Cube has 6 faces: front, up, right, down, left, back.
  But it also has slices that that cut through the center of the Cube
  itself: equator, middle, and standing. When a Slice maps itself it
  inspects the faces of the Cubelet in the origin position of the Slice --
  the center piece -- which can either have a single visible face or no
  visible face. If it has a visible face then the Slice's face and the
  face's direction is in the direction of that Cubelet's visible face.
  This seems redundant from the Cube's perspective:

    cube.front.face === 'front'

  However it becomes valuable from inside a Slice or Fold when a
  relationship to the Cube's orientation is not immediately clear:

    if( this.face === 'front' )...

  Therefore a Slice (s) is also a face if s.face !== undefined.

*/


ThreeTwist.Slice = function( indices, cube, axis ){

  this.axis = axis;
  this.invertedAxis = new THREE.Vector3();
  this.matrix = new THREE.Matrix4();
  this.axis.rotation = 0;
  this.indices = indices;
  this.neighbour = null;
  this.ableToHideInternalFaces = true;
  this.cube = cube;

  this.getCubelet = function( index ){
    return cube.cubelets[ indices[ index ]];
  };

  this.cubelets = [];
  var l = this.indices.length;

  while( l-- > 0 ){
    this.cubelets.push( this.getCubelet( l ) );
  }

  this.origin = this.cube.cubelets[ this.indices[ 4 ]];
  this.north = this.cube.cubelets[ this.indices[ 1 ]];
  this.northEast = this.cube.cubelets[ this.indices[ 2 ]];
  this.east = this.cube.cubelets[ this.indices[ 5 ]];
  this.southEast = this.cube.cubelets[ this.indices[ 8 ]];
  this.south = this.cube.cubelets[ this.indices[ 7 ]];
  this.southWest = this.cube.cubelets[ this.indices[ 6 ]];
  this.west = this.cube.cubelets[ this.indices[ 3 ]];
  this.northWest = this.cube.cubelets[ this.indices[ 0 ]];

  // Slice is designed to be immutable, so override Group's 'add' and 'remove' methods.
  this.add = this.remove = function(){};

  //  Once we've performed a physical rotation of a face or group,
  //  we need a way to remap the array of cubelets. This method does just that.
  //  Given a subset of cubelets, an axis to rotate on and an angle,
  //  it will shift the location of all cubelets that need changing.

  // TODO: this needs updatin'
  this.rotateGroupMappingOnAxis = (function(){

    //   Here we pre-define a few properties.
    //  We'll reuse them, so it's best to define them up front
    //  to avoid allocating new memory at runtime.

    var absAxis = new THREE.Vector3(),
      max = new THREE.Vector3( cube.order - 1, cube.order - 1, cube.order - 1 ),
      core = max.multiply( 0.5 ),
      point = new THREE.Vector3(),
      origin = new THREE.Vector3(),
      rotation = new THREE.Matrix4(),
      faceArray;

    return function ( angle ){

      // We can only remap the cube if it's in whole rotation,
      // therefore we should round to the nearest full rotation

      angle = Math.round( angle / ( Math.PI * 0.25 ) ) * Math.PI * 0.25;

      absAxis.copy( max );
      absAxis.sub( this.axis );

      var cubeletsCopy = cube.cubelets.slice();

      //  Get the rotation as a matrix
      rotation.makeRotationAxis( this.axis, angle * -1 );

      var i = indices.length, cubelet;

      while( i-- > 0 ){

        // For every cubelet ...
        cubelet = cube.cubelets[ indices[ i ]];

        //  Get its position and save it for later ...
        point.set( cubelet.addressX, cubelet.addressY, cubelet.addressZ );
        origin.copy( point );

	// Center the cube at the origin.
	point.add(core.negate());

        //  Then rotate it about our axis.
        point.multiply( absAxis ).applyMatrix4( rotation );

        //  Flatten out any floating point rounding errors ...
	// TODO: probably a problem for even-ordered cubes!
        point.x = Math.round( point.x );
        point.y = Math.round( point.y );
        point.z = Math.round( point.z );

        //  Use the X,Y,Z to get a 3D index.
        // TODO: make a function for this.
        var address = (point.x * cube.order + point.y) * cube.order + point.z;
	cube.cubelets[address] = cubeletsCopy[cubelet.address];
// Old way was probably backward
//        cube.cubelets[cubelet.address] = cubeletsCopy[address];

      }

      //  Good to let each Cubelet know where it exists.
      for( i = 0; i < cube.cubelets.length; i ++ ){
        cube.cubelets[ i ].setAddress( i );
      }

      //   Remapping the location of the cubelets is all well and good,
      //  but we also need to reorient each cubelet's face so that cubelet.front
      //  is always pointing to the front.

      // Get the slice's rotation
      rotation.makeRotationAxis( this.axis, angle );

      // For each cubelet..
      this.cubelets.forEach( function( cubelet ){

        faceArray = [];

        //  iterate over its faces.
        cubelet.faces.forEach( function( face ){

          //  Get its normal vector
	  point.copy( face.currentDirection.normal );

          //  Rotate it
          point.applyMatrix4( rotation );

          // and find the index of the new direction and add it to the new array
	  var destinationNormal = ThreeTwist.Direction.getDirectionByNormal( point );
          faceArray[ destinationNormal.id ] = face;
	  face.currentDirection = destinationNormal;

        });

        // Remap all the face shortcuts
//        cubelet.faces  = faceArray.slice();
        cubelet.faces = faceArray; // No point in copying the array here, right?
        cubelet.front  = cubelet.faces[ 0 ];
        cubelet.up     = cubelet.faces[ 1 ];
        cubelet.right  = cubelet.faces[ 2 ];
        cubelet.down   = cubelet.faces[ 3 ];
        cubelet.left   = cubelet.faces[ 4 ];
        cubelet.back   = cubelet.faces[ 5 ];

      });

    };

  }());

  this.map();

};

//  We want Slice to learn from ThreeTwist.Group
ThreeTwist.Slice.prototype = Object.create( ThreeTwist.Group.prototype );

ThreeTwist.extend( ThreeTwist.Slice.prototype, {

  map: function(){

    //  Now that we know what the origin Cubelet is
    //  we can determine if this is merely a Slice
    //  or if it is also a Face.
    //  If a face we'll know what direction it faces
    //  and what the color of the face *should* be.

    // Actually, do this by counting up the visible directions and picking
    // the direction with the highest count if it is higher than the others.
    
    // TODO: In the future, maybe just initialize the Slice as a face?
    // This can be done easily in the Cube constructor.
    // or simplify by using the known axis
    
    // On a 5x5x5 cube, we expect there to be 5 * 5 = 25 facelets on a face slice.
    var expectedNumFaceletsPerFace = this.cube.order * this.cube.order;
    
    // Create an array of zeros for tallying the directions.
    var direction;
    var numFaceletsInDirection = [];
    for (direction = 0; direction < ThreeTwist.Direction.numDirections; ++direction) {
      numFaceletsInDirection[direction] = 0;
    }
    
    this.cubelets.forEach(function(cubelet) {
      cubelet.visibleDirections.forEach(function(visibleDirection) {
        ++numFaceletsInDirection[visibleDirection.id];
      });
    });
    
    for (direction = 0; direction < ThreeTwist.Direction.numDirections; ++direction) {
      if (numFaceletsInDirection[direction] === expectedNumFaceletsPerFace) {
        this.color = this.cube.colors[direction];
        this.face = ThreeTwist.Direction.getNameById(direction);
      }
    }

    //  Addressing orthogonal strips of Cubelets is more easily done by
    //  cube notation for the X and Y axes.

    this.up = new ThreeTwist.Group(

      this.northWest, this.north, this.northEast
    );
    this.equator = new ThreeTwist.Group(

      this.west, this.origin, this.east
    );
    this.down = new ThreeTwist.Group(

      this.southWest, this.south, this.southEast
    );
    this.left = new ThreeTwist.Group(

      this.northWest,
      this.west,
      this.southWest
    );
    this.middle = new ThreeTwist.Group(

      this.north,
      this.origin,
      this.south
    );
    this.right = new ThreeTwist.Group(

      this.northEast,
      this.east,
      this.southEast
    );

    //  If our Slice has only one center piece
    // (ie. a Cubelet with only ONE single Sticker)
    //  then it is a Face -- a special kind of Slice.

    var hasCenter = this.hasType( 'center' );
    if( hasCenter && hasCenter.cubelets.length === 1 ){

      this.center  = this.hasType( 'center' );
      this.corners = new ThreeTwist.Group( this.hasType( 'corner' ));
      this.cross   = new ThreeTwist.Group( this.center, this.hasType( 'edge' ));
      this.ex      = new ThreeTwist.Group( this.center, this.hasType( 'corner' ));

    }

    //  Otherwise our Slice will have multiple center pieces
    // (again, that means Cubelets with only ONE single Sticker)
    //  and this is why a Slice's "origin" is NOT the same as
    //  its "center" or "centers!"

    else {

      this.centers = new ThreeTwist.Group( this.hasType( 'center' ));

    }

    this.edges = new ThreeTwist.Group( this.hasType( 'edge' ));

    //  I'm still debating whether this should be Sticker-related
    //  or if it's merely a fun grouping.
    //  Writing the solver should clarify this further...

    this.ring = new ThreeTwist.Group(
      this.northWest, this.north, this.northEast,
      this.west, this.east,
      this.southWest, this.south, this.southEast
    );

    //  And finally for the hell of it let's try diagonals via
    //  Blazon notation:

    // TODO: do this programatically. Or just get rid of it :)
    
    /*
    this.dexter = new ThreeTwist.Group(//  From top-left to bottom-right.
      this.northWest,
      this.origin,
      this.southEast
    );
    this.sinister = new ThreeTwist.Group(//  From top-right to bottom-left.
      this.northEast,
      this.origin,
      this.southWest
    );
    */

    return this;

  },

  //  Using the rotation we can physically rotate all our cubelets.
  //  This can be used to partially or fully rotate a slice.

  setRotation: function( radians ){

    if( this.ableToHideInternalFaces && this.cube.isFlagged( 'showingIntroverts' ) !== 0 &&
        this.cube.hideInvisibleFaces ){

      var partialRotation = radians % ( Math.PI * 0.5 ) !== 0;

      this.invertedAxis.copy( this.axis ).negate();

      if( partialRotation ){
        if( this.neighbour ){
          this.showIntroverts( this.axis, true );
          this.neighbour.showIntroverts( this.invertedAxis, true );
        }else{
          this.cube.showIntroverts( this.axis, true );
          this.cube.showIntroverts( this.invertedAxis, true );
        }
      }
      else{
        if( this.neighbour ){
          this.hideIntroverts( null, true );
          this.neighbour.hideIntroverts( null, true );
        }else{
          this.cube.hideIntroverts( null, true );
        }
      }
    }

    //  Define a delta rotation matrix from the axis and angle
    this.matrix.makeRotationAxis( this.axis, radians );

    this.axis.rotation = radians;

    //  Iterate over the cubelets and update their relative matrices
    var l = this.indices.length,
      cubelet,
      m1 = new THREE.Matrix4();

    while( l-- ){

      cubelet = this.getCubelet( l );

      cubelet.matrix.multiplyMatrices( this.matrix, cubelet.matrixSlice );
      cubelet.position.setFromMatrixPosition( cubelet.matrix );
      cubelet.scale.setFromMatrixScale( cubelet.matrix );
      m1.extractRotation( cubelet.matrix );
      cubelet.quaternion.setFromRotationMatrix( m1 );

    }

  },

  getRotation: function(){
    return this.axis.rotation;
  },

  //  Given a Cubelet in this Slice,
  //  what is its compass location?

  // TODO: "compass location" isn't very well defined for big cubes.
  // Maybe just remove this function.
  getLocation: function( cubelet ){

    // TODO: this could be written as a map lookup
    if( cubelet === this.origin    ) {
      return 'origin';
    }
    if( cubelet === this.north     ) {
      return 'north';
    }
    if( cubelet === this.northEast ) {
      return 'northEast';
    }
    if( cubelet === this.east      ) {
      return 'east';
    }
    if( cubelet === this.southEast ) {
      return 'southEast';
    }
    if( cubelet === this.south     ) {
      return 'south';
    }
    if( cubelet === this.southWest ) {
      return 'southWest';
    }
    if( cubelet === this.west      ) {
      return 'west';
    }
    if( cubelet === this.northWest ) {
      return 'northWest';
    }

    return false;
  },

  // TODO: rename this function to more accurately represent what it calculates.
  isSolved: function( face ){

    if( face ){

      var faceColors = {},
        cubelet, color,
        l = this.indices.length,
        numberOfColors = 0;

      if( face instanceof ThreeTwist.Direction ) {
        face = face.name;
      }

      while( l-- > 0 ){

        cubelet = this.getCubelet( l );
        color = cubelet[ face ].color.name;

        if( faceColors[ color ] === undefined ){

          faceColors[ color ] = 1;
          numberOfColors ++;
        }
        else {
          faceColors[ color ] ++;
        }
      }

      return numberOfColors === 1 ? true : false;

    }
    else {

      console.warn( 'A face [String or ThreeTwist.Controls] argument must be specified ' +
                    'when using ThreeTwist.Group.isSolved().' );
      return false;

    }
  }

});
