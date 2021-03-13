precision highp int;
precision highp float;

precision highp int;
precision highp float;

#define FLOAT_MAX  1.70141184e38
#define FLOAT_MIN  1.17549435e-38
#define MAX_INT    65536

lowp vec4 encodeFloat(highp float v) {
  highp float av = abs(v);
  
  //Handle special cases
  if(av < FLOAT_MIN) {
    return vec4(0.0, 0.0, 0.0, 0.0);
  } else if(v > FLOAT_MAX) {
    return vec4(127.0, 128.0, 0.0, 0.0) / 255.0;
  } else if(v < -FLOAT_MAX) {
    return vec4(255.0, 128.0, 0.0, 0.0) / 255.0;
  }
  
  highp vec4 c = vec4(0,0,0,0);
  
  //Compute exponent and mantissa
  highp float e = floor(log2(av));
  highp float m = av * pow(2.0, -e) - 1.0;
  
  //Unpack mantissa
  c[1] = floor(128.0 * m);
  m -= c[1] / 128.0;
  c[2] = floor(32768.0 * m);
  m -= c[2] / 32768.0;
  c[3] = floor(8388608.0 * m);
  
  //Unpack exponent
  highp float ebias = e + 127.0;
  c[0] = floor(ebias / 2.0);
  ebias -= c[0] * 2.0;
  c[1] += floor(ebias) * 128.0; 

  //Unpack sign bit
  c[0] += 128.0 * step(0.0, -v);

  //Scale back to range
  return (c / 255.0).abgr;
}

vec4 getPoint(in sampler2D tex, in vec2 dimensions, in float index) {
  vec2 uv = (
	     vec2(
		  floor(mod(index, dimensions.x)),
		  floor(index / dimensions.x)) + 0.5
	     ) / dimensions;
  return texture2D(tex, uv).rgba;
}

vec4 get_point(in sampler2D tex, in vec2 dimensions, in float index) {
  vec2 uv = (
	     vec2(
		  floor(mod(index, dimensions.x)),
		  floor(index / dimensions.x)) + 0.5
	     ) / dimensions;
  return texture2D(tex, uv).rgba;
}


#define FLOAT_MAX  1.70141184e38
#define FLOAT_MIN  1.17549435e-38

lowp vec4 encode_float(highp float v) {
  highp float av = abs(v);
  
  //Handle special cases
  if(av < FLOAT_MIN) {
    return vec4(0.0, 0.0, 0.0, 0.0);
  } else if(v > FLOAT_MAX) {
    return vec4(127.0, 128.0, 0.0, 0.0) / 255.0;
  } else if(v < -FLOAT_MAX) {
    return vec4(255.0, 128.0, 0.0, 0.0) / 255.0;
  }
  
  highp vec4 c = vec4(0,0,0,0);
  
  //Compute exponent and mantissa
  highp float e = floor(log2(av));
  highp float m = av * pow(2.0, -e) - 1.0;
  
  //Unpack mantissa
  c[1] = floor(128.0 * m);
  m -= c[1] / 128.0;
  c[2] = floor(32768.0 * m);
  m -= c[2] / 32768.0;
  c[3] = floor(8388608.0 * m);
  
  //Unpack exponent
  highp float ebias = e + 127.0;
  c[0] = floor(ebias / 2.0);
  ebias -= c[0] * 2.0;
  c[1] += floor(ebias) * 128.0; 

  //Unpack sign bit
  c[0] += 128.0 * step(0.0, -v);

  //Scale back to range
  return (c / 255.0).abgr;
}

float earthRadius = 6371008.8;

float earth_distance (float lon1, float lat1, float lon2, float lat2) {
    float dLat = radians(lat2 - lat1);
    float dLon = radians(lon2 - lon1);

    lat1 = radians(lat1);
    lat2 = radians(lat2);

    float a = pow(sin(dLat / 2.0), 2.0) + pow(sin(dLon / 2.0), 2.0) * cos(lat1) * cos(lat2);

    return 2.0 * atan(sqrt(a), sqrt(1.0 - a)) * earthRadius;
}

float lengthtoradians(float dist){
    return dist / earthRadius;
}

float area(float a, float b, float c){
  float s = (a + b + c) / 2.0;
  return sqrt(s * (s - a) * (s - b) * (s - c));
}

vec2 destination (float lon1, float lat1, float dist, float bearing){
  lon1 = radians(lon1);
  lat1 = radians(lat1);
  
  bearing   = radians(bearing);
  float rad = lengthtoradians(dist);
  
  float lat2 = asin(sin(lat1) * cos(rad) + cos(lat1) * sin(rad) * cos(bearing));
  float lon2 = lon1 + atan(sin(bearing) * sin(rad) * cos(lat1), cos(rad) - sin(lat1) * sin(lat2));
  
  return vec2(degrees(lon2), degrees(lat2));
} 

float bearing (float lon1, float lat1, float lon2, float lat2) {

    lon1 = radians(lon1);
    lat1 = radians(lat1);

    lon2 = radians(lon2);
    lat2 = radians(lat2);
    
    float aT = sin(lon2 - lon1) * cos(lat2);
    float bT = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(lon2 - lon1);

    return degrees(atan(aT, bT));
}


