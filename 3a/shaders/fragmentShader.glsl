// set the precision of the float values (necessary if using float)
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
precision mediump int;

// define constant parameters
// EPS is for the precision issue (see precept slide)
#define INFINITY 1.0e+12
#define EPS 1.0e-3

// define constants for scene setting
#define MAX_LIGHTS 10

// define texture types
#define NONE 0
#define CHECKERBOARD 1
#define MYSPECIAL 2
#define FUR 3

// define material types
#define BASICMATERIAL 1
#define PHONGMATERIAL 2
#define LAMBERTMATERIAL 3

// define reflect types - how to bounce rays
#define NONEREFLECT 1
#define MIRRORREFLECT 2
#define GLASSREFLECT 3

struct Shape {
    int shapeType;
    vec3 v1;
    vec3 v2;
    float rad;
};

struct Material {
    int materialType;
    vec3 color;
    float shininess;
    vec3 specular;

    int materialReflectType;
    float reflectivity;
    float refractionRatio;
    int special;

};

struct Object {
    Shape shape;
    Material material;
};

struct Light {
    vec3 position;
    vec3 color;
    float intensity;
    float attenuate;
};

struct Ray {
    vec3 origin;
    vec3 direction;
};

struct Intersection {
    vec3 position;
    vec3 normal;
};

// uniform
uniform mat4 uMVMatrix;
uniform int frame;
uniform float height;
uniform float width;
uniform vec3 camera;
uniform int numObjects;
uniform int numLights;
uniform Light lights[MAX_LIGHTS];
uniform vec3 objectNorm;

varying vec2 v_position;

// find then position some distance along a ray
vec3 rayGetOffset( Ray ray, float dist ) {
    return ray.origin + ( dist * ray.direction );
}

// if a newly found intersection is closer than the best found so far, record the new intersection and return true;
// otherwise leave the best as it was and return false.
bool chooseCloserIntersection( float dist, inout float best_dist, inout Intersection intersect, inout Intersection best_intersect ) {
    if ( best_dist <= dist ) return false;
    best_dist = dist;
    best_intersect.position = intersect.position;
    best_intersect.normal   = intersect.normal;
    return true;
}

// put any general convenience functions you want up here
// ----------- STUDENT CODE BEGIN ------------
float areaOfTriangle(vec3 v1, vec3 v2, vec3 v3, vec3 norm) {
  vec3 cross1 = cross(v2 - v1, v3 - v1);
  float area1 = 0.5 * dot(cross1, norm);
  return area1;
}

// Code adapted directly from http://www.neilmendoza.com/glsl-rotation-about-an-arbitrary-axis/ as told to do so by Riley
mat4 rotationMatrix(vec3 axis, float angle)
{
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;

    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                0.0,                                0.0,                                0.0,                                1.0);
}

// Code taken from http://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl as was indicated to do so by Piazza
// Produce pseudo-random float --> [-1, 1]
float generate_random( vec3 a, float index ) {
    return fract( sin( dot( a, vec3( 12.9898, 78.233, 12.24 ) * index) ) * 53896.29349 );
}

bool pointInShadow( vec3 pos, vec3 lightVec );

float pointShadowRatio ( vec3 pos, vec3 lightVec, vec3 lightPosition ) {

  float count = 0.0;
  const int k = 8;

  for ( int i = 1; i <= k; i += 1 ) {
    for ( int j = 1; j <= k; j += 1 ) {
      // Randomly sample a new light array around an original light
      float x1 = generate_random ( pos, float (j) ) * 2.0 - 1.0;
      float x2 = generate_random ( lightVec, float (i) ) * 2.0 - 1.0;
      float sumOfSquares = x1 * x1 + x2 * x2;

      float x = 2.0 * x1 * sqrt( 1.0 - sumOfSquares );
      float y = 2.0 * x2 * sqrt( 1.0 - sumOfSquares );
      float z = 1.0 - 2.0 * sumOfSquares;

      vec3 pointNearIntersection = vec3( x, y, z ) + pos;
      vec3 newLightVec = lightPosition - pointNearIntersection;
      // vec3 newLightVec = lightPosition - pos;

      if ( pointInShadow( pos, newLightVec ) ) { count += 0.0; }
      else                                     { count += 1.0; }

    }
  }

  return count / ( float(k) * float(k) );


  //return 1.0;
}

