// auth.js - Lógica de autenticación con Supabase

// --- CONFIGURACIÓN ---
// Claves de tu proyecto de Supabase
const SUPABASE_URL = 'https://ohhmreoawkzfunosjuxi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oaG1yZW9hd2t6ZnVub3NqdXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTUyNTIsImV4cCI6MjA3NDU3MTI1Mn0.C8ljM0DmeMVc0fTJSj8tDWJGmTrgTuJx76iFvtWYFqU';
// -------------------

// Usamos el objeto global "supabase" que viene de la librería
// y lo asignamos a nuestra propia constante, que llamaremos "supabaseClient"
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// Elementos del DOM
const authOverlay = document.getElementById('auth');
const loginButton = document.getElementById('authOk');
const emailInput = document.getElementById('authEmail');
const passInput = document.getElementById('authPass');
const authError = document.getElementById('authErr');
const mainContent = document.querySelector('main');
const headerContent = document.querySelector('header');

// Muestra el contenido principal y oculta el login
function showContent() {
  authOverlay.style.display = 'none';
  mainContent.style.display = '';
  headerContent.style.display = '';
  initializeApp(); // <-- CAMBIO IMPORTANTE: Llama a la función que dibuja los mapas
}

// Muestra el login y oculta el contenido
function showLogin() {
  authOverlay.style.display = 'grid';
  mainContent.style.display = 'none';
  headerContent.style.display = 'none';
}

// Función para manejar el intento de login
async function handleLogin() {
  const email = emailInput.value.trim();
  const password = passInput.value.trim();
  authError.style.display = 'none'; // Ocultar error previo

  // Usamos nuestro cliente de supabase para iniciar sesión
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    console.error('Error de autenticación:', error.message);
    authError.style.display = 'block'; // Mostrar error
  } else if (data.user) {
    // ¡Éxito! El usuario ha iniciado sesión.
    console.log('Login exitoso:', data.user.email);
    showContent();
  }
}

// Comprueba si ya hay una sesión activa al cargar la página
async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    // Si hay sesión, muestra el contenido directamente
    showContent();
  } else {
    // Si no hay sesión, muestra el formulario de login
    showLogin();
  }
}

// Asignar eventos a los botones
loginButton.addEventListener('click', handleLogin);
passInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLogin();
});
emailInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLogin();
});

// Iniciar la comprobación de sesión al cargar el script
checkSession();
