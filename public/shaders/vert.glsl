varying vec2 pos;

attribute vec2 position;
attribute vec2 texture;

void main(void) {
    pos = texture;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