// Code copied from https://github.com/ashima/webgl-noise/blob/master/src/noise3D.glsl as approved by assignment specs for special material implementation
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }

vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }

vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

  // Permutations
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  // Gradients: 7x7 points over a square, mapped onto an octahedron.
  // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  //Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}

// ----------- Our reference solution uses 135 lines of code.
// ----------- STUDENT CODE END ------------

// forward declaration
float rayIntersectScene( Ray ray, out Material out_mat, out Intersection out_intersect );

// Plane
// this function can be used for plane, triangle, and box
float findIntersectionWithPlane( Ray ray, vec3 norm, float dist, out Intersection intersect ) {
    float a   = dot( ray.direction, norm );
    float b   = dot( ray.origin, norm ) - dist;

    if ( a < 0.0 && a > 0.0 ) return INFINITY;

    float len = -b/a;
    if ( len < EPS ) return INFINITY;

    intersect.position = rayGetOffset( ray, len );
    intersect.normal   = norm;
    return len;
}

// Triangle
float findIntersectionWithTriangle( Ray ray, vec3 t1, vec3 t2, vec3 t3, out Intersection intersect ) {
    // ----------- STUDENT CODE BEGIN ------------
    // Find P - intersection of ray with point on triangle's plane
    // Find normal of given triangle face
    vec3 triangleVec1 = t2 - t1;
    vec3 triangleVec2 = t3 - t1;
    vec3 triangleNormal = cross(triangleVec1, triangleVec2);
    vec3 normalized_triangleNormal = normalize(triangleNormal);

    float dist = dot(normalized_triangleNormal, t1);
    float distToPlane = findIntersectionWithPlane(ray, normalized_triangleNormal, dist, intersect);
    vec3 P = intersect.position;

    // Area of triangle
    float totalTriArea = areaOfTriangle(t1, t2, t3, normalized_triangleNormal);

    // Area of subtriangles 1,2
    float area1 = areaOfTriangle(t1, t2, P, normalized_triangleNormal) / totalTriArea;
    float area2 = areaOfTriangle(t1, P, t3, normalized_triangleNormal) / totalTriArea;

    if (area1 >= 0.0 && area1 <= 1.0 && area2 >= 0.0 && area2 <= 1.0 && area1 + area2 >= 0.0 && area1 + area2 <= 1.0) { return distToPlane; }

    return INFINITY;
    // ----------- STUDENT CODE END ------------
}

// Sphere
float findIntersectionWithSphere( Ray ray, vec3 center, float radius, out Intersection intersect ) {
    // ----------- STUDENT CODE BEGIN ------------
    // ----------- Our reference solution uses 23 lines of code.

    if (frame != 0) {
    float two_PI = 3.1415926 * 2.0;
    float frameFloat = float(frame);
    frameFloat = frameFloat/ 10.0;
    float animationAngle =  mod(frameFloat, two_PI);

    float xOffset = radius * 1.2 * cos(animationAngle);
    float yOffset = radius * 1.2 * sin(animationAngle);
    float zOffset = radius * 3.0 * sin(animationAngle);
    // if (frame == 0) {
    //     return INFINITY;
    // }

    center.z = center.z + zOffset;
    center.y = center.y + yOffset;
    center.x = center.x + xOffset;
    }

    vec3 lengthToCenter = center - ray.origin;
    vec3 normalizedDirection = normalize(ray.direction);
    float tCA = dot(lengthToCenter, normalizedDirection) ;

    if (tCA < -EPS) { return INFINITY; }
    float rSquared = radius * radius;
    float dSquared = dot(lengthToCenter,lengthToCenter) - (tCA * tCA);
    if ( dSquared > rSquared ) { return INFINITY; }

    float tHC = sqrt(rSquared - dSquared);
    float t1 = tCA - tHC;
    float t2 = tCA + tHC;
    float t;
    if (t1 > EPS) { t = t1; }
    else          { t = t2; }
    intersect.position = ray.origin + (t * normalizedDirection);
    intersect.normal = normalize(intersect.position - center);

    return length(t * normalizedDirection);
    // ----------- STUDENT CODE END ------------
}

// returns an array of four vec3's which are the faces

// takes array of faces and then calculates normal and distance,
// get these two to get intersections

