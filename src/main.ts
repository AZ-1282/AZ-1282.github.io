interface EmulationStage {
  title: string;
  opcode: string;
  description: string;
}

const EMULATION_STAGES: Record<string, EmulationStage> = {
  fetch: {
    title: '1. Fetch Opcode from Memory',
    opcode: 'PC -> RAM[0x200]',
    description:
      'The emulator reads the next instruction byte(s) from the loaded game ROM at the current Program Counter (PC) address and advances the counter.',
  },
  decode: {
    title: '2. Decode Instruction',
    opcode: 'OP = (inst & 0xF000)',
    description:
      'Bitmasks and shift operations extract the opcode category, target CPU registers, and immediate values from the raw binary instruction.',
  },
  execute: {
    title: '3. Execute & Update State',
    opcode: 'V[x] += kk; Timer--',
    description:
      'The emulated CPU performs arithmetic, updates registers or RAM, checks controller button states, and steps hardware timers.',
  },
  render: {
    title: '4. Render Frame Buffer',
    opcode: 'VRAM -> Canvas 60Hz',
    description:
      'At vertical blanking (VBlank), the video buffer is drawn to the screen canvas so the video game runs at a steady frame rate.',
  },
};

function initMobileMenu(): void {
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const nav = document.getElementById('primary-navigation');
  if (!menuToggle || !nav) return;

  menuToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.textContent = isOpen ? 'Close' : 'Menu';
  });

  const navLinks = nav.querySelectorAll<HTMLAnchorElement>('.nav-link');
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.textContent = 'Menu';
    });
  });
}

function initEmulationCycleTabs(): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.cycle-tab');
  const titleEl = document.getElementById('cycle-stage-title');
  const codeEl = document.getElementById('cycle-stage-code');
  const textEl = document.getElementById('cycle-stage-text');

  if (!tabs.length || !titleEl || !codeEl || !textEl) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const stageKey = tab.dataset.stage;
      if (!stageKey || !EMULATION_STAGES[stageKey]) return;

      tabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const stage = EMULATION_STAGES[stageKey];
      titleEl.textContent = stage.title;
      codeEl.textContent = stage.opcode;
      textEl.textContent = stage.description;
    });
  });
}

function initAccentColorPicker(): void {
  const swatches = document.querySelectorAll<HTMLButtonElement>('.swatch-button');
  const root = document.documentElement;

  swatches.forEach((swatch) => {
    swatch.addEventListener('click', () => {
      const color = swatch.dataset.color;
      const hover = swatch.dataset.hover;
      const soft = swatch.dataset.soft;
      const gradStart = swatch.dataset.gradStart;
      const gradEnd = swatch.dataset.gradEnd;
      if (!color || !hover || !soft || !gradStart || !gradEnd) return;

      swatches.forEach((s) => s.classList.remove('active'));
      swatch.classList.add('active');

      root.style.setProperty('--accent-color', color);
      root.style.setProperty('--accent-hover', hover);
      root.style.setProperty('--accent-soft', soft);
      root.style.setProperty('--grad-start', gradStart);
      root.style.setProperty('--grad-end', gradEnd);
    });
  });
}

function initCopyEmailButton(): void {
  const copyButton = document.getElementById('copy-email-button') as HTMLButtonElement | null;
  if (!copyButton) return;

  copyButton.addEventListener('click', async () => {
    const email = copyButton.dataset.email || 'mohamed1282.azizthabet@gmail.com';
    try {
      await navigator.clipboard.writeText(email);
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = originalText || 'Copy Email';
      }, 2000);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  });
}

interface PhysBlock {
  id: string;
  kind: 'letter' | 'crate';
  label?: string;
  x: number;
  y: number;
  z: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  w: number;
  d: number;
  h: number;
}

interface ZoneBeacon {
  id: string;
  label: string;
  sectionId: string;
  x: number;
  y: number;
}

interface DustParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  alpha: number;
  radius: number;
}

