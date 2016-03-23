/*

  CUBELETS

  @author Mark Lundin - http://www.mark-lundin.com
  @author Stewart Smith
  
  @author Michael Casebolt : retrofitted for bigcubes

*/

// Pass in the cube, and the cubelet's coordinates
// In this case they are 0-indexed, in the interval [0, N)
// where N is the order of the cube.
// They increase right, up, and back, respectively,
// so the (0, 0, 0) cubelet is always FLD.
ThreeTwist.Cubelet = function(cube, x, y, z) {

  // This doubles as both a view class and a model class.
  // These should probably be separated.
  THREE.Object3D.call( this );

  //  Our Cube can directly address its Cubelet children,
  //  only fair the Cubelet can address their parent Cube!
  this.cube = cube;

  // This used to be just an int,
  // but now it's a unique string id.
  // It should be useful for mapping.
  this.id = x + '-' + y + '-' + z;
  
  // save the position values
  this.localPosition = new THREE.Vector3(x, y, z);
  
  var center = (this.cube.order - 1) / 2;
  this.localCenter = new THREE.Vector3(center, center, center);
  
  // The cube starts in the solved state.
  this.solvedLocalPosition = new THREE.Vector3(x, y, z);

  this.size = cube.cubeletSize || 120 * 3.0 / this.cube.order;

  //  Now we can find our Cubelet's X, Y, and Z position in space.
  //  We only need this momentarily to create our Object3D so
  //  there's no need to attach these properties to our Cubelet object.
  var epsilon = 0.1; // Epsilon is the gap size. TODO: causing problems?
  var px = (x - (this.cube.order - 1) / 2) * ( this.size + epsilon );
  var py = (y - (this.cube.order - 1) / 2) * ( this.size + epsilon );
  
  // Invert the z-axis, so that positive z goes into the screen.
  var pz = (z - (this.cube.order - 1) / 2) * ( this.size + epsilon ) * -1;

  // THREE.js stuff
  this.position.set(px, py, pz);
  this.updateMatrix();

  this.stableMatrix = this.matrix;

  // Add the cubelet to the cube object
  this.cube.object3D.add( this );
  
  // Calculate the 'visibleDirections' array.
  var visibleDirections = []
  var maxIndex = this.cube.order - 1;
  visibleDirections[0] = this.localPosition.z === 0;        // F
  visibleDirections[1] = this.localPosition.y === maxIndex; // U
  visibleDirections[2] = this.localPosition.x === maxIndex; // R
  visibleDirections[3] = this.localPosition.y === 0;        // D
  visibleDirections[4] = this.localPosition.x === 0;        // L
  visibleDirections[5] = this.localPosition.z === maxIndex; // B
  
  // This loop creates all the cubelet's faces:
  this.extrovertedFaces = 0;
  this.faces = [];

  for( var i = 0; i < ThreeTwist.Direction.numDirections; i++ ){
    //  Before we create our face's THREE object
    //  we need to know where it should be positioned and rotated.
    var direction = ThreeTwist.Direction.getDirectionById(i);
    var visible = visibleDirections[i];
    var color = cube.colors[ i ];
    
    if (!visible) {
      color = ThreeTwist.COLORLESS;
    }

    //  Each face is an object and keeps track of its original ID number
    // (which is important because its address will change with each rotation)
    //  its current color, and so on.
    this.faces[ i ] = {};
    this.faces[ i ].id = i;
    this.faces[ i ].color = color;

    //  We're going to keep track of what face was what at the moment of initialization,
    //  mostly for solving purposes.
    this.faces[ i ].solvedDirection = direction;

    //  INTROVERTED FACES.
    //  If this face has no color sticker then it must be interior to the Cube.
    //  That means in a normal state (no twisting happening) it is entirely hidden.
    this.faces[ i ].isIntrovert = !visible;

    if (visible) {
      this.extrovertedFaces++;
    }
  }

  //  During a rotation animation this Cubelet marks itself as
  //  this.isTweening = true.
  this.isTweening = false;
};

//  Let's add some functionality to Cubelet's prototype
//  By adding to Cubelet's prototype and not the Cubelet constructor
//  we're keeping instances of Cubelet super clean and light.
ThreeTwist.Cubelet.prototype = Object.create( THREE.Object3D.prototype );

ThreeTwist.extend( ThreeTwist.Cubelet.prototype, {
  // Nothing here for now.
});