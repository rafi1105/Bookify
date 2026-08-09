import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function ThreeBusViewer() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 3, 7);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00d2ff, 2.5);
    dirLight.position.set(10, 15, 10);
    scene.add(dirLight);

    const purpleLight = new THREE.PointLight(0x7000ff, 3, 15);
    purpleLight.position.set(-5, 3, -5);
    scene.add(purpleLight);

    // Bus Group
    const busGroup = new THREE.Group();

    // 1. Bus Body (Main chassis)
    const bodyGeo = new THREE.BoxGeometry(4.2, 1.6, 1.8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.2,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.1;
    busGroup.add(body);

    // 2. Bus Roof & Upper Deck Accent
    const roofGeo = new THREE.BoxGeometry(4.1, 0.4, 1.76);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x00d2ff,
      emissive: 0x005577,
      metalness: 0.9,
      roughness: 0.1,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 2.0;
    busGroup.add(roof);

    // 3. Tinted Glass Windows Band
    const windowGeo = new THREE.BoxGeometry(3.8, 0.75, 1.82);
    const windowMat = new THREE.MeshPhysicalMaterial({
      color: 0x00f0ff,
      transmission: 0.6,
      opacity: 0.8,
      transparent: true,
      roughness: 0.1,
      ior: 1.5,
    });
    const windows = new THREE.Mesh(windowGeo, windowMat);
    windows.position.y = 1.35;
    busGroup.add(windows);

    // 4. Glowing Headlights (Front is +X side)
    const headlightGeo = new THREE.BoxGeometry(0.1, 0.2, 0.35);
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const hlLeft = new THREE.Mesh(headlightGeo, headlightMat);
    hlLeft.position.set(2.11, 0.7, 0.6);
    const hlRight = hlLeft.clone();
    hlRight.position.z = -0.6;
    busGroup.add(hlLeft);
    busGroup.add(hlRight);

    // 5. Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 24);
    wheelGeo.rotateX(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

    const wheelPositions = [
      [1.3, 0.4, 0.95],
      [1.3, 0.4, -0.95],
      [-1.3, 0.4, 0.95],
      [-1.3, 0.4, -0.95],
      [-0.5, 0.4, 0.95],
      [-0.5, 0.4, -0.95],
    ];

    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(...pos);
      busGroup.add(wheel);
    });

    // 6. Glowing Under-Chassis Ring Ground Platform
    const ringGeo = new THREE.RingGeometry(2.5, 3.2, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.01;
    scene.add(ring);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(16, 20, 0x00d2ff, 0x1e293b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    scene.add(busGroup);

    // Particles Ambient Floating Network
    const particlesCount = 80;
    const particleGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 12;
      posArray[i + 1] = Math.random() * 5;
      posArray[i + 2] = (Math.random() - 0.5) * 12;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.06,
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.6,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    camera.lookAt(0, 1.1, 0);

    // Mouse interactive rotation
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
    };

    container.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth slow auto-rotation + mouse reaction
      busGroup.rotation.y = elapsedTime * 0.3 + mouseX * 0.4;
      busGroup.position.y = Math.sin(elapsedTime * 2) * 0.05;

      ring.rotation.z = -elapsedTime * 0.5;

      particleSystem.rotation.y = elapsedTime * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // Handle Resize
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="three-bus-container">
      <div className="three-bus-badge">
        <span className="three-bus-ping-dot animate-ping"></span>
        <span>Interactive 3D Fleet Visualizer</span>
      </div>
      <div ref={mountRef} className="three-bus-canvas-mount" />
      <div className="three-bus-hint">
        Drag mouse to rotate 3D view
      </div>
    </div>
  );
}