// check if points are on box
// compare nomals

bool isIntersectionInBox(vec3 intersectPosition, float x0, float x1, float y0 , float y1, float z0, float z1) {

    if (x0 - EPS <= intersectPosition.x  && intersectPosition.x <= x1 + EPS) {
        if (y0 - EPS <= intersectPosition.y  && intersectPosition.y <= y1 + EPS) {
            if (z0 - EPS <= intersectPosition.z  && intersectPosition.z <= z1 + EPS) {
                return true;
            }
        }
    }

    return false;
}

// Box
float findIntersectionWithBox( Ray ray, vec3 pmin, vec3 pmax, out Intersection out_intersect ) {
    // ----------- STUDENT CODE BEGIN ------------
    // pmin and pmax represent two bounding points of the box
    // pmin stores [xmin, ymin, zmin] and pmax stores [xmax, ymax, zmax]

    //normals of box
    vec3 xNorm;
    vec3 yNorm;
    vec3 zNorm;

    Intersection bestIntersect;
    Intersection challengeIntersect;

    vec3 boxCorners[2];
    boxCorners[0] = pmin;
    boxCorners[1] = pmax;

    // calculating box normals
    vec3 bigX;
    bigX.xyz = pmin.xyz;
    bigX.x = pmax.x;
    xNorm =  bigX - pmin;
    xNorm = normalize(xNorm);

    vec3 bigY;
    bigY.xyz = pmin.xyz;
    bigY.y = pmax.y;
    yNorm = bigY - pmin;
    yNorm = normalize(yNorm);

    vec3 bigZ;
    bigZ.xyz = pmin.xyz;
    bigZ.z = pmax.z;
    zNorm = bigZ - pmin;
    zNorm = normalize(zNorm);

    //normalize normals
    vec3 boxNormals[3];
    boxNormals[0] = xNorm;
    boxNormals[1] = yNorm;
    boxNormals[2] = zNorm;

    // initialzing best distance
    float bestDist = dot(boxNormals[0], pmin);

    float bestIntersectionLength = findIntersectionWithPlane(ray, boxNormals[0], bestDist, bestIntersect);

    if (isIntersectionInBox(bestIntersect.position, pmin.x, pmax.x, pmin.y, pmax.y, pmin.z, pmax.z)) {
        // do nothing
    }
    else {
        bestIntersectionLength = INFINITY;
    }

    // interates through the planes and chooses the plane with the closest intersection
    for (int i = 0; i < 3; i++) {
        // calculate distance from plane to orgin in order to get the intersection
        float challengeDist = (dot(boxNormals[i], pmin));
        // gets the updates the challenger intersect and records its length
        float challengeIntersectLength = findIntersectionWithPlane(ray, boxNormals[i], challengeDist, challengeIntersect);
        // keeps the current closest intersection

        if (isIntersectionInBox(challengeIntersect.position, pmin.x, pmax.x, pmin.y, pmax.y, pmin.z, pmax.z)) {
        chooseCloserIntersection(challengeIntersectLength, bestIntersectionLength, challengeIntersect, bestIntersect);
        }
        else {
            // do nothing
        }
    }

    for (int i = 0; i < 3; i++) {
        // calculate distance from plane to orgin in order to get the intersection
        float challengeDist = dot(boxNormals[i], pmax);
        // gets the updates the challenger intersect and records its length
        float challengeIntersectLength = findIntersectionWithPlane(ray, boxNormals[i], challengeDist, challengeIntersect);
        // keeps the current closest intersection
        if (isIntersectionInBox(challengeIntersect.position, pmin.x, pmax.x, pmin.y, pmax.y, pmin.z, pmax.z)) {
        chooseCloserIntersection(challengeIntersectLength, bestIntersectionLength, challengeIntersect, bestIntersect);
        }
        else {
            // do nothing
        }
    }

    out_intersect = bestIntersect;

    /* function that takes 3 points and then computes normal and then checks
    intersection and then checks if point is on plane. */

    // get all of the faces, calculate normals , and then return the smallest one.
    return bestIntersectionLength;
    // ----------- STUDENT CODE END ------------
}

