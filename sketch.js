/*
 Pelota que rebota
 - Se mueve sola: a veces rebota mucho, a veces poco.
 - Rebota en los cuatro bordes de la pantalla.
 - Emite un sonido en cada rebote (p5.sound).
 - Se detiene mientras el cursor está encima.
 - Cambia de color en cada rebote.
*/

/*
 Polyfill de AudioParam.cancelAndHoldAtTime: Firefox no lo implementa y
 p5.sound@0.4.1 (basado en Tone.js) lo usa al cambiar la frecuencia y al
 disparar la envolvente. Debe definirse antes de crear nodos de audio.
*/
if (
  typeof AudioParam !== 'undefined' &&
  typeof AudioParam.prototype.cancelAndHoldAtTime !== 'function'
) {
  AudioParam.prototype.cancelAndHoldAtTime = function (cancelTime) {
    const heldValue = this.value;
    this.cancelScheduledValues(cancelTime);
    this.setValueAtTime(heldValue, cancelTime);
    return this;
  };
}

let posX, posY;
let velX, velY;
let diametro = 50;
const GRAVEDAD = 0.5;
let tono = 0; // color actual de la pelota (modo HSB)
let saturacion = 45; // saturación baja = tonos pastel

// Sonido (se crea tras el primer gesto del usuario)
let osc, env;
let audioLista = false;

// Sistema de partículas
let particulas = [];
const VIDA_PARTICULA = 10000; // visible 10 segundos
const DESVANECIDO = 2000; // luego se desvanece durante 2 segundos
const MAX_PARTICULAS = 600;
const EMISION_POR_SEG = 30; // emisión continua desde el mouse
let acumuladorEmision = 0;
let mouseActivo = false; // emite solo cuando el mouse ya estuvo sobre el canvas

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100); // debe ir después de createCanvas (lo reinicia)

  posX = width / 2;
  posY = height / 2;
  velX = random(4, 8) * random([-1, 1]);
  velY = 0;
  tono = random(360);
  saturacion = random(35, 55); // pastel
}

function draw() {
  background(45, 20, 94); // beige

  // Emisión continua desde el mouse (una "fuente") mientras el efecto esté activo.
  if (mouseActivo) {
    acumuladorEmision = Math.min(acumuladorEmision + deltaTime, 1000);
    const intervalo = 1000 / EMISION_POR_SEG;
    while (acumuladorEmision >= intervalo && particulas.length < MAX_PARTICULAS) {
      emitirParticulas(mouseX, mouseY, 1);
      acumuladorEmision -= intervalo;
    }
  }

  // Bajo el cursor la pelota se queda quieta.
  if (!cursorSobrePelota()) {
    moverPelota();
  }

  fill(tono, saturacion, 100);
  noStroke();
  circle(posX, posY, diametro);

  // Partículas: se actualizan y se dibujan; se descartan al cumplir 10 s.
  particulas = particulas.filter((p) => p.viva);
  for (const p of particulas) {
    p.actualizar();
    p.dibujar();
  }

  // Los navegadores necesitan un clic para habilitar el audio.
  if (!audioLista) {
    fill(40, 30, 40); // marrón oscuro, legible sobre beige
    textAlign(CENTER, CENTER);
    text('Haz clic para activar el sonido', width / 2, 64);
  }
}

function moverPelota() {
  const radio = diametro / 2;
  // Velocidad mínima para llegar desde el suelo hasta el borde superior.
  const alcance = Math.sqrt(2 * GRAVEDAD * (height - diametro));
  const topeY = alcance * 1.6;

  velY += GRAVEDAD;
  posX += velX;
  posY += velY;

  // Limita la velocidad para que no se descontrole.
  velX = constrain(velX, -18, 18);
  velY = constrain(velY, -topeY, topeY);

  // Borde izquierdo
  if (posX < radio) {
    posX = radio;
    velX = Math.max(Math.abs(velX) * factorRebote(), random(5, 9));
    alRebotar();
  }

  // Borde derecho
  if (posX > width - radio) {
    posX = width - radio;
    velX = -Math.max(Math.abs(velX) * factorRebote(), random(5, 9));
    alRebotar();
  }

  // Borde inferior: sale disparada hacia arriba (llega al borde superior)
  if (posY > height - radio) {
    posY = height - radio;
    velY = -Math.max(Math.abs(velY) * factorRebote(), impulsoFuerte());
    velX += random(-2.5, 2.5); // cambia de rumbo
    alRebotar();
  }

  // Borde superior
  if (posY < radio) {
    posY = radio;
    velY = Math.max(Math.abs(velY) * factorRebote(), random(2, 6));
    velX += random(-2, 2);
    alRebotar();
  }
}

// Impulso hacia arriba suficiente para alcanzar el borde superior.
function impulsoFuerte() {
  const alcance = Math.sqrt(2 * GRAVEDAD * (height - diametro));
  return random(alcance * 0.95, alcance * 1.2);
}

// Cada rebote cambia el color y suena.
function alRebotar() {
  cambiarColor();
  sonar();
}

function cambiarColor() {
  tono = (tono + random(50, 130)) % 360;
  saturacion = random(35, 55); // mantiene el tono pastel
}

// Rebote con energía (a veces algo más, a veces algo menos).
function factorRebote() {
  return random(0.85, 1.05);
}

// ¿El cursor está encima de la pelota?
function cursorSobrePelota() {
  return dist(mouseX, mouseY, posX, posY) <= diametro / 2;
}

