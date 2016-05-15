/*

  INTERACTION

  This module handles all the user interactions with the cube.
  It figures out what slice to rotate and in what direction.

  --

  @author Mark Lundin - http://www.mark-lundin.com
  @author Stewart Smith
  @author Michael Casebolt : retrofitted for bigcubes

*/

ThreeTwist.Interaction = function(cube, camera, domElement, dragSpeed, multiDrag) {

  //  A utility class for calculating mouse intersection on a cubic surface
  var projector = new ThreeTwist.Projector(cube, domElement);

  var intersection = new THREE.Vector3(); // Stores the starting point of the interaction.
  var cubelet;
  var twist;
  var mouseX, mouseY;
  var pointOnPlane = new THREE.Vector3();
  var axisDefined = false;
  var plane = new THREE.Plane();
  var direction = new THREE.Vector3();
  var cross = new THREE.Vector3();
  var current = new THREE.Vector2();
  var axis = new THREE.Vector3();
  var angle = 0;
  var time = 0;

  current.x = undefined;
  current.y = undefined;

  // API
  var api = {

    //  A boolean indicating when the user is interacting
    active: false,

    //  A boolean that turns on/off the api
    enabled: true,

    //  A boolean flag that, when enabled, allows the user to drag a slice on its other axis
    multiDrag : false,

    //  A boolean flag that, when enabled, allows the user to drag a slice on its other axis
    multiDragSnapArea: 100.0,

    //  This sets the default drag speed.
    dragSpeed : 2.0 // not sure

  };

  // Apply event skills to the api
  THREE.EventDispatcher.prototype.apply(api);

  //  This function provides a way to 'snap' a vector to its closest axis.
  //  This is used to find a probable axis of rotation when a user performs a drag.
  function snapVectorToBasis(vector) {
    // Copied from a similar function in projector.js
    // TODO: refactor into a common utility method.
    
    var closestSquareDistance = Infinity;
    var closestNormal = null;
  
    for (var directionId = 0; directionId < 6; directionId++) {
      var direction = ThreeTwist.Direction.getDirectionById(directionId);
      var normal = direction.normal;
      var squareDistance = vector.distanceToSquared(normal);
      if (squareDistance < closestSquareDistance) {
        closestSquareDistance = squareDistance;
        closestNormal = normal;
      }
    }
    
    // Return a copy so that the caller can't mess up the normal vectors.
    return new THREE.Vector3().copy(closestNormal);
  }
  
  function determineTwist(cubelet, axis) {
    //  From the axis aligned vector, we can isolate the correct slice to rotate.
    var possibleTwists = cube.getTwistsAffectingCubelet(cubelet); // [x, y, z]
    if (Math.abs(axis.x|0) === 1) {
      return possibleTwists[0];
    }
    else if (Math.abs(axis.y|0) === 1) {
      return possibleTwists[1];
    }
    else if (Math.abs(axis.z|0) === 1) {
      return possibleTwists[2];
    }
  }

  api.update = function() {

    var x = current.x;
    var y = current.y;

    // mouse, finger, stylus, wii-mote, same thing.
    var mouseMoved = (x !== undefined && mouseX !== x) || (y !== undefined && mouseY !== y);
    
    if (api.enabled && api.active && mouseMoved) {

      //  As we already know what plane, or face, the interaction began on,
      //  we can then find the point on the plane where the interaction continues.
      projector.getIntersectionOnPlane(camera, x, y, plane, pointOnPlane);

      direction.subVectors(pointOnPlane, intersection);

      if (!axisDefined && direction.length() > 0.05) { // 0.01 is 1% of a cubelet.
        //console.log("direction:", direction);
        //  Once we have a plane, we can figure out what direction the user dragged
        //  and lock into an axis of rotation
        axis.crossVectors(plane.normal, direction);
        axisDefined = true;
        
        //console.log("axis: ", axis);

        //  Of course, it's never a perfect gesture, so we should figure
        //  out the intended direction by snapping to the nearest axis.
        axis = snapVectorToBasis(axis);
        //console.log("axis (snapped):", axis);
        
        twist = determineTwist(cubelet, axis);
        
        //console.log("new interactive twist is: ", twist);

        // Determine the cross vector, or the direction relative to the axis we're rotating
        cross.crossVectors(axis, plane.normal).normalize();
      }

      if (axisDefined) {
        //  By now, we already know what axis to rotate on,
        //  we just need to figure out by how much.
        // Basically, project the mouse delta onto the "sliding axis"
        direction.subVectors(pointOnPlane, intersection);
        var dot = cross.dot(direction);

        angle = dot / cube.order * api.dragSpeed;
        
        // If the base's axis is opposite the calculated axis, then negate the angle.
        // The problem is that 'angle' is always initially positive, because it uses the
        // initial direction to figure out the axis. Sometimes the initial angle needs
        // to be negative. This happens when the chosen axis is opposite the base's normal.
        var twistBaseAxis = ThreeTwist.Direction.getDirectionByInitial(twist.base).normal;
        if ((twistBaseAxis.x === -1 && axis.x === 1) ||
            (twistBaseAxis.x === 1 && axis.x === -1) ||
            (twistBaseAxis.y === -1 && axis.y === 1) ||
            (twistBaseAxis.y === 1 && axis.y === -1) ||
            (twistBaseAxis.z === -1 && axis.z === 1) ||
            (twistBaseAxis.z === 1 && axis.z === -1)) {
          angle *= -1;
        }
        
        // Slices with bases on a negative axis also require angle inversion.
        // Even with the above fix, a clockwise turn about +x still needs to result in a negative
        // 'amount' for a twist with an 'l' base.
        if (twist.base === 'l' || twist.base === 'd' || twist.base === 'b') {
          angle *= -1;
        }
        
        twist.amount = angle / (Math.PI / 2);
        cube.partialTwist(twist);
      }

    }

  };

  function onInteractStart(event) {

    var isMainMouseButton = event.button === 0;
    if (api.enabled && isMainMouseButton) {

      mouseX = (event.touches && event.touches[0] || event).clientX;
      mouseY = (event.touches && event.touches[0] || event).clientY;

      //  Here we find out if the mouse is hovering over the cube,
      //  If it is, then `intersection` is populated with the 3D local coordinates of where
      //  the intersection occurred. `plane` is also configured to represent the face of the cube
      //  where the intersection occurred. This is used later to determine the direction
      //  of the drag.

      //  ( Note: although a plane is conceptually similar to a cube's face,
      //   the plane is a mathematical representation )

      intersected = projector.getIntersection(camera, mouseX, mouseY, intersection, plane);
      //console.log("intersected = ", intersected); // TODO remove
      //console.log("plane normal: ", plane.normal);
      //console.log("intersection point: ", intersection);
      
      // The 'getIntersection' function will return true iff the pointer is "on top of" the cube.
      if (intersected) {

        //  If an interaction happens within the cube we should prevent the event bubbling.
        // TODO: is if statement necessary?
        if (event.touches !== null) {
          event.preventDefault();
        }

        // If the cube is tweening, wait until it finishes before allowing furhter interaction.
        if (!cube.isTweening) { // TODO: roll this into top level if statement

          // Save the start time of this interaction.
          // This is used later to calculate the "velocity" of the interaction.
          time = typeof window !== 'undefined' && window.performance !== undefined &&
            window.performance.now !== undefined ? window.performance.now() : Date.now();

          api.active = true;

          //  Now we know the point of intersection,
          //  we can figure out what the associated cubelet is.
          cubelet = cube.getCubeletClosestToPoint(intersection);
          //console.log("closest cubelet: " + cubelet.id);

          stopListeningForStartOfInteraction();
          startListeningForMovement();
          startListeningForEndOfInteraction();

        }

      }

    }

  }

  function onInteractUpdate(event) {

    if (api.active) {
      current.x = (event.touches && event.touches[0] || event).clientX;
      current.y = (event.touches && event.touches[0] || event).clientY;
    }

    // Prevent the default system dragging behaviour. ( Things like IOS move the viewport )
    if (api.enabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

  }

  function onInteractEnd(event) {

    var x = (event.touches && event.touches[0] || event).clientX;
    var y = (event.touches && event.touches[0] || event).clientY;

    // The user is no longer interacting with the cube.
    api.active = false;

    //  When a user has finished interacting, we need to finish off any rotation.
    //  We basically snap to the nearest face and issue a rotation command.

    if (api.enabled && (x !== mouseY || y !== mouseY) && axisDefined) {

      if (event.touches !== null) {
        event.preventDefault();
      }

      //  We then find the nearest rotation to snap to and calculate how long the rotation
      //  should take based on the distance between our current rotation and the target rotation.
      var targetAngle = Math.round(angle / (Math.PI / 2.0)) * (Math.PI / 2.0);

      var velocityOfInteraction = direction.length() /
        ( ( typeof window !== 'undefined' && window.performance !== undefined &&
        window.performance.now !== undefined ? window.performance.now() : Date.now() ) - time );

      // Do a double twist if it's *extreme*.
      if (velocityOfInteraction > 0.3) {
        targetAngle += cross.dot(direction.normalize()) > 0 ? Math.PI * 0.5 : 0;
      }
      
      twist.amount = Math.round(targetAngle / (Math.PI / 2));
      cube.animateTwist(twist, angle / (Math.PI / 2) * 90);
    }

    time = 0;
    current.x = undefined;
    current.y = undefined;
    axisDefined = false;
    twist = undefined;
    
    stopListeningForMovement();
    stopListeningForEndOfInteraction();
    startListeningForStartOfInteraction();
    
  }
  
  function startListeningForMovement() {
    domElement.addEventListener('mousemove', onInteractUpdate);
    domElement.addEventListener('touchmove', onInteractUpdate);
  }
  
  function stopListeningForMovement() {
    domElement.removeEventListener('mousemove', onInteractUpdate);
    domElement.removeEventListener('touchmove', onInteractUpdate);
  }
  
  function startListeningForStartOfInteraction() {
    domElement.addEventListener('mousedown', onInteractStart);
    domElement.addEventListener('touchstart', onInteractStart);
  }
  
  function stopListeningForStartOfInteraction() {
    domElement.removeEventListener('mousedown', onInteractStart);
    domElement.removeEventListener('touchstart', onInteractStart);
  }
  
  function startListeningForEndOfInteraction() {
    domElement.addEventListener('mouseup', onInteractEnd);
    domElement.addEventListener('touchend', onInteractEnd);
    domElement.addEventListener('touchcancel', onInteractEnd);
  }
  
  function stopListeningForEndOfInteraction() {
    domElement.removeEventListener('mouseup', onInteractEnd);
    domElement.removeEventListener('touchend', onInteractEnd);
    domElement.removeEventListener('touchcancel', onInteractEnd);
  }

  startListeningForStartOfInteraction();

  return api;

};
