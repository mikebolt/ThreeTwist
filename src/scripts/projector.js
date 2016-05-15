/*

  PROJECTOR

  Converts mouse coordinates into 3D and detects mouse interaction

  --

  @author Mark Lundin - http://www.mark-lundin.com
  @author Michael Casebolt : retrofitted for bigcubes

*/

/*
        _________         /""""""""""""/
       /__/__/__/]     __/>>> SUP? <<</
      /__/__/__/|] --==--,,,,,,,,,,,,/
     /__/__/__/||]
    [__|__|__]/|/        - mikebolt
    [__|__|__]//
    [__|__|__]/   
*/

ThreeTwist.Projector = (function() {

  //  The Cube Projector is a specialised class that detects mouse interaction.
  //  It's designed specifically for cubic geometry, in that it makes assumptions
  //  that cannot be applied to other 3D geometry. This makes the performance faster
  //  than other more generalised mouse picking techniques.

  return function(cube, domElement) {

    var api;
    var screen;
    var viewProjectionMatrix = new THREE.Matrix4();
    var inverseMatrix = new THREE.Matrix4();
    var mouse = new THREE.Vector3();
    var end = new THREE.Vector3(1, 1, 1);
    var normal = new THREE.Vector3();
    var ray = new THREE.Ray();
    var box = new THREE.Box3();
    
    var projectionMatrixInverse = new THREE.Matrix4();

    //  Configure the Axis Aligned Bounding Box dimensions.
    box.min.set(-0.5, -0.5, -0.5);
    box.max.set(cube.order - 0.5, cube.order - 0.5, cube.order - 0.5);

    //  Utility function that unprojects 2D normalised screen coordinate to 3D.
    //  Taken from Three.js Projector class

    function unprojectVector(vector, camera) {

      projectionMatrixInverse.getInverse(camera.projectionMatrix);
      viewProjectionMatrix.multiplyMatrices(camera.matrixWorld, projectionMatrixInverse);
      return vector.applyProjection(viewProjectionMatrix);

    }

    // Returns the bounding area of the element
    function getBoundingClientRect(element) {

      var bounds = element !== document ? element.getBoundingClientRect() : {
        left: 0,
        top: 0,
        width: window.innerWidth,
        height: window.innerHeight
      };

      if(element !== document) {
        var d = element.ownerDocument.documentElement;
        bounds.left += window.pageXOffset - d.clientLeft;
        bounds.top  += window.pageYOffset - d.clientTop;
      }

      return bounds;

    }

    /*
     *  Returns a THREE.Ray instance in cube space!
     * (also sets the result on the ray property of this instance)
     */
    function setRay(camera, mouseX, mouseY) {

      //  Get the bounding area
      screen = getBoundingClientRect(domElement);

      //  Convert screen coords indo normalized device coordinate space
      mouse.x = (mouseX - screen.left) / screen.width * 2 - 1;
      mouse.y = (mouseY - screen.top) / screen.height * -2 + 1;
      mouse.z = -1.0;

      // set two vectors with opposing z values
      end.set(mouse.x, mouse.y, 1.0);

      //  Unproject screen coordinates into 3D
      unprojectVector(mouse, camera);
      unprojectVector(end, camera);

      // find direction from vector to end
      end.sub(mouse).normalize();

      //  Configure the ray caster
      ray.set(mouse, end);

      //  Apply the world inverse
      // cube.centerTransformer is used because the 'box' is only correct in its coordinate system. // nix
      inverseMatrix.getInverse(cube.object3D.matrixWorld);
      ray.applyMatrix4(inverseMatrix);

      return ray;

    }

    /*
     *  Given an intersection point on the surface of the cube,
     *   this returns a vector indicating the normal of the face
     */
    function getFaceNormalForIntersection(intersection) {

    // Cubes have the property that a point on the face of a cube is always closest to that face's
    // normal, when all normals are represented as points offset from the center of the cube.
    
      var closestSquareDistance = Infinity;
      var closestNormal = null;
      
      var centeredIntersection = new THREE.Vector3().subVectors(intersection, cube.center);
      //console.log("centeredIntersection = ", centeredIntersection);
    
      for (var directionId = 0; directionId < 6; directionId++) {
        var direction = ThreeTwist.Direction.getDirectionById(directionId);
        var normal = direction.normal;
        var squareDistance = centeredIntersection.distanceToSquared(normal);
        if (squareDistance < closestSquareDistance) {
          closestSquareDistance = squareDistance;
          closestNormal = normal;
        }
      }
      
      // Return a copy so that the caller can't mess up the normal vectors.
      return new THREE.Vector3().copy(closestNormal);
    }

    /*
     *  Given a three.js camera instance and a 2D mouse coordinates local to the domElement,
     *  this method tests for any intersection against the cube and returns a cubelet if one
     *  is found, otherwise it returns null indicating no intersection.
     */

    api = {
      // Return true if the given mouse coordinate is on the cube, false otherwise.
      // Also, optionally save the point of intersection and the containing plane.
      getIntersection: function(camera, mouseX, mouseY,
                                optionalIntersectionTarget, optionalPlaneTarget){

        var intersection = optionalIntersectionTarget || new THREE.Vector3();
        
        //  Shoot the camera ray into 3D
        setRay(camera, mouseX, mouseY);

        //  Check ray casting against the Axis Aligned Bounding Box.
        if (ray.intersectBox(box, intersection) !== null) {
          if (optionalPlaneTarget) {
            normal = getFaceNormalForIntersection(intersection); // saves result into 'normal'
            optionalPlaneTarget.setFromNormalAndCoplanarPoint(normal, intersection);
          }
          return true;
        }

        return false;
      },

      getIntersectionOnPlane: function(camera, mouseX, mouseY, plane, optionalTarget) {
        //  If we haven't detected any mouse movement, then we've not interacted!
        if (mouseX === null || mouseY === null) {
          return null;
        }

        //  Shoot the camera ray into 3D
        setRay(camera, mouseX, mouseY);

        return ray.intersectPlane(plane, optionalTarget);
      }
    };

    return api;
  };

}());