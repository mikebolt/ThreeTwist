/*

  CUBELETS

  @author Mark Lundin - http://www.mark-lundin.com
  @author Stewart Smith
  @author Michael Casebolt : retrofitted for bigcubes

*/

// Pass in the cube, and the cubelet's coordinates.
// In this case they are 0-indexed, in the interval [0, N)
// where N is the order of the cube.
// They increase right, up, and back, respectively,
// so the (0, 0, 0) cubelet is always the FLD corner cubelet.
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
  
  // The cube starts in the solved state.
  this.solvedPosition = new THREE.Vector3(x, y, z);

  this.size = cube.cubeletSize || 120 * 3.0 / this.cube.order;

  // THREE.js stuff
  this.matrixAutoUpdate = false; // So that the cubelet can be controlled exlusively using its matrix.

  this.matrix = new THREE.Matrix4().makeTranslation(x, y, z);
  this.stableMatrix = new THREE.Matrix4().copy(this.matrix);
  
  // Add the cubelet to the cube object
  this.cube.object3D.add( this );
  
  // Calculate the 'visibleDirections' array.
  var visibleDirections = [];
  var maxIndex = this.cube.order - 1;
  visibleDirections[0] = z === 0;        // F
  visibleDirections[1] = y === maxIndex; // U
  visibleDirections[2] = x === maxIndex; // R
  visibleDirections[3] = y === 0;        // D
  visibleDirections[4] = x === 0;        // L
  visibleDirections[5] = z === maxIndex; // B
  
  // This loop creates all the cubelet's faces:
  this.extrovertedFaces = 0;
  this.faces = [];
  for (var i = 0; i < ThreeTwist.Direction.numDirections; i++) {
    //  Before we create our face's THREE object
    //  we need to know where it should be positioned and rotated.
    var direction = ThreeTwist.Direction.getDirectionById(i);
    var visible = visibleDirections[i];
    var color = cube.colors[i];
    
    if (!visible) {
      color = ThreeTwist.COLORLESS;
    }

    //  Each face is an object and keeps track of its original ID number
    // (which is important because its address will change with each rotation)
    //  its current color, and so on.
    this.faces[i] = {};
    this.faces[i].id = i;
    this.faces[i].color = color;

    //  We're going to keep track of what face was what at the moment of initialization,
    //  mostly for solving purposes.
    this.faces[i].solvedDirection = direction;

    //  INTROVERTED FACES.
    //  If this face has no color sticker then it must be interior to the Cube.
    //  That means in a normal state (no twisting happening) it is entirely hidden.
    this.faces[i].isIntrovert = !visible;

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
ThreeTwist.Cubelet.prototype = Object.create(THREE.Object3D.prototype);

ThreeTwist.extend( ThreeTwist.Cubelet.prototype, {
  // Nothing here for now.
  getDistanceTo: function(point) {
    var cubeletPosition = new THREE.Vector3();
    cubeletPosition.setFromMatrixPosition(this.matrix);
    return cubeletPosition.distanceTo(point); // TODO: could avoid call to Math.sqrt
  }
});