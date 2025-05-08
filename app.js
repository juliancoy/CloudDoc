// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Update in your main initialization code (at the top with other renderer settings)
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
// Add these two lines to enable tone mapping
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);



// Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5).normalize();
scene.add(light);

let loadedObject;
const glbURL = 'https://s3.us-east-1.amazonaws.com/openradai.net/scene.glb';
const dbName = 'GLBCache';
const storeName = 'models';
const glbKey = 'scene.glb';

// IndexedDB setup
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName);
            }
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            resolve(db);
        };
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Save model to IndexedDB
async function saveModelToCache(arrayBuffer) {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(arrayBuffer, glbKey);
            
            transaction.oncomplete = () => {
                console.log('GLB saved to IndexedDB');
                resolve();
            };
            
            transaction.onerror = (event) => {
                console.error('Error saving to IndexedDB:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error('Database error:', error);
        throw error;
    }
}

// Load model from IndexedDB
async function loadModelFromCache() {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(glbKey);
            
            request.onsuccess = (event) => {
                if (event.target.result) {
                    console.log('GLB loaded from IndexedDB');
                    resolve(event.target.result);
                } else {
                    resolve(null); // Model not in cache
                }
            };
            
            request.onerror = (event) => {
                console.error('Error loading from IndexedDB:', event.target.error);
                reject(event.target.error);
            };
        });
    } catch (error) {
        console.error('Database error:', error);
        throw error;
    }
}

// Function to load GLB from URL
async function loadGLBFromURL(url) {
    showLoadingMessage('Downloading 3D Model...');
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Store in IndexedDB
        await saveModelToCache(arrayBuffer);
        
        // Load the model
        loadGLBFromArrayBuffer(arrayBuffer);
        return arrayBuffer;
    } catch (error) {
        console.error('Error fetching GLB:', error);
        hideLoadingMessage();
        showError('Failed to fetch model: ' + error.message);
        throw error;
    }
}

// Function to load GLB from array buffer
function loadGLBFromArrayBuffer(arrayBuffer) {
    const loader = new THREE.GLTFLoader();
    
    loader.parse(arrayBuffer, '', function(gltf) {
        if (loadedObject) {
            scene.remove(loadedObject);
        }
        loadedObject = gltf.scene;
        scene.add(gltf.scene);
        
        // Center the object
        const box = new THREE.Box3().setFromObject(loadedObject);
        const center = box.getCenter(new THREE.Vector3());
        loadedObject.position.x = -center.x;
        loadedObject.position.y = -center.y;
        loadedObject.position.z = -center.z;

        // Set initial rotation if needed
        loadedObject.rotation.x = 0;
        loadedObject.rotation.y = -70;
        loadedObject.rotation.z = 0;
        
        hideLoadingMessage();
        renderer.render(scene, camera);
    }, function(error) {
        console.error('Error parsing GLB:', error);
        hideLoadingMessage();
        showError('Error loading model: ' + error.message);
    });
}

// UI helpers for loading/error messages
function showLoadingMessage(message) {
    let loadingDiv = document.getElementById('loading-message');
    if (!loadingDiv) {
        loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-message';
        Object.assign(loadingDiv.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '1.5em',
            background: 'rgba(0, 0, 0, 0.7)',
            padding: '15px 25px',
            borderRadius: '8px',
            zIndex: '1000'
        });
        document.body.appendChild(loadingDiv);
    }
    loadingDiv.innerText = message;
    loadingDiv.style.display = 'block';
}

function hideLoadingMessage() {
    const loadingDiv = document.getElementById('loading-message');
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }
}

function showError(message) {
    let errorDiv = document.getElementById('error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        Object.assign(errorDiv.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '1.5em',
            background: 'rgba(255, 0, 0, 0.7)',
            padding: '15px 25px',
            borderRadius: '8px',
            zIndex: '1000'
        });
        document.body.appendChild(errorDiv);
    }
    errorDiv.innerText = message;
    errorDiv.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Check IndexedDB first, then fetch from URL if needed
async function loadCachedOrFetchGLB() {
    try {
        showLoadingMessage('Checking for cached model...');
        const cachedData = await loadModelFromCache();
        
        if (cachedData) {
            showLoadingMessage('Loading cached 3D model...');
            loadGLBFromArrayBuffer(cachedData);
        } else {
            console.log('No cached GLB found, fetching from URL');
            await loadGLBFromURL(glbURL);
        }
    } catch (error) {
        console.error('Error in cache/fetch flow:', error);
        // Last resort - try direct URL load without caching
        try {
            showLoadingMessage('Trying direct download...');
            const response = await fetch(glbURL);
            const arrayBuffer = await response.arrayBuffer();
            loadGLBFromArrayBuffer(arrayBuffer);
        } catch (finalError) {
            showError('All loading methods failed. Please check your connection.');
        }
    }
}

// Initial setup
camera.position.z = 300;

// Load the GLB (from cache or URL)
loadCachedOrFetchGLB();

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

if (brightnessSlider && contrastSlider && scaleXSlider) {
    brightnessSlider.addEventListener('input', updateFilters);
    contrastSlider.addEventListener('input', updateFilters);
    scaleXSlider.addEventListener('input', updateScaleX);
}

// Then replace your updateFilters function with this corrected version:
function updateFilters() {
    if (!brightnessSlider || !contrastSlider) return;
    
    // Remove these incorrect lines:
    // camera.contrast = contrastSlider.value;
    // camera.brightness = brightnessSlider.value;
    
    const brightness = parseFloat(brightnessSlider.value);
    const contrast = parseFloat(contrastSlider.value);
    
    // Apply brightness via tone mapping exposure
    renderer.toneMappingExposure = Math.pow(brightness, 4.0);
    
    // Apply contrast
    if (contrast !== 1.0) {
        renderer.gammaFactor = contrast;
        renderer.gammaOutput = true;
    } else {
        renderer.gammaOutput = false;
    }
    
    // Force a render to see changes immediately
    if (scene && camera) {
        renderer.render(scene, camera);
    }
}

function updateScaleX() {
    if (!loadedObject || !scaleXSlider) return;
    
    const scale = parseFloat(scaleXSlider.value);
    loadedObject.scale.set(scale, scale, scale); // Uniform scaling
}