// Cylinder
float getIntersectOpenCylinder( Ray ray, vec3 center, vec3 axis, float len, float rad, out Intersection intersect ) {
    // ----------- STUDENT CODE BEGIN ------------
    vec3 normalized_axis = normalize(axis);
    ray.direction = normalize(ray.direction);
    vec3 relativePosition = ray.origin - center;     // delta P  = (p - pa)
    float relative_p_dot_va = dot( relativePosition, normalized_axis );
    float v_dot_va = dot( ray.direction, normalized_axis );

    vec3 vec_a = ray.direction - v_dot_va * normalized_axis;
    vec3 vec_c = relativePosition - relative_p_dot_va * normalized_axis;

    float a = dot( vec_a, vec_a );
    float b = 2.0 * dot( vec_a, vec_c );
    float c = dot( vec_c, vec_c ) - ( rad * rad );

    float discriminant = (b*b) - (4.0 * a * c);

    if ( discriminant < EPS) {
        return INFINITY;
    }

    // a(t^2) + b(t) + c = 0 <-- Use quadratic equation
    float t;
    float t1 = ( -b + sqrt( b * b - 4.0 * a * c) ) / ( 2.0 * a );
    float t2 = ( -b - sqrt( b * b - 4.0 * a * c) ) / ( 2.0 * a );

    if ( t1 < EPS && t2 < EPS ) { return INFINITY; }
    else if ( t2 >= EPS)        { t = t2; }
    else                        { t = t1; }

    intersect.position = ray.origin + ray.direction * t;

    Ray normalRay;
    normalRay.origin = center;
    normalRay.direction = normalized_axis;
    float projectionLength = dot(intersect.position - center, normalized_axis );

    intersect.normal = normalize( intersect.position -rayGetOffset( normalRay, projectionLength ));

    vec3 dist = intersect.position - ray.origin;
    float relativeDistance = length(dist);

    vec3 cylinderBottomCenter = center;
    vec3 cylinderTopCenter = center + normalized_axis*len;

    float bottomLimit = dot( normalized_axis, intersect.position - cylinderBottomCenter);
    float topLimit = dot(normalized_axis, intersect.position - cylinderTopCenter);
    if (bottomLimit < EPS) {
        return INFINITY;
    }
    if (topLimit > -EPS) {
        return INFINITY;
    }

    return relativeDistance;

    // ----------- Our reference solution uses 31 lines of code.
    //return INFINITY; // currently reports no intersection
    // ----------- STUDENT CODE END ------------
}

float getIntersectDisc( Ray ray, vec3 center, vec3 norm, float rad, out Intersection intersect ) {
    // ----------- STUDENT CODE BEGIN ------------

    // Find P - intersection of ray with point on triangle's plane
    // Find normal of given triangle face

    vec3 normalized_norm = normalize(norm);

    float dist = dot(normalized_norm, center);
    float distToPlane = findIntersectionWithPlane(ray, normalized_norm, dist, intersect);
    float relativeDistance = distance(intersect.position, center);

    if (relativeDistance < rad) {
        return distToPlane;
    }
    // ----------- Our reference solution uses 15 lines of code.
    return INFINITY; // currently reports no intersection
    // ----------- STUDENT CODE END ------------
}

float findIntersectionWithCylinder( Ray ray, vec3 center, vec3 apex, float radius, out Intersection out_intersect ) {
    vec3 axis = apex - center;
    float len = length( axis );
    axis = normalize( axis );

    Intersection intersect;
    float best_dist = INFINITY;
    float dist;

    // -- infinite cylinder
    dist = getIntersectOpenCylinder( ray, center, axis, len, radius, intersect );
    chooseCloserIntersection( dist, best_dist, intersect, out_intersect );

    // -- two caps
    dist = getIntersectDisc( ray, center, axis, radius, intersect );
    chooseCloserIntersection( dist, best_dist, intersect, out_intersect );
    dist = getIntersectDisc( ray,   apex, axis, radius, intersect );
    chooseCloserIntersection( dist, best_dist, intersect, out_intersect );

    return best_dist;
}