function initIsometricPlaygroundDemo(): void {
  const canvas = document.getElementById('emulator-canvas') as HTMLCanvasElement | null;
  const resetBtn = document.getElementById('reset-world-btn') as HTMLButtonElement | null;
  const autopilotBtn = document.getElementById('toggle-autopilot-btn') as HTMLButtonElement | null;
  const hudStatus = document.getElementById('hud-zone-status');
  const jumpBtn = document.getElementById('jump-zone-btn') as HTMLButtonElement | null;

  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Isometric camera projection helper
  // World coordinates: x in [-220, 220], y in [-140, 140], z >= 0 (upwards)
  const originX = canvas.width * 0.5;
  const originY = canvas.height * 0.54;

  const toScreen = (wx: number, wy: number, wz = 0): { sx: number; sy: number } => {
    const sx = originX + (wx - wy) * 0.88;
    const sy = originY + (wx + wy) * 0.46 - wz;
    return { sx, sy };
  };

  const toWorld = (sx: number, sy: number): { wx: number; wy: number } => {
    const dx = (sx - originX) / 0.88;
    const dy = (sy - originY) / 0.46;
    const wx = (dx + dy) * 0.5;
    const wy = (dy - dx) * 0.5;
    return { wx, wy };
  };

  // Draw an isometric extruded 3D prism centered at (cx, cy) with base at z0 and height h
  const drawIsoPrism = (
    cx: number,
    cy: number,
    z0: number,
    w: number,
    d: number,
    h: number,
    topColor: string,
    leftColor: string,
    rightColor: string,
    castShadow = true
  ): void => {
    const hw = w * 0.5;
    const hd = d * 0.5;

    if (castShadow) {
      // Cast long sunset shadow to the top-left (-x, -y) like Bruno Simon's scene
      const sOffX = -h * 0.55;
      const sOffY = -h * 0.25;
      const s0 = toScreen(cx - hw + sOffX, cy - hd + sOffY, 0);
      const s1 = toScreen(cx + hw + sOffX, cy - hd + sOffY, 0);
      const s2 = toScreen(cx + hw, cy + hd, 0);
      const s3 = toScreen(cx - hw, cy + hd, 0);

      ctx.fillStyle = 'rgba(32, 12, 44, 0.42)';
      ctx.beginPath();
      ctx.moveTo(s0.sx, s0.sy);
      ctx.lineTo(s1.sx, s1.sy);
      ctx.lineTo(s2.sx, s2.sy);
      ctx.lineTo(s3.sx, s3.sy);
      ctx.closePath();
      ctx.fill();
    }

    // Bottom vertices at z0
    const bFront = toScreen(cx + hw, cy + hd, z0);
    const bRight = toScreen(cx + hw, cy - hd, z0);
    const bLeft = toScreen(cx - hw, cy + hd, z0);

    // Top vertices at z0 + h
    const tBack = toScreen(cx - hw, cy - hd, z0 + h);
    const tRight = toScreen(cx + hw, cy - hd, z0 + h);
    const tFront = toScreen(cx + hw, cy + hd, z0 + h);
    const tLeft = toScreen(cx - hw, cy + hd, z0 + h);

    // Left-front face (facing +y)
    ctx.fillStyle = leftColor;
    ctx.beginPath();
    ctx.moveTo(tLeft.sx, tLeft.sy);
    ctx.lineTo(tFront.sx, tFront.sy);
    ctx.lineTo(bFront.sx, bFront.sy);
    ctx.lineTo(bLeft.sx, bLeft.sy);
    ctx.closePath();
    ctx.fill();

    // Right-front face (facing +x)
    ctx.fillStyle = rightColor;
    ctx.beginPath();
    ctx.moveTo(tFront.sx, tFront.sy);
    ctx.lineTo(tRight.sx, tRight.sy);
    ctx.lineTo(bRight.sx, bRight.sy);
    ctx.lineTo(bFront.sx, bFront.sy);
    ctx.closePath();
    ctx.fill();

    // Top face
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.moveTo(tBack.sx, tBack.sy);
    ctx.lineTo(tRight.sx, tRight.sy);
    ctx.lineTo(tFront.sx, tFront.sy);
    ctx.lineTo(tLeft.sx, tLeft.sy);
    ctx.closePath();
    ctx.fill();
  };

  // Create 3D letters spelling "AZIZ THABET" along the foreground path + wooden crates
  const lettersText = ['A', 'Z', 'I', 'Z', 'T', 'H', 'A', 'B', 'E', 'T'];
  const blocks: PhysBlock[] = [];

  lettersText.forEach((char, idx) => {
    const gapOffset = idx >= 4 ? 16 : 0;
    const lx = -135 + idx * 26 + gapOffset;
    const ly = 56;
    blocks.push({
      id: `letter-${idx}`,
      kind: 'letter',
      label: char,
      x: lx,
      y: ly,
      z: 0,
      homeX: lx,
      homeY: ly,
      vx: 0,
      vy: 0,
      w: 18,
      d: 14,
      h: 28,
    });
  });

  // Add pushable wooden crates like the stacked crates on the right of the screenshot
  const cratePositions = [
    { x: 96, y: 12 },
    { x: 118, y: 18 },
    { x: 108, y: -6 },
    { x: -115, y: -15 },
  ];
  cratePositions.forEach((pos, idx) => {
    blocks.push({
      id: `crate-${idx}`,
      kind: 'crate',
      x: pos.x,
      y: pos.y,
      z: 0,
      homeX: pos.x,
      homeY: pos.y,
      vx: 0,
      vy: 0,
      w: 20,
      d: 20,
      h: 20,
    });
  });

  // Portfolio Zone Beacons (glowing purple/gold crystals)
  const beacons: ZoneBeacon[] = [
    { id: 'emulation', label: 'Console Emulation', sectionId: '#about', x: -75, y: -55 },
    { id: 'projects', label: 'Projects Showcase', sectionId: '#projects', x: 35, y: -55 },
    { id: 'skills', label: 'Technical Skills', sectionId: '#skills', x: 125, y: -45 },
    { id: 'contact', label: 'Contact & GitHub', sectionId: '#contact', x: -20, y: 10 },
  ];

  // Toy 4x4 Truck state
  const truck = {
    x: -25,
    y: -22,
    angle: 0.4,
    speed: 0,
    targetX: null as number | null,
    targetY: null as number | null,
  };

  let isAutopilot = true;
  let autopilotTime = 0;
  let activeZone: ZoneBeacon | null = null;
  const keys: Record<string, boolean> = {};
  const dust: DustParticle[] = [];

  const setAutopilot = (state: boolean): void => {
    isAutopilot = state;
    if (autopilotBtn) {
      autopilotBtn.textContent = isAutopilot ? 'Auto-Drive: ON' : 'Auto-Drive: OFF';
    }
  };

  if (autopilotBtn) {
    autopilotBtn.addEventListener('click', () => {
      setAutopilot(!isAutopilot);
      truck.targetX = null;
      truck.targetY = null;
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      blocks.forEach((b) => {
        b.x = b.homeX;
        b.y = b.homeY;
        b.vx = 0;
        b.vy = 0;
      });
    });
  }

  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      if (activeZone) {
        const el = document.querySelector(activeZone.sectionId);
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Keyboard driving controls
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      if (document.activeElement === canvas || key.startsWith('w') || key.startsWith('a') || key.startsWith('s') || key.startsWith('d')) {
        if (key.startsWith('arrow')) e.preventDefault();
        keys[key] = true;
        setAutopilot(false);
        truck.targetX = null;
        truck.targetY = null;
      }
    } else if (e.key === 'Enter' && activeZone) {
      const el = document.querySelector(activeZone.sectionId);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  // Click / Tap on ground to drive the truck to that location
  canvas.addEventListener('pointerdown', (e) => {
    canvas.focus();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const sx = (e.clientX - rect.left) * scaleX;
    const sy = (e.clientY - rect.top) * scaleY;
    const { wx, wy } = toWorld(sx, sy);

    truck.targetX = Math.max(-175, Math.min(175, wx));
    truck.targetY = Math.max(-105, Math.min(105, wy));
    setAutopilot(false);
  });

  // Draw the stylized 3D off-road 4x4 toy truck at (tx, ty) with orientation angle
  const drawToyTruck = (tx: number, ty: number, angle: number): void => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Headlight cone on the coral ground
    const frontLeft = toScreen(tx + cos * 22 - sin * 8, ty + sin * 22 + cos * 8, 1);
    const frontRight = toScreen(tx + cos * 22 + sin * 8, ty + sin * 22 - cos * 8, 1);
    const beamFarLeft = toScreen(tx + cos * 88 - sin * 34, ty + sin * 88 + cos * 34, 0);
    const beamFarRight = toScreen(tx + cos * 88 + sin * 34, ty + sin * 88 - cos * 34, 0);

    const grad = ctx.createLinearGradient(frontLeft.sx, frontLeft.sy, beamFarLeft.sx, beamFarLeft.sy);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.42)');
    grad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(frontLeft.sx, frontLeft.sy);
    ctx.lineTo(beamFarLeft.sx, beamFarLeft.sy);
    ctx.lineTo(beamFarRight.sx, beamFarRight.sy);
    ctx.lineTo(frontRight.sx, frontRight.sy);
    ctx.closePath();
    ctx.fill();

    // Wheels (4 chunky off-road tires)
    const wheelOffsets = [
      { ox: -11, oy: -10 },
      { ox: 11, oy: -10 },
      { ox: -11, oy: 10 },
      { ox: 11, oy: 10 },
    ];
    wheelOffsets.forEach((wo) => {
      const wx = tx + wo.ox * cos - wo.oy * sin;
      const wy = ty + wo.ox * sin + wo.oy * cos;
      drawIsoPrism(wx, wy, 0, 8, 8, 7, '#2d232e', '#1a1423', '#120d18', false);
    });

    // Truck lower chassis (crimson/red off-road body)
    drawIsoPrism(tx, ty, 5, 28, 20, 11, '#f43f5e', '#e11d48', '#9f1239', true);

    // Truck cabin + dark roof rack
    drawIsoPrism(tx - cos * 2, ty - sin * 2, 16, 17, 16, 9, '#2e1f38', '#4c1d95', '#1e1b4b', false);

    // Roof light bar (glowing coral/red)
    const roofPos = toScreen(tx + cos * 4, ty + sin * 4, 26);
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.arc(roofPos.sx, roofPos.sy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Glowing yellow front grille / headlights
    const hlPos = toScreen(tx + cos * 14, ty + sin * 14, 10);
    ctx.fillStyle = '#fde047';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(hlPos.sx, hlPos.sy, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  // Draw a glowing street lantern post like in Bruno Simon's scene
  const drawLantern = (lx: number, ly: number, pulse: number): void => {
    const groundPos = toScreen(lx, ly, 0);
    const glowGrad = ctx.createRadialGradient(
      groundPos.sx,
      groundPos.sy,
      2,
      groundPos.sx,
      groundPos.sy,
      46
    );
    glowGrad.addColorStop(0, `rgba(255, 183, 3, ${0.42 + pulse * 0.08})`);
    glowGrad.addColorStop(1, 'rgba(255, 183, 3, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.ellipse(groundPos.sx, groundPos.sy, 46, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone base & dark post
    drawIsoPrism(lx, ly, 0, 10, 10, 8, '#6d597a', '#4a3b5c', '#352844', true);
    drawIsoPrism(lx, ly, 8, 4, 4, 24, '#4a3b5c', '#352844', '#23192e', false);
    // Glowing lantern head
    drawIsoPrism(lx, ly, 32, 11, 11, 10, '#ffb703', '#ffd166', '#fb8500', false);
    drawIsoPrism(lx, ly, 42, 13, 13, 3, '#4a3b5c', '#352844', '#23192e', false);
  };

  // Draw stylized low-poly bush/tree cluster
  const drawFoliageCluster = (fx: number, fy: number): void => {
    drawIsoPrism(fx, fy, 0, 26, 24, 10, '#6b4d3e', '#4e352f', '#362224', true);
    drawIsoPrism(fx - 4, fy + 3, 10, 18, 18, 9, '#8c6548', '#6b4d3e', '#4e352f', false);
  };

  let frameCount = 0;

  const tick = (): void => {
    frameCount++;
    const pulse = Math.sin(frameCount * 0.06);

    // 1. Update truck movement
    if (isAutopilot) {
      autopilotTime += 0.015;
      // Figure-8 scenic path around the playground
      const goalX = Math.sin(autopilotTime) * 115;
      const goalY = Math.sin(autopilotTime * 2) * 52 - 12;
      const dx = goalX - truck.x;
      const dy = goalY - truck.y;
      truck.angle = Math.atan2(dy, dx);
      truck.speed = 1.95;
      truck.x += Math.cos(truck.angle) * truck.speed;
      truck.y += Math.sin(truck.angle) * truck.speed;
    } else if (truck.targetX !== null && truck.targetY !== null) {
      const dx = truck.targetX - truck.x;
      const dy = truck.targetY - truck.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        truck.angle = Math.atan2(dy, dx);
        truck.speed = Math.min(2.8, dist * 0.12 + 0.9);
        truck.x += Math.cos(truck.angle) * truck.speed;
        truck.y += Math.sin(truck.angle) * truck.speed;
      } else {
        truck.speed = 0;
        truck.targetX = null;
        truck.targetY = null;
      }
    } else {
      const up = keys['w'] || keys['arrowup'];
      const down = keys['s'] || keys['arrowdown'];
      const left = keys['a'] || keys['arrowleft'];
      const right = keys['d'] || keys['arrowright'];

      if (left) truck.angle -= 0.065;
      if (right) truck.angle += 0.065;

      if (up) {
        truck.speed = Math.min(3.1, truck.speed + 0.22);
      } else if (down) {
        truck.speed = Math.max(-1.8, truck.speed - 0.2);
      } else {
        truck.speed *= 0.88;
      }

      truck.x += Math.cos(truck.angle) * truck.speed;
      truck.y += Math.sin(truck.angle) * truck.speed;
    }

    // Clamp truck inside world bounds
    truck.x = Math.max(-185, Math.min(185, truck.x));
    truck.y = Math.max(-110, Math.min(110, truck.y));

    // Spawn exhaust/dust particle when moving
    if (Math.abs(truck.speed) > 0.6 && frameCount % 4 === 0) {
      dust.push({
        x: truck.x - Math.cos(truck.angle) * 16,
        y: truck.y - Math.sin(truck.angle) * 16,
        z: 3,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: 0.35,
        alpha: 0.65,
        radius: 3.5,
      });
    }

    // 2. Collision & Physics between truck and 3D Letters / Crates
    blocks.forEach((b) => {
      const dx = b.x - truck.x;
      const dy = b.y - truck.y;
      const dist = Math.hypot(dx, dy);
      const minDist = 23;
      if (dist < minDist && dist > 0.001) {
        const nx = dx / dist;
        const ny = dy / dist;
        const pushStrength = Math.max(1.8, Math.abs(truck.speed) * 1.35);
        b.vx += nx * pushStrength;
        b.vy += ny * pushStrength;
      }

      b.x += b.vx;
      b.y += b.vy;
      b.vx *= 0.84;
      b.vy *= 0.84;

      // Keep blocks in playground bounds
      b.x = Math.max(-190, Math.min(190, b.x));
      b.y = Math.max(-115, Math.min(115, b.y));
    });

    // 3. Check proximity to Portfolio Zone Beacons
    let foundZone: ZoneBeacon | null = null;
    for (const beacon of beacons) {
      if (Math.hypot(truck.x - beacon.x, truck.y - beacon.y) < 34) {
        foundZone = beacon;
        break;
      }
    }

    if (foundZone !== activeZone) {
      activeZone = foundZone;
      if (hudStatus && jumpBtn) {
        if (activeZone) {
          hudStatus.textContent = `Zone Reached: ${activeZone.label} — Press Enter or click Open Section`;
          jumpBtn.hidden = false;
          jumpBtn.textContent = `Open ${activeZone.label}`;
        } else {
          hudStatus.textContent =
            'Click anywhere on the ground or press WASD / Arrows to drive the 4x4 truck';
          jumpBtn.hidden = true;
        }
      }
    }

    // 4. Render Isometric Coral-Sunset Scene
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#c84b51');
    bgGrad.addColorStop(0.5, '#ea6249');
    bgGrad.addColorStop(1, '#cf5248');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw isometric ground grid tiles
    ctx.strokeStyle = 'rgba(130, 32, 42, 0.16)';
    ctx.lineWidth = 1;
    for (let gx = -200; gx <= 200; gx += 40) {
      const p1 = toScreen(gx, -130, 0);
      const p2 = toScreen(gx, 130, 0);
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();
    }
    for (let gy = -120; gy <= 120; gy += 40) {
      const p1 = toScreen(-200, gy, 0);
      const p2 = toScreen(200, gy, 0);
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();
    }

    // Draw click destination marker if active
    if (truck.targetX !== null && truck.targetY !== null) {
      const tPos = toScreen(truck.targetX, truck.targetY, 1);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(tPos.sx, tPos.sy, 12 + pulse * 2, 6 + pulse, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw Zone Pads & Glowing Purple/Gold Beacons
    beacons.forEach((b) => {
      const padPos = toScreen(b.x, b.y, 0);
      const isHovered = activeZone?.id === b.id;

      // Zone pad glow
      ctx.fillStyle = isHovered ? 'rgba(253, 224, 71, 0.35)' : 'rgba(168, 85, 247, 0.25)';
      ctx.beginPath();
      ctx.ellipse(padPos.sx, padPos.sy, 24, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Floating purple/gold crystal spire (like the two glowing purple crystals in the image)
      const floatZ = 14 + Math.sin(frameCount * 0.08 + b.x) * 4;
      const cTop = toScreen(b.x, b.y, floatZ + 18);
      const cMid = toScreen(b.x, b.y, floatZ);
      const cBot = toScreen(b.x, b.y, floatZ - 10);

      ctx.fillStyle = isHovered ? '#fde047' : '#d946ef';
      ctx.beginPath();
      ctx.moveTo(cTop.sx, cTop.sy);
      ctx.lineTo(cMid.sx + 6, cMid.sy);
      ctx.lineTo(cBot.sx, cBot.sy);
      ctx.lineTo(cMid.sx - 6, cMid.sy);
      ctx.closePath();
      ctx.fill();

      // Zone label
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, padPos.sx, padPos.sy + 20);
    });

    // Collect depth-sorted 3D drawables (by wx + wy)
    interface DrawItem {
      depth: number;
      render: () => void;
    }
    const drawList: DrawItem[] = [];

    // Static foliage & lanterns
    const foliages = [
      { x: -155, y: -65 },
      { x: -155, y: 25 },
      { x: 155, y: -70 },
      { x: 145, y: 55 },
    ];
    foliages.forEach((f) => {
      drawList.push({
        depth: f.x + f.y,
        render: () => drawFoliageCluster(f.x, f.y),
      });
    });

    const lanterns = [
      { x: -55, y: -18 },
      { x: 140, y: -10 },
    ];
    lanterns.forEach((l) => {
      drawList.push({
        depth: l.x + l.y,
        render: () => drawLantern(l.x, l.y, pulse),
      });
    });

    // Dynamic 3D Letters ("AZIZ THABET") and Wooden Crates
    blocks.forEach((b) => {
      drawList.push({
        depth: b.x + b.y,
        render: () => {
          if (b.kind === 'letter') {
            drawIsoPrism(b.x, b.y, b.z, b.w, b.d, b.h, '#f5d0fe', '#e879f9', '#a855f7', true);
            const topCenter = toScreen(b.x, b.y, b.z + b.h + 2);
            ctx.fillStyle = '#ffffff';
            ctx.font = '800 11px "Plus Jakarta Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(b.label || '', topCenter.sx, topCenter.sy);
          } else {
            drawIsoPrism(b.x, b.y, b.z, b.w, b.d, b.h, '#fb7185', '#e11d48', '#881337', true);
          }
        },
      });
    });

    // Toy 4x4 Truck
    drawList.push({
      depth: truck.x + truck.y,
      render: () => drawToyTruck(truck.x, truck.y, truck.angle),
    });

    // Sort back-to-front and render
    drawList.sort((a, b) => a.depth - b.depth);
    drawList.forEach((item) => item.render());

    // Render exhaust dust puffs
    for (let i = dust.length - 1; i >= 0; i--) {
      const p = dust[i];
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      p.alpha -= 0.022;
      p.radius += 0.12;
      if (p.alpha <= 0) {
        dust.splice(i, 1);
        continue;
      }
      const sp = toScreen(p.x, p.y, p.z);
      ctx.fillStyle = `rgba(255, 228, 214, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(sp.sx, sp.sy, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

function initScrollSpy(): void {
  const sections = document.querySelectorAll<HTMLElement>('section[id]');
  const navLinks = document.querySelectorAll<HTMLAnchorElement>('.site-nav .nav-link');

  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const activeId = entry.target.getAttribute('id');
          navLinks.forEach((link) => {
            const isMatch = link.getAttribute('href') === `#${activeId}`;
            link.classList.toggle('active', isMatch);
          });
        }
      });
    },
    { rootMargin: '-25% 0px -60% 0px' }
  );

  sections.forEach((section) => observer.observe(section));
}

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initEmulationCycleTabs();
  initAccentColorPicker();
  initCopyEmailButton();
  initIsometricPlaygroundDemo();
  initScrollSpy();
});
