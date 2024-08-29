// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5).normalize();
scene.add(light);

let loadedObject;

function loadGLB(data) {
    const loader = new THREE.GLTFLoader();
    loader.load(data, function (gltf) {
        if (loadedObject) {
            scene.remove(loadedObject);
        }
        loadedObject = gltf.scene;
        scene.add(gltf.scene);
        renderer.render(scene, camera);
    }, undefined, function (error) {
        console.error(error);
    });
}

camera.position.z = 5;

// Load "scene.glb" automatically
loadGLB('./scene.glb');

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Brightness and Contrast
const brightnessSlider = document.getElementById('brightness');
const contrastSlider = document.getElementById('contrast');
const scaleXSlider = document.getElementById('scaleX');

brightnessSlider.addEventListener('input', updateFilters);
contrastSlider.addEventListener('input', updateFilters);
scaleXSlider.addEventListener('input', updateScaleX);

function updateFilters() {
    const brightness = brightnessSlider.value;
    const contrast = contrastSlider.value;
    renderer.toneMappingExposure = Math.pow(brightness, 4.0); // Brightness
    renderer.gammaFactor = contrast; // Contrast
}

function updateScaleX() {
    if (loadedObject) {
        loadedObject.scale.z = scaleXSlider.value;
    }
}