// Cone
float getIntersectOpenCone( Ray ray, vec3 apex, vec3 axis, float len, float radius, out Intersection intersect ) {
    // ----------- STUDENT CODE BEGIN ------------
    // ----------- Our reference solution uses 31 lines of code.
    axis = normalize(axis);
    ray.direction = normalize(ray.direction);

    vec3 center = apex + (len * axis);
    float angleAlpha = atan(radius/len);

    vec3 normalized_axis = normalize(axis);

    ray.direction = normalize(ray.direction);
    vec3 relativePosition = ray.origin - apex;     // delta P  = (p - pa)
    float relative_p_dot_va = dot( relativePosition, normalized_axis );
    float v_dot_va = dot( ray.direction, normalized_axis );

    vec3 vec_a = ray.direction - v_dot_va * normalized_axis;
    vec3 vec_c = relativePosition - relative_p_dot_va * normalized_axis;

    float cylinderA = dot( vec_a, vec_a );
    float cylinderB = 2.0 * dot( vec_a, vec_c );
    float cylinderc = dot( vec_c, vec_c ) - ( radius * radius );

    float cosSquaredAlpha = cos(angleAlpha) * cos(angleAlpha);
    float sinSquaredAlpha = sin(angleAlpha) * sin(angleAlpha);

    float a = (cosSquaredAlpha * cylinderA) - (sinSquaredAlpha * v_dot_va * v_dot_va);
    float b = (cosSquaredAlpha * cylinderB) - (2.0 * sinSquaredAlpha * v_dot_va * relative_p_dot_va);
    float c = cosSquaredAlpha * dot(vec_c, vec_c) - sinSquaredAlpha * relative_p_dot_va * relative_p_dot_va;

    float discriminant = (b*b) - (4.0 * a * c);

    if ( discriminant < EPS) {
        return INFINITY;
    }

    // a(t^2) + b(t) + c = 0 <-- Use quadratic equation
    float t;
    float t1 = ( -b + sqrt( b * b - 4.0 * a * c) ) / ( 2.0 * a );
    float t2 = ( -b - sqrt( b * b - 4.0 * a * c) ) / ( 2.0 * a );

    if ( t1 < EPS && t2 < EPS ) {
        return INFINITY;
    }
    else if ( t2 >= EPS) {
        t = t2;
    }
    else {
     t = t1;
    }

    intersect.position = ray.origin + ray.direction * t;

    vec3 pointE = intersect.position - apex;
    intersect.normal = normalize(pointE - length(pointE) / cos(angleAlpha) * axis);

    vec3 dist = intersect.position - ray.origin;
    float relativeDistance = length(dist);

    vec3 cylinderBottomCenter = center;
    vec3 cylinderTopCenter = center - normalized_axis*len;

    float coneLimit = dot(intersect.position - apex, axis);

    if (coneLimit < EPS) { return INFINITY; }

    if (coneLimit > len) { return INFINITY; }
    return relativeDistance;

    //return INFINITY; // currently reports no intersection
    // ----------- STUDENT CODE END ------------
}

float findIntersectionWithCone( Ray ray, vec3 center, vec3 apex, float radius, out Intersection out_intersect ) {
    vec3 axis   = center - apex;
    float len   = length( axis );
    axis = normalize( axis );

    // -- infinite cone
    Intersection intersect;
    float best_dist = INFINITY;
    float dist;

    // -- infinite cone
    dist = getIntersectOpenCone( ray, apex, axis, len, radius, intersect );
    chooseCloserIntersection( dist, best_dist, intersect, out_intersect );

    // -- caps
    dist = getIntersectDisc( ray, center, axis, radius, intersect );
    chooseCloserIntersection( dist, best_dist, intersect, out_intersect );

    return best_dist;
}

#define MAX_RECURSION 8