// Sonido corto al rebotar; más agudo cuando el golpe es más fuerte.
function sonar() {
  if (!audioLista) return; // sin gesto del usuario todavía no hay audio
  const velocidad = Math.max(Math.abs(velY), Math.abs(velX));
  osc.freq(map(velocidad, 0, 20, 180, 720, true));
  env.play();
}

// Habilita el audio tras la primera interacción y crea el oscilador.
function mousePressed() {
  mouseActivo = true; // un clic también activa la emisión
  if (audioLista) return;
  userStartAudio();
  osc = new p5.Oscillator('sine');
  osc.disconnect();
  env = new p5.Envelope();
  env.setADSR(0.005, 0.03, 0.09, 0.15);
  osc.connect(env);
  osc.start();
  audioLista = true;
}

// --- Sistema de partículas ---

// Crea n partículas alrededor del punto (x, y).
function emitirParticulas(x, y, n) {
  for (let i = 0; i < n; i++) {
    if (particulas.length >= MAX_PARTICULAS) return;
    particulas.push(new Particula(x + random(-8, 8), y + random(-8, 8)));
  }
}

function mouseMoved() {
  mouseActivo = true; // activa la fuente continua
}

function mouseDragged() {
  mouseActivo = true;
  emitirParticulas(mouseX, mouseY, 4); // ráfaga extra al arrastrar
}

class Particula {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-2.2, 2.2);
    this.vy = random(-2.8, 0.3); // deriva suave, sin caer
    this.tam = random(7, 14); // más pequeñas
    this.forma = random(['fantasma', 'corazon', 'estrella', 'flor', 'brillo']);
    this.tono = random(360);
    this.sat = random(35, 55); // pastel
    this.giro = random(TWO_PI);
    this.velGiro = random(-0.04, 0.04);
    this.nacimiento = millis();
    this.vida = VIDA_PARTICULA;
    this.alfa = 255;
  }

  get edad() {
    return millis() - this.nacimiento;
  }

  get viva() {
    return this.edad < this.vida + DESVANECIDO;
  }

  actualizar() {
    // Deriva suave, sin gravedad: no caen ni se acumulan abajo.
    this.x += this.vx;
    this.y += this.vy;
    this.giro += this.velGiro;

    const r = this.tam / 2;
    // Se mantienen dentro del canvas rebotando suavemente, sin perder energía.
    if (this.x < r) { this.x = r; this.vx = Math.abs(this.vx); }
    if (this.x > width - r) { this.x = width - r; this.vx = -Math.abs(this.vx); }
    if (this.y < r) { this.y = r; this.vy = Math.abs(this.vy); }
    if (this.y > height - r) { this.y = height - r; this.vy = -Math.abs(this.vy); }

    // Visible durante 10 s; después se desvanece.
    this.alfa = this.edad <= this.vida
      ? 255
      : map(this.edad, this.vida, this.vida + DESVANECIDO, 255, 0, true);
  }

  dibujar() {
    push();
    translate(this.x, this.y);
    rotate(this.giro);
    noStroke();
    fill(this.tono, this.sat, 100, this.alfa);
    if (this.forma === 'fantasma') this.fantasma();
    else if (this.forma === 'corazon') this.corazon();
    else if (this.forma === 'estrella') this.estrella();
    else if (this.forma === 'flor') this.flor();
    else this.brillo();
    pop();
  }

  fantasma() {
    const s = this.tam;
    const r = s / 2;
    arc(0, -r * 0.1, s, s * 1.15, PI, TWO_PI, OPEN); // cabeza
    rect(-r, -r * 0.1, s, s * 0.7); // cuerpo
    for (let i = 0; i < 3; i++) {
      ellipse(-r + (i + 0.5) * (s / 3), r * 0.6, s / 3, s * 0.28); // ondas
    }
    fill(0, 0, 25, this.alfa); // ojos
    ellipse(-r * 0.35, -r * 0.15, s * 0.16);
    ellipse(r * 0.35, -r * 0.15, s * 0.16);
  }

  corazon() {
    const s = this.tam;
    const r = s / 2;
    fill(this.tono, this.sat, 100, this.alfa);
    circle(-r * 0.5, -r * 0.35, s * 0.9);
    circle(r * 0.5, -r * 0.35, s * 0.9);
    triangle(-r, -r * 0.05, r, -r * 0.05, 0, r * 1.05);
  }

  estrella() {
    poligonoEstrella(5, this.tam * 0.22, this.tam * 0.5);
  }

  flor() {
    const s = this.tam;
    const r = s / 2;
    for (let i = 0; i < 6; i++) {
      const a = (TWO_PI / 6) * i;
      ellipse(cos(a) * r * 0.5, sin(a) * r * 0.5, s * 0.5);
    }
    fill(0, 0, 100, this.alfa); // centro
    circle(0, 0, s * 0.35);
  }

  brillo() {
    const s = this.tam;
    const r = s / 2;
    poligonoEstrella(4, s * 0.08, r); // destello de 4 puntas
    stroke(this.tono, this.sat, 100, this.alfa);
    strokeWeight(2);
    line(-r, 0, r, 0);
    line(0, -r, 0, r);
    noStroke();
  }
}

// Dibuja una estrella de `puntas` puntas (p5 2.x no trae star()).
function poligonoEstrella(puntas, radioInt, radioExt) {
  const paso = TWO_PI / (puntas * 2);
  beginShape();
  for (let i = 0; i < puntas * 2; i++) {
    const r = i % 2 === 0 ? radioExt : radioInt;
    const a = -HALF_PI + i * paso;
    vertex(cos(a) * r, sin(a) * r);
  }
  endShape(CLOSE);
}