vec2 intersect_point (float x1, float y1, float x2, float y2, float x3, float y3, float x4, float y4) { 
  vec2 FALSE = vec2(FLOAT_MAX, FLOAT_MIN);
  
  float denom = ((y4 - y3) * (x2 - x1)) - ((x4 - x3) * (y2 - y1));
  float numeA = ((x4 - x3) * (y1 - y3)) - ((y4 - y3) * (x1 - x3));
  float numeB = ((x2 - x1) * (y1 - y3)) - ((y2 - y1) * (x1 - x3));
  
  if (denom == 0.0) { if (numeA == 0.0 && numeB == 0.0) { return FALSE; } return FALSE; }
  
  float uA = numeA / denom;
  float uB = numeB / denom;
  
  if (uA >= 0.0 && uA <= 1.0 && uB >= 0.0 && uB <= 1.0) {
    float x = x1 + (uA * (x2 - x1));
    float y = y1 + (uA * (y2 - y1));
    return vec2(x, y);
  }
  return FALSE;
}


bool line_intersect (float x1, float y1, float x2, float y2, float x3, float y3, float x4, float y4) { 
  float denom = ((y4 - y3) * (x2 - x1)) - ((x4 - x3) * (y2 - y1));
  float numeA = ((x4 - x3) * (y1 - y3)) - ((y4 - y3) * (x1 - x3));
  float numeB = ((x2 - x1) * (y1 - y3)) - ((y2 - y1) * (x1 - x3));
  
  if (abs(denom) < 0.00000001) { if (abs(numeA) < 0.00000001 && abs(numeB) < 0.00000001) { return false; } return false; }
  
  float uA = numeA / denom;
  float uB = numeB / denom;
  
  if (uA >= 0.0 && uA <= 1.0 && uB >= 0.0 && uB <= 1.0) {
    return true;
  }
  return false;
}


vec2 nearest_point_on_line(float ax, float ay, float bx, float by, float cx, float cy) {
  float ab = earth_distance(ax, ay, bx, by);
  float ac = earth_distance(ax, ay, cx, cy);

  float bearing = bearing(bx, by, cx, cy);
  float hd = ab > ac ? ab : ac;
  
  vec2 p1 = destination(ax, ay, hd, bearing + 90.0);
  vec2 p2 = destination(ax, ay, hd, bearing - 90.0);

  bool ib = line_intersect(p1.x, p1.y, p2.x, p2.y, bx, by, cx, cy);
  vec2 ip = intersect_point(p1.x, p1.y, p2.x, p2.y, bx, by, cx, cy);

  if (ib) {
    return intersect_point(p1.x, p1.y, p2.x, p2.y, bx, by, cx, cy);
  } else {
    return ab <= ac ? vec2(bx, by) : vec2(cx, cy);
  }
}

float distance_to_segment(float px, float py, float ax, float ay, float bx, float by) {
    vec2 v = vec2(bx - ax,  by - ay);
    vec2 w = vec2(px - ax,  py - ay);
    
    float c1 = dot(w, v);

    if (c1 <= 0.0) { return earth_distance(px, py, ax, ay); }

    float c2 = dot(v, v);

    if (c2 <= c1) { return earth_distance(px, py, bx, by); }

    float b2 = c1 / c2;

    vec2 Pb = vec2(ax + (b2 * v.x), ay + (b2 * v.y));

    return earth_distance(px, py, Pb.x, Pb.y);
}


uniform sampler2D points_data;
uniform vec2      points_dimensions; 

uniform sampler2D legs_data;
uniform vec2      legs_dimensions;

void main(void) {
  // ------------------------------------------------------------------------------
  // leg points on the x axis makes it easier to search for minimumns in results
  // ------------------------------------------------------------------------------
  float min_distance = FLOAT_MAX;
  float brng;
  float leg_no;
  float dist_on_leg;
  vec2 closest_point;
  
  int   r = int(legs_dimensions.x);

  for(int i = 0; i < MAX_INT; ++i){
    if (!(i < r)) { break; }

    vec4  leg   = get_point(legs_data,   legs_dimensions,   float(i));
    vec4  point = get_point(points_data, points_dimensions, float(gl_FragCoord.y));

    vec2  c = nearest_point_on_line(point.x, point.y, leg.r, leg.g, leg.b, leg.a);

    float b = bearing(point.x, point.y, c.x, c.y);

    float d = earth_distance(point.x, point.y, c.x, c.y);
    float m = distance_to_segment(point.x, point.y, leg.r, leg.g, leg.b, leg.a);

    float a = earth_distance(leg.r, leg.g, c.x, c.y);

    float f = min(m, d);

    if (min_distance > f) {
      min_distance  = f;
      closest_point = c;
      leg_no        = float(i);
      dist_on_leg   = a;
      brng          = b;
    };
  }
  
  if (gl_FragCoord.x-0.5 == 0.0) {
    gl_FragColor = encode_float(min_distance);
  } else if (gl_FragCoord.x-0.5 == 1.0) {
    gl_FragColor = encode_float(closest_point.x);
  } else if (gl_FragCoord.x-0.5 == 2.0) {    
    gl_FragColor = encode_float(closest_point.y);
  } else if (gl_FragCoord.x-0.5 == 3.0) {
    gl_FragColor = encode_float(leg_no);
  } else if (gl_FragCoord.x-0.5 == 4.0) {
    gl_FragColor = encode_float(dist_on_leg);
  } else if (gl_FragCoord.x-0.5 == 5.0) {
    gl_FragColor = encode_float(brng);
  }
}