vec3 calculateSpecialDiffuseColor( Material mat, vec3 posIntersection, vec3 normalVector ) {

    if ( mat.special == CHECKERBOARD ) {
        vec3 zAxis = vec3(0.0, 0.0, 1.0);
        vec3 normalizedAxis = cross(normalVector, zAxis);
        float angle = acos( dot(normalizedAxis, normalVector) );
        mat4 rotationMatrix = rotationMatrix(normalizedAxis, angle);

        vec4 oldCoordinates = vec4(posIntersection, 0.0);
        vec4 newCoordinates = oldCoordinates * rotationMatrix;
        float x = floor(newCoordinates.x);
        float y = floor(newCoordinates.y);
        float total = x + y;
        bool isEven = mod(total, 2.0) < EPS;

        vec3 blackColor = 0.5 * mat.color;
        vec3 whiteColor = 1.0 * mat.color;

        if (isEven) { return blackColor; }
        else        { return whiteColor; }
    }

    else if ( mat.special == MYSPECIAL ) {
        return snoise( posIntersection ) * mat.color;
    }

    else if ( mat.special == FUR ) {

      float furDensity = 5.0;

      vec3 zAxis = vec3(0.0, 0.0, 1.0);
      vec3 normalizedAxis = cross(normalVector, zAxis);
      float angle = acos( dot(normalizedAxis, normalVector) );
      mat4 rotationMatrix = rotationMatrix(normalizedAxis, angle);

      vec4 oldCoordinates = vec4(posIntersection, 0.0);
      vec4 newCoordinates = oldCoordinates * rotationMatrix;
      float x = floor(newCoordinates.x);
      float y = floor(newCoordinates.y);
      float total = x + y;
      bool isEven = mod(total, 2.0 * furDensity) < EPS;

      vec3 blackColor = 0.5 * mat.color;
      vec3 whiteColor = 1.0 * mat.color;

      if (isEven) { return blackColor; }
      else        { return whiteColor; }

        // for ( int i = 0; i < furDensity; i++ ) {
        //     float x = ;
        //     float y = ;
        //     outputColor += getLightContribution( lights[i], mat, posIntersection, normalVector, eyeVector, phongOnly, diffuseColor );
        // }
    }

    return mat.color; // special materials not implemented. just return material color.
    // ----------- STUDENT CODE END ------------
}

vec3 calculateDiffuseColor( Material mat, vec3 posIntersection, vec3 normalVector ) {
    // Special colors
    if ( mat.special != NONE ) {
        return calculateSpecialDiffuseColor( mat, posIntersection, normalVector );
    }
    return vec3( mat.color );
}

// check if position pos in in shadow with respect to a particular light.
// lightVec is the vector from that position to that light
bool pointInShadow( vec3 pos, vec3 lightVec ) {
    // ----------- STUDENT CODE BEGIN ------------

    // FOR HARD SHADOWS
    Ray ray;
    ray.origin    = pos;
    ray.direction = normalize( lightVec );

    Material out_mat;
    Intersection out_intersect;
    float hitLength = rayIntersectScene( ray, out_mat, out_intersect );

    float distanceToIntersection = length(out_intersect.position - pos);

    if ( hitLength > -EPS && hitLength < length(lightVec) - EPS ) { return true; }

    // ----------- Our reference solution uses 10 lines of code.
    return false;
    // ----------- STUDENT CODE END ------------
}

vec3 getLightContribution( Light light, Material mat, vec3 posIntersection, vec3 normalVector, vec3 eyeVector, bool phongOnly, vec3 diffuseColor ) {

    vec3 lightVector = light.position - posIntersection;

    // For calculation of soft shadows
   float pointShadowRatio = pointShadowRatio( posIntersection, lightVector, light.position ) ;

    // For hard shadows
    if ( pointInShadow( posIntersection, lightVector ) ) { return vec3( 0.0, 0.0, 0.0 ); }

    if ( mat.materialType == PHONGMATERIAL || mat.materialType == LAMBERTMATERIAL ) {
        vec3 contribution = vec3( 0.0, 0.0, 0.0 );

        // get light attenuation
        float dist = length( lightVector );
        float attenuation = light.attenuate * dist * dist;

        float diffuseIntensity = max( 0.0, dot( normalVector, lightVector ) ) * light.intensity;

        // glass and mirror objects have specular highlights but no diffuse lighting
        if ( !phongOnly ) {
            contribution += diffuseColor * diffuseIntensity * light.color / attenuation;
        }

        if ( mat.materialType == PHONGMATERIAL ) {
            // ----------- STUDENT CODE BEGIN ------------

            // Specular reflection --> angle alpha --> angle for reflected ray to eyeVector ray
            vec3 reflectionVector = reflect( lightVector, normalVector );
            vec3 normalized_reflectionVector  = normalize( reflectionVector );
            vec3 normalized_eyeVector         = normalize( eyeVector );
            float cos_alpha = dot( normalized_eyeVector, normalized_reflectionVector );

            float specularIntensity = pow( cos_alpha, mat.shininess ) * light.intensity;
            vec3 phongTerm = 50.0 * specularIntensity * light.color / attenuation;

            //vec3 phongTerm = vec3( 0.0, 0.0, 0.0 ); // not implemented yet, so just add black
            // ----------- Our reference solution uses 10 lines of code.
            // ----------- STUDENT CODE END ------------
            contribution += phongTerm;
        }

        // return contribution * pointShadowRatio;
        return contribution;
    }
    else {
        // return diffuseColor * pointShadowRatio;
        return diffuseColor;
    }

}

