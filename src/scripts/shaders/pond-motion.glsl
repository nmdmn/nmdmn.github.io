uniform vec4 uMusicChord;
uniform float uMusicBass;
uniform vec4 uMusicNotes[POND_NOTE_CAPACITY];
uniform int uMusicNoteCount;
uniform float uMusicReveal;
uniform vec2 uMusicCenter;
uniform vec2 uMusicTurn;

// Local musical field: signed normal slopes, density, nonnegative activity.
// Shared by silt displacement and reflected-ray distortion. No synthetic beat,
// accumulating fluid simulation, luminous floor, or independently moving noise.
vec4 pondMotion(vec2 p) {
  if (uMusicReveal < .0001) return vec4(0.0);
  vec2 chordDelta = p - uMusicChord.xy;
  float chordWidth = max(.3, uMusicChord.w);
  float chord = exp(-dot(chordDelta, chordDelta) / (chordWidth * chordWidth)) * uMusicChord.z;
  float bass = exp(-dot(p, p) / 3.6) * uMusicBass;
  vec2 slope = chordDelta * chord * .004 + p * bass * .005;
  float density = chord * .045 + bass * .055;
  float activity = chord + bass;
  for (int i = 0; i < POND_NOTE_CAPACITY; i++) {
    if (i >= uMusicNoteCount) break;
    vec4 note = uMusicNotes[i];
    vec2 delta = p - note.xy;
    float radius = sqrt(dot(delta, delta) + .002);
    float front = radius - note.z * 1.65;
    float distanceFromFront = front / .52;
    float packet = exp(-distanceFromFront * distanceFromFront) * note.w;
    float phase = front * 7.0;
    slope += delta / radius * cos(phase) * packet * .010;
    density += sin(phase) * packet * .065;
    activity += packet;
  }
  return vec4(slope, density, min(1.0, activity)) * uMusicReveal;
}

vec2 pondCoordinates(vec2 world) {
  vec2 d = world - uMusicCenter;
  return vec2(dot(d, vec2(uMusicTurn.x, -uMusicTurn.y)), dot(d, vec2(uMusicTurn.y, uMusicTurn.x)));
}

vec2 pondWorldSlope(vec2 slope) {
  return vec2(dot(slope, uMusicTurn), dot(slope, vec2(-uMusicTurn.y, uMusicTurn.x)));
}