vec3 calculateColor( Material mat, vec3 posIntersection, vec3 normalVector, vec3 eyeVector, bool phongOnly ) {
    vec3 diffuseColor = calculateDiffuseColor( mat, posIntersection, normalVector );

    vec3 outputColor = vec3( 0.0, 0.0, 0.0 ); // color defaults to black when there are no lights

    for ( int i=0; i<MAX_LIGHTS; i++ ) {

        if( i>=numLights ) break; // because GLSL will not allow looping to numLights

        outputColor += getLightContribution( lights[i], mat, posIntersection, normalVector, eyeVector, phongOnly, diffuseColor );
    }

    return outputColor;
}

// find reflection or refraction direction ( depending on material type )
vec3 calcReflectionVector( Material material, vec3 direction, vec3 normalVector, bool isInsideObj ) {
    if( material.materialReflectType == MIRRORREFLECT ) {
        return reflect( direction, normalVector );
    }
    // the material is not mirror, so it's glass.
    // compute the refraction direction...

    // ----------- STUDENT CODE BEGIN ------------
    // see lecture 13 slide ( lighting ) on Snell's law
    // the eta below is eta_i/eta_r
    float eta = ( isInsideObj ) ? 1.0 / material.refractionRatio : material.refractionRatio;
    // ----------- Our reference solution uses 11 lines of code.
    return refract( direction, normalVector, eta );
    //return reflect( direction, normalVector ); // return mirror direction so you can see something
    // ----------- STUDENT CODE END ------------
}

vec3 traceRay( Ray ray ) {
    Material hitMaterial;
    Intersection intersect;

    vec3 resColor  = vec3( 0.0, 0.0, 0.0 );
    vec3 resWeight = vec3( 1.0, 1.0, 1.0 );

    bool isInsideObj = false;

    for ( int depth = 0; depth < MAX_RECURSION; depth++ ) {

        float hit_length = rayIntersectScene( ray, hitMaterial, intersect );

        if ( hit_length < EPS || hit_length >= INFINITY ) break;

        vec3 posIntersection = intersect.position;
        vec3 normalVector    = intersect.normal;

        vec3 eyeVector = normalize( ray.origin - posIntersection );
        if ( dot( eyeVector, normalVector ) < 0.0 )
            { normalVector = -normalVector; isInsideObj = true; }
        else isInsideObj = false;

        bool reflective = ( hitMaterial.materialReflectType == MIRRORREFLECT ||
                            hitMaterial.materialReflectType == GLASSREFLECT );
        vec3 outputColor = calculateColor( hitMaterial, posIntersection, normalVector, eyeVector, reflective );

        float reflectivity = hitMaterial.reflectivity;

        // check to see if material is reflective ( or refractive )
        if ( !reflective || reflectivity < EPS ) {
            resColor += resWeight * outputColor;
            break;
        }

        // bounce the ray
        vec3 reflectionVector = calcReflectionVector( hitMaterial, ray.direction, normalVector, isInsideObj );
        ray.origin = posIntersection;
        ray.direction = normalize( reflectionVector );

        // add in the color of the bounced ray
        resColor += resWeight * outputColor;
        resWeight *= reflectivity;
    }

    return resColor;
}

void main( ) {
    float cameraFOV = 0.8;
    vec3 direction = vec3( v_position.x * cameraFOV * width/height, v_position.y * cameraFOV, 1.0 );

    Ray ray;
    ray.origin    = vec3( uMVMatrix * vec4( camera, 1.0 ) );
    ray.direction = normalize( vec3( uMVMatrix * vec4( direction, 0.0 ) ) );

    // trace the ray for this pixel
    vec3 res = traceRay( ray );

    // paint the resulting color into this pixel
    gl_FragColor = vec4( res.x, res.y, res.z, 1.0 );
}